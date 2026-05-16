"""
PostgreSQL query optimization: bulk writes, queryset caching, index helpers.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import date
from typing import Any, Callable, Iterable, Sequence

from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

logger = logging.getLogger('erp.db.optimization')

# Guidelines for engineers (also surfaced in Django admin / docs)
QUERY_OPTIMIZATION_GUIDELINES = """
select_related: Use for ForeignKey / OneToOne (student, current_class, recipient).
prefetch_related: Use for reverse FK / M2M (attendance_records, sections, installments).
only() / defer(): Narrow columns on large list endpoints.
bulk_create / bulk_update: Attendance marking, imports (batch_size=500).
cached_queryset: Wrap repeated read-only aggregates (dashboard TTL from CACHE_TIMEOUTS).
Avoid N+1: Always chain select_related before iterating students with class names.
"""

# Recommended composite indexes (applied via migration / apply_db_indexes command)
RECOMMENDED_INDEXES: dict[str, list[tuple[str, ...]]] = {
    'education_attendance_attendancerecord': [
        ('student_id',),
        ('date',),
        ('created_at',),
        ('tenant_id', 'date'),
        ('student_id', 'date'),
    ],
    'education_finance_invoice': [
        ('student_id',),
        ('due_date',),
        ('created_at',),
        ('issue_date',),
        ('status', 'due_date'),
    ],
    'core_user_notifications_notification': [
        ('recipient_id',),
        ('created_at',),
        ('recipient_id', 'created_at'),
        ('recipient_id', 'is_read', 'created_at'),
    ],
    'core_audit_auditlog': [
        ('timestamp',),
        ('user_id', 'timestamp'),
        ('resource_type', 'timestamp'),
    ],
    'education_students_student': [
        ('current_class_id',),
        ('created_at',),
        ('student_id',),
    ],
}


def is_postgresql() -> bool:
    return connection.vendor == 'postgresql'


def _normalize_attendance_record(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize API payload (string dates, class_id) for DB upsert."""
    student_id = raw.get('student_id')
    if not student_id:
        return None

    date_val = raw.get('date')
    if isinstance(date_val, date):
        record_date = date_val
    elif isinstance(date_val, str):
        record_date = parse_date(date_val) or timezone.localdate()
    else:
        record_date = timezone.localdate()

    course_id = raw.get('course_id') or raw.get('class_id') or ''
    return {
        'student_id': student_id,
        'date': record_date,
        'status': raw.get('status', 'present'),
        'remarks': raw.get('remarks', ''),
        'tenant_id': raw.get('tenant') or raw.get('tenant_id'),
        'course_id': str(course_id) if course_id else '',
    }


def bulk_upsert_attendance(
    records: Sequence[dict[str, Any]],
    *,
    batch_size: int = 500,
) -> dict[str, int]:
    """
    Bulk insert or update attendance rows.

    Each record dict: student_id (UUID), date (date), status, optional remarks, tenant (School pk), course_id.
    """
    normalized = [
        row for row in (_normalize_attendance_record(r) for r in records) if row is not None
    ]
    if not normalized:
        return {'created': 0, 'updated': 0}

    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    created = 0
    updated = 0

    with transaction.atomic():
        for i in range(0, len(normalized), batch_size):
            chunk = normalized[i : i + batch_size]
            keys = {(str(r['student_id']), r['date']) for r in chunk}
            existing = {
                (str(row['student_id']), row['date']): row
                for row in AttendanceRecord.all_objects.filter(
                    student_id__in=[k[0] for k in keys],
                    date__in=[k[1] for k in keys],
                ).values('id', 'student_id', 'date', 'status', 'remarks', 'tenant_id', 'course_id')
            }

            to_create = []
            to_update = []

            for row in chunk:
                key = (str(row['student_id']), row['date'])
                if key in existing:
                    current = existing[key]
                    new_status = row.get('status', current['status'])
                    new_remarks = row.get('remarks', current.get('remarks') or '')
                    new_course_id = row.get('course_id', current.get('course_id') or '')
                    if (
                        current['status'] != new_status
                        or (current.get('remarks') or '') != new_remarks
                        or (current.get('course_id') or '') != new_course_id
                    ):
                        to_update.append(
                            AttendanceRecord(
                                id=current['id'],
                                student_id=row['student_id'],
                                date=row['date'],
                                status=new_status,
                                remarks=new_remarks,
                                tenant_id=row.get('tenant_id') or current.get('tenant_id'),
                                course_id=new_course_id,
                            )
                        )
                else:
                    to_create.append(
                        AttendanceRecord(
                            student_id=row['student_id'],
                            date=row['date'],
                            status=row.get('status', 'present'),
                            remarks=row.get('remarks', ''),
                            tenant_id=row.get('tenant_id'),
                            course_id=row.get('course_id', ''),
                        )
                    )

            if to_create:
                AttendanceRecord.all_objects.bulk_create(to_create, batch_size=batch_size)
                created += len(to_create)

            if to_update:
                AttendanceRecord.all_objects.bulk_update(
                    to_update,
                    ['status', 'remarks', 'tenant_id', 'course_id'],
                    batch_size=batch_size,
                )
                updated += len(to_update)

    logger.info('bulk_upsert_attendance created=%s updated=%s', created, updated)
    return {'created': created, 'updated': updated}


def cached_queryset(
    cache_key: str,
    loader: Callable[[], Any],
    *,
    timeout: int | None = None,
) -> Any:
    """Cache a queryset result or any serializable loader output."""
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    result = loader()
    ttl = timeout or getattr(settings, 'CACHE_TIMEOUTS', {}).get('analytics', 900)
    cache.set(cache_key, result, ttl)
    return result


def make_cache_key(prefix: str, params: dict[str, Any]) -> str:
    payload = json.dumps(params, sort_keys=True, default=str)
    digest = hashlib.md5(payload.encode()).hexdigest()[:12]
    return f'db:{prefix}:{digest}'


def apply_recommended_indexes(*, concurrent: bool = True) -> list[str]:
    """
    Create missing indexes on PostgreSQL (no-op on SQLite).
    Returns list of SQL statements executed.
    """
    if not is_postgresql():
        logger.warning('apply_recommended_indexes skipped: not PostgreSQL')
        return []

    executed: list[str] = []
    with connection.cursor() as cursor:
        for table, column_groups in RECOMMENDED_INDEXES.items():
            for columns in column_groups:
                idx_name = f'idx_{table}_{"_".join(columns)}'[:63]
                cols = ', '.join(columns)
                sql = (
                    f'CREATE INDEX {"CONCURRENTLY" if concurrent else ""} '
                    f'IF NOT EXISTS {idx_name} ON {table} ({cols})'
                )
                sql = sql.replace('  ', ' ').strip()
                try:
                    if concurrent:
                        connection.set_autocommit(True)
                    cursor.execute(sql)
                    executed.append(sql)
                except Exception as exc:
                    logger.warning('Index creation skipped for %s: %s', idx_name, exc)
                finally:
                    if concurrent:
                        connection.set_autocommit(False)
    return executed


def log_query_plan(sql: str, params: list[Any] | None = None) -> list[tuple]:
    """EXPLAIN a query (PostgreSQL only)."""
    if not is_postgresql():
        return []
    with connection.cursor() as cursor:
        cursor.execute(f'EXPLAIN {sql}', params or [])
        return cursor.fetchall()
