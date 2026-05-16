"""
PostgreSQL native table partitioning helpers (monthly / yearly).

Partitioning is applied via management command on PostgreSQL only.
SQLite dev environments skip partition DDL safely.
"""

from __future__ import annotations

import logging
from calendar import monthrange
from datetime import date, datetime

from django.db import connection

logger = logging.getLogger('erp.db.partitioning')

PARTITION_CONFIG = {
    'education_attendance_attendancerecord': {
        'column': 'date',
        'granularity': 'month',
        'parent': 'education_attendance_attendancerecord',
    },
    'core_user_notifications_notification': {
        'column': 'created_at',
        'granularity': 'month',
        'parent': 'core_user_notifications_notification',
    },
    'core_audit_auditlog': {
        'column': 'timestamp',
        'granularity': 'month',
        'parent': 'core_audit_auditlog',
    },
    'education_finance_invoice': {
        'column': 'issue_date',
        'granularity': 'year',
        'parent': 'education_finance_invoice',
    },
}


def is_postgresql() -> bool:
    return connection.vendor == 'postgresql'


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


def _month_bounds(d: date) -> tuple[date, date]:
    start = d.replace(day=1)
    end = _add_months(start, 1)
    return start, end


def _year_bounds(d: date) -> tuple[date, date]:
    start = date(d.year, 1, 1)
    end = date(d.year + 1, 1, 1)
    return start, end


def partition_name(parent: str, period_start: date, granularity: str) -> str:
    if granularity == 'year':
        return f'{parent}_y{period_start.year}'
    return f'{parent}_y{period_start.year}_m{period_start.month:02d}'


def ensure_range_partition(
    parent_table: str,
    *,
    column: str,
    period_start: date,
    granularity: str = 'month',
) -> str | None:
    """Create a RANGE partition for the given period if missing."""
    if not is_postgresql():
        return None

    if granularity == 'year':
        start, end = _year_bounds(period_start)
    else:
        start, end = _month_bounds(period_start)

    child = partition_name(parent_table, start, granularity)
    sql = (
        f'CREATE TABLE IF NOT EXISTS {child} '
        f'PARTITION OF {parent_table} '
        f'FOR VALUES FROM (%s) TO (%s)'
    )

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM pg_class WHERE relname = %s",
            [child],
        )
        if cursor.fetchone():
            return child
        try:
            cursor.execute(sql, [start.isoformat(), end.isoformat()])
            logger.info('Created partition %s', child)
            return child
        except Exception as exc:
            # Parent may not yet be partitioned — logged for operators
            logger.warning('Partition %s not created: %s', child, exc)
            return None


def convert_to_partitioned_table(parent_table: str, column: str, granularity: str) -> list[str]:
    """
    Convert an existing heap table to partitioned (requires maintenance window).

    Steps: rename table → create partitioned parent → reattach / copy data.
    Returns SQL statements for DBA review (not auto-executed in production).
    """
    if not is_postgresql():
        return []

    staging = f'{parent_table}_partitioned'
    if granularity == 'year':
        partition_expr = f'RANGE ({column})'
    else:
        partition_expr = f'RANGE ({column})'

    return [
        f'-- 1. Rename existing table',
        f'ALTER TABLE {parent_table} RENAME TO {parent_table}_legacy;',
        f'-- 2. Create partitioned parent',
        f'CREATE TABLE {parent_table} (LIKE {parent_table}_legacy INCLUDING ALL) PARTITION BY {partition_expr};',
        f'-- 3. Create partitions via ensure_range_partition()',
        f'-- 4. INSERT INTO {parent_table} SELECT * FROM {parent_table}_legacy;',
        f'-- 5. DROP TABLE {parent_table}_legacy;',
        f'-- Staging name reference: {staging}',
    ]


def ensure_partitions_ahead(
    *,
    months_ahead: int = 3,
    years_ahead: int = 2,
    reference: date | None = None,
) -> list[str]:
    """Ensure upcoming monthly/yearly partitions exist."""
    if not is_postgresql():
        logger.info('Partition setup skipped (non-PostgreSQL backend)')
        return []

    ref = reference or date.today()
    created: list[str] = []

    for table, cfg in PARTITION_CONFIG.items():
        granularity = cfg['granularity']
        column = cfg['column']
        parent = cfg['parent']

        if granularity == 'year':
            for i in range(years_ahead + 1):
                period = date(ref.year + i, 1, 1)
                name = ensure_range_partition(
                    parent, column=column, period_start=period, granularity='year'
                )
                if name:
                    created.append(name)
        else:
            for i in range(months_ahead + 1):
                period = _add_months(ref.replace(day=1), i)
                name = ensure_range_partition(
                    parent, column=column, period_start=period, granularity='month'
                )
                if name:
                    created.append(name)

    return created
