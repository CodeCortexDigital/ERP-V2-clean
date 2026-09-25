from django.core.management.base import BaseCommand

from services.core.tenants.context import use_tenant


class Command(BaseCommand):
    help = 'Library: due-tomorrow reminders, overdue notices and expired holds (run once a day from cron).'

    def handle(self, *args, **options):
        from services.core.tenants.models import School

        from ...api import send_reminders

        totals = {'due_tomorrow': 0, 'overdue': 0, 'holds_expired': 0}
        for school in School.objects.filter(is_active=True):
            with use_tenant(school):
                for k, v in send_reminders().items():
                    totals[k] += v
        self.stdout.write(f"{totals['due_tomorrow']} due-tomorrow reminder(s), {totals['overdue']} overdue notice(s), "
                          f"{totals['holds_expired']} hold(s) released.")
