"""
Archive aged attendance, notifications, audit logs, and invoices.

Usage:
  python manage.py archive_old_data
  python manage.py archive_old_data --dry-run
  python manage.py archive_old_data --only attendance,audit
"""

from django.core.management.base import BaseCommand

from services.core.db.archival import (
    archive_attendance_records,
    archive_audit_logs,
    archive_invoices_by_year,
    archive_notifications,
)
from services.core.db.partitioning import ensure_partitions_ahead


class Command(BaseCommand):
    help = 'Archive old attendance, notifications, audit logs, and invoices to cold storage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Count rows without moving or deleting',
        )
        parser.add_argument(
            '--only',
            type=str,
            default='all',
            help='Comma-separated: attendance,notifications,audit,invoices,partitions',
        )
        parser.add_argument(
            '--attendance-years',
            type=int,
            default=None,
            help='Override DB_ARCHIVE_ATTENDANCE_YEARS',
        )
        parser.add_argument(
            '--notification-days',
            type=int,
            default=None,
            help='Override DB_ARCHIVE_NOTIFICATION_DAYS',
        )
        parser.add_argument(
            '--audit-days',
            type=int,
            default=None,
            help='Override DB_ARCHIVE_AUDIT_DAYS',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        targets = {t.strip() for t in options['only'].split(',') if t.strip()}
        run_all = 'all' in targets

        if run_all or 'partitions' in targets:
            created = ensure_partitions_ahead()
            self.stdout.write(self.style.SUCCESS(f'Partitions ensured: {len(created)}'))

        if run_all or 'attendance' in targets:
            result = archive_attendance_records(
                older_than_years=options['attendance_years'],
                dry_run=dry_run,
            )
            self.stdout.write(self.style.SUCCESS(f'Attendance: {result}'))

        if run_all or 'notifications' in targets:
            result = archive_notifications(
                older_than_days=options['notification_days'],
                dry_run=dry_run,
            )
            self.stdout.write(self.style.SUCCESS(f'Notifications: {result}'))

        if run_all or 'audit' in targets:
            result = archive_audit_logs(
                older_than_days=options['audit_days'],
                dry_run=dry_run,
            )
            self.stdout.write(self.style.SUCCESS(f'Audit logs: {result}'))

        if run_all or 'invoices' in targets:
            result = archive_invoices_by_year(dry_run=dry_run)
            self.stdout.write(self.style.SUCCESS(f'Invoices: {result}'))

        self.stdout.write(self.style.SUCCESS('Archive job finished'))
