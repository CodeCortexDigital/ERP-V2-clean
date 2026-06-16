"""
apply_late_fees.py
==================
Run on the 10th of every month (via cron or Windows Task Scheduler):

    python manage.py apply_late_fees

Cron example (Linux/macOS):
    0 0 10 * * /path/to/venv/bin/python /path/to/manage.py apply_late_fees

Business Rules:
  - Only runs on the 10th or later (5 days after due date of 5th)
  - Applies to invoices with due_date <= today and status in [issued, partial, overdue]
  - Sets status = 'overdue'
  - Calculates and stores late_fee_amount from LateFeeRule
  - Use --force to run on any date (for manual use)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from services.education.finance.models import Invoice


class Command(BaseCommand):
    help = (
        "Apply late fees to overdue invoices. "
        "Designed to run on the 10th of each month. "
        "Late fee is applied 5 days after the due date of the 5th."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force run even if today is before the 10th',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            help='Simulate without saving any changes',
        )

    def handle(self, *args, **options):
        today = timezone.localtime().date()

        # Guard: only run on/after the 10th
        if today.day < 10 and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    f"Today is {today} (day {today.day}). "
                    "Late fees are applied on the 10th or later. "
                    "Use --force to apply now."
                )
            )
            return

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be saved."))

        # Find all invoices overdue as of today
        invoices = Invoice.objects.filter(
            due_date__lt=today,
            status__in=['issued', 'partial', 'overdue'],
        ).select_related('student__current_class')

        updated_count = 0
        skipped_count = 0

        for invoice in invoices:
            late_fee = invoice.calculate_late_fee()

            if options['verbosity'] >= 2 or dry_run:
                self.stdout.write(
                    f"  {'[DRY] ' if dry_run else ''}"
                    f"{invoice.invoice_number} ({invoice.student.full_name}): "
                    f"late_fee={late_fee}, was status={invoice.status}"
                )

            if not dry_run:
                invoice.status = 'overdue'
                invoice.late_fee_amount = late_fee
                # Use update_fields to avoid triggering save() side-effects
                invoice.save(update_fields=['status', 'late_fee_amount', 'updated_at'])

            updated_count += 1

        action = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"\nLate fee application ({today}):\n"
                f"  {action}: {updated_count} invoices\n"
                f"  Already overdue / skipped: {skipped_count}"
            )
        )