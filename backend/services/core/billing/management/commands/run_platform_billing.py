"""Daily: issue platform invoices coming due and send payment reminders (P12)."""
from django.core.management.base import BaseCommand

from services.core.billing.invoicing import run


class Command(BaseCommand):
    help = 'Issue subscription invoices that are coming due and send the reminders that are due.'

    def handle(self, *args, **options):
        result = run()
        self.stdout.write(self.style.SUCCESS(f"{result['issued']} invoices issued, {result['reminded']} reminders sent."))
