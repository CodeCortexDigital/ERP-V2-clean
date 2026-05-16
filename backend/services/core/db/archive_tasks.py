"""
Celery Beat tasks for scheduled database archival and partition maintenance.
"""

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger('erp.db.archive_tasks')


@shared_task(name='services.core.db.archive_tasks.archive_attendance')
def archive_attendance():
    from .archival import archive_attendance_records

    result = archive_attendance_records()
    logger.info('archive_attendance complete: %s', result)
    return result


@shared_task(name='services.core.db.archive_tasks.archive_notifications')
def archive_notifications():
    from .archival import archive_notifications as _archive_notifications

    result = _archive_notifications()
    logger.info('archive_notifications complete: %s', result)
    return result


@shared_task(name='services.core.db.archive_tasks.archive_audit_logs')
def archive_audit_logs():
    from .archival import archive_audit_logs as _archive_audit_logs

    result = _archive_audit_logs()
    logger.info('archive_audit_logs complete: %s', result)
    return result


@shared_task(name='services.core.db.archive_tasks.archive_invoices')
def archive_invoices():
    from .archival import archive_invoices_by_year

    result = archive_invoices_by_year()
    logger.info('archive_invoices complete: %s', result)
    return result


@shared_task(name='services.core.db.archive_tasks.ensure_partitions')
def ensure_partitions():
    from .partitioning import ensure_partitions_ahead

    created = ensure_partitions_ahead()
    return {'partitions': created}


@shared_task(name='services.core.db.archive_tasks.run_all_archival')
def run_all_archival():
    """Single nightly job — runs all archival steps in sequence."""
    if not getattr(settings, 'DB_ARCHIVAL_ENABLED', True):
        return {'skipped': True}
    return {
        'attendance': archive_attendance(),
        'notifications': archive_notifications(),
        'audit_logs': archive_audit_logs(),
        'invoices': archive_invoices(),
        'partitions': ensure_partitions(),
    }
