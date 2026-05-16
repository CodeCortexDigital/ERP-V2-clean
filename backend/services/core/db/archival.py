"""
Move aged rows from hot tables into archive tables (batch-safe).
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .archive_models import (
    AttendanceRecordArchive,
    AuditLogArchive,
    InvoiceArchive,
    NotificationArchive,
)

logger = logging.getLogger('erp.db.archival')

BATCH_SIZE = getattr(settings, 'DB_ARCHIVE_BATCH_SIZE', 1000)


def _batch_ids(qs, batch_size: int):
    last_id = None
    while True:
        chunk = qs.order_by('pk')
        if last_id:
            chunk = chunk.filter(pk__gt=last_id)
        ids = list(chunk.values_list('pk', flat=True)[:batch_size])
        if not ids:
            break
        yield ids
        last_id = ids[-1]


def archive_attendance_records(
    *,
    older_than_years: int | None = None,
    dry_run: bool = False,
) -> dict[str, int]:
    years = older_than_years or getattr(settings, 'DB_ARCHIVE_ATTENDANCE_YEARS', 2)
    cutoff = timezone.now().date() - timedelta(days=365 * years)
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    qs = AttendanceRecord.all_objects.filter(date__lt=cutoff)
    moved = 0
    deleted = 0

    for ids in _batch_ids(qs, BATCH_SIZE):
        rows = list(AttendanceRecord.all_objects.filter(pk__in=ids))
        if dry_run:
            moved += len(rows)
            continue
        archives = [
            AttendanceRecordArchive(
                id=r.id,
                student_id=r.student_id,
                course_id=r.course_id or '',
                date=r.date,
                status=r.status,
                remarks=r.remarks or '',
                tenant_id=r.tenant_id or '',
                source_created_at=r.created_at,
                source_updated_at=r.updated_at,
            )
            for r in rows
        ]
        with transaction.atomic():
            AttendanceRecordArchive.objects.bulk_create(archives, ignore_conflicts=True)
            count, _ = AttendanceRecord.all_objects.filter(pk__in=ids).delete()
            moved += len(rows)
            deleted += count

    logger.info('archive_attendance cutoff=%s moved=%s', cutoff, moved)
    return {'archived': moved, 'deleted': deleted, 'cutoff': str(cutoff)}


def archive_notifications(
    *,
    older_than_days: int | None = None,
    dry_run: bool = False,
) -> dict[str, int]:
    days = older_than_days or getattr(settings, 'DB_ARCHIVE_NOTIFICATION_DAYS', 90)
    cutoff = timezone.now() - timedelta(days=days)
    Notification = apps.get_model('user_notifications', 'Notification')
    qs = Notification.all_objects.filter(created_at__lt=cutoff, is_read=True)
    moved = 0

    for ids in _batch_ids(qs, BATCH_SIZE):
        rows = list(Notification.all_objects.filter(pk__in=ids))
        if dry_run:
            moved += len(rows)
            continue
        archives = [
            NotificationArchive(
                id=r.id,
                recipient_id=r.recipient_id,
                title=r.title,
                message=r.message,
                notification_type=r.notification_type,
                is_read=r.is_read,
                source_created_at=r.created_at,
            )
            for r in rows
        ]
        with transaction.atomic():
            NotificationArchive.objects.bulk_create(archives, ignore_conflicts=True)
            Notification.all_objects.filter(pk__in=ids).delete()
            moved += len(rows)

    logger.info('archive_notifications cutoff=%s moved=%s', cutoff, moved)
    return {'archived': moved, 'cutoff': str(cutoff)}


def archive_audit_logs(
    *,
    older_than_days: int | None = None,
    dry_run: bool = False,
) -> dict[str, int]:
    days = older_than_days or getattr(settings, 'DB_ARCHIVE_AUDIT_DAYS', 90)
    cutoff = timezone.now() - timedelta(days=days)
    AuditLog = apps.get_model('audit', 'AuditLog')
    qs = AuditLog.objects.filter(timestamp__lt=cutoff)
    moved = 0

    for ids in _batch_ids(qs, BATCH_SIZE):
        rows = list(AuditLog.objects.filter(pk__in=ids))
        if dry_run:
            moved += len(rows)
            continue
        archives = [
            AuditLogArchive(
                id=r.id,
                user_id=r.user_id,
                action=r.action,
                resource_type=r.resource_type,
                resource_id=r.resource_id,
                old_data=r.old_data,
                new_data=r.new_data,
                ip_address=r.ip_address,
                user_agent=r.user_agent,
                source_timestamp=r.timestamp,
            )
            for r in rows
        ]
        with transaction.atomic():
            AuditLogArchive.objects.bulk_create(archives, ignore_conflicts=True)
            AuditLog.objects.filter(pk__in=ids).delete()
            moved += len(rows)

    logger.info('archive_audit_logs cutoff=%s moved=%s', cutoff, moved)
    return {'archived': moved, 'cutoff': str(cutoff)}


def archive_invoices_by_year(
    *,
    before_year: int | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Archive invoices with issue_date before the given calendar year."""
    from datetime import date

    year = before_year or timezone.now().year - 2
    cutoff = date(year, 1, 1)
    Invoice = apps.get_model('education_finance', 'Invoice')
    qs = Invoice.all_objects.filter(issue_date__lt=cutoff, status__in=['paid', 'cancelled'])
    moved = 0

    for ids in _batch_ids(qs, BATCH_SIZE):
        rows = list(Invoice.all_objects.filter(pk__in=ids))
        if dry_run:
            moved += len(rows)
            continue
        archives = [
            InvoiceArchive(
                id=r.id,
                invoice_number=r.invoice_number,
                student_id=r.student_id,
                amount=r.amount,
                paid_amount=r.paid_amount,
                due_date=r.due_date,
                issue_date=r.issue_date,
                status=r.status,
                partition_year=r.issue_date.year,
                source_created_at=r.created_at,
            )
            for r in rows
        ]
        with transaction.atomic():
            InvoiceArchive.objects.bulk_create(archives, ignore_conflicts=True)
            Invoice.all_objects.filter(pk__in=ids).delete()
            moved += len(rows)

    return {'archived': moved, 'before_year': year}
