"""Apply each school's retention rules (run daily): the activity log and sign-in history (Phase 21), and the rules by
record type (P17: students who left, old applications, messages, logs, invoices)."""
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
            # Record types the school set rules for (P17): left students, old applications, messages, invoices...
            from services.core.security.retention import apply as apply_types

            by_type = apply_types(school, dry_run=dry)
            if a or s or any(by_type.values()):
                extra = ', '.join(f'{n} {k.replace("_", " ")}' for k, n in by_type.items() if n)
                self.stdout.write(f'{school.name}: {a} activity records, {s} sign-ins' + (f', {extra}' if extra else ''))
        # Records with no school (older logs, unknown sign-in names) follow the default rules.
        total_activity += purge(AuditLog.objects.filter(school__isnull=True, timestamp__lt=now - timedelta(days=DEFAULTS['activity_days'])))
        total_signins += purge(SignInEvent.objects.filter(school__isnull=True, created_at__lt=now - timedelta(days=DEFAULTS['sign_in_days'])))
        verb = 'Would delete' if dry else 'Deleted'
        self.stdout.write(self.style.SUCCESS(f'{verb} {total_activity} activity records and {total_signins} sign-ins.'))
