"""Delete activity-log and sign-in records older than each school's retention settings (run daily)."""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from services.core.audit.models import AuditLog
from services.core.security.models import SignInEvent
from services.core.security.policy import DEFAULTS, security_settings
from services.core.tenants.models import School


class Command(BaseCommand):
    help = "Apply each school's retention rules to the activity log and sign-in history."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Only count what would be deleted.')

    def handle(self, *args, **options):
        dry = options['dry_run']
        now = timezone.now()
        total_activity = total_signins = 0

        def purge(qs):
            n = qs.count()
            if n and not dry:
                qs.delete()
            return n

        for school in School.objects.all():
            rules = security_settings(school)
            a = purge(AuditLog.objects.filter(school=school, timestamp__lt=now - timedelta(days=rules['activity_days'])))
            s = purge(SignInEvent.objects.filter(school=school, created_at__lt=now - timedelta(days=rules['sign_in_days'])))
            total_activity, total_signins = total_activity + a, total_signins + s
            if a or s:
                self.stdout.write(f'{school.name}: {a} activity records, {s} sign-ins')
        # Records with no school (older logs, unknown sign-in names) follow the default rules.
        total_activity += purge(AuditLog.objects.filter(school__isnull=True, timestamp__lt=now - timedelta(days=DEFAULTS['activity_days'])))
        total_signins += purge(SignInEvent.objects.filter(school__isnull=True, created_at__lt=now - timedelta(days=DEFAULTS['sign_in_days'])))
        verb = 'Would delete' if dry else 'Deleted'
        self.stdout.write(self.style.SUCCESS(f'{verb} {total_activity} activity records and {total_signins} sign-ins.'))
