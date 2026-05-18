from django.core.management.base import BaseCommand
from django.utils import timezone

from services.education.finance.models import Invoice


class Command(BaseCommand):
    help = "Apply late fees and mark overdue invoices"

    def handle(self, *args, **options):

        today = timezone.localtime().date()

        invoices = Invoice.objects.filter(
            due_date__lt=today,
            status__in=['issued', 'partial', 'overdue']
        )

        updated_count = 0

        for invoice in invoices:

            invoice.status = 'overdue'

            invoice.late_fee_amount = (
                invoice.calculate_late_fee()
            )

            invoice.save()

            updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Overdue updated: {updated_count}"
            )
        )