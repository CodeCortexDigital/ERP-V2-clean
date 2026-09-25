from django.core.management.base import BaseCommand

from services.core.tenants.context import use_tenant


class Command(BaseCommand):
    help = 'Send event reminders and next-day meeting reminders (run once a day from cron).'

    def handle(self, *args, **options):
        from services.core.tenants.models import School

        from ...api import send_reminders

        total = 0
        for school in School.objects.filter(is_active=True):
            with use_tenant(school):
                total += send_reminders()
        self.stdout.write(f'{total} reminder(s) sent.')
