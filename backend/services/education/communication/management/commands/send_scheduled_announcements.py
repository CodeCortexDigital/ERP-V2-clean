from django.core.management.base import BaseCommand

from services.core.tenants.context import use_tenant


class Command(BaseCommand):
    help = 'Send announcements whose scheduled time has passed (run every few minutes from cron).'

    def handle(self, *args, **options):
        from services.core.tenants.models import School

        from ...inbox import deliver_due

        for school in School.objects.filter(is_active=True):
            with use_tenant(school):
                deliver_due()
        self.stdout.write('Scheduled announcements sent.')
