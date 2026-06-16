"""
generate_monthly_invoices.py
============================
Run on the 1st of every month (via cron or Windows Task Scheduler):

    python manage.py generate_monthly_invoices

Cron example (Linux/macOS):
    0 0 1 * * /path/to/venv/bin/python /path/to/manage.py generate_monthly_invoices

Windows Task Scheduler: Run monthly on day 1 at 00:00.

Business Rules:
  - Runs on 1st of month
  - due_date = 5th of the month
  - amount  = pure FeeStructure.amount (this month's fee only)
  - opening_balance = sum of balance_due from all previous unpaid/partial/overdue invoices
  - invoice_month = 1st of current month (tracks which month this invoice belongs to)
  - Skips students who already have an invoice for this month (idempotent)
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal

from services.education.finance.models import Invoice, FeeStructure
from services.education.students.models import Student


class Command(BaseCommand):
    help = (
        "Generate monthly invoices for all active students. "
        "Designed to run on the 1st of each month. "
        "Stores carry-forward as opening_balance (B/F) — separate from this month's fee."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force run even if not the 1st day of the month',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            help='Simulate without creating any invoices',
        )

    def handle(self, *args, **options):
        today = timezone.localtime().date()
        invoice_month = today.replace(day=1)   # e.g. 2026-06-01
        due_date = today.replace(day=5)         # Always due on 5th

        # Guard: warn if not run on the 1st
        if today.day != 1 and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    f"Today is {today} (not the 1st). "
                    "Use --force to generate anyway."
                )
            )
            return

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no invoices will be created."))

        students = Student.objects.filter(is_active=True).select_related('current_class')

        created_count = 0
        skipped_count = 0
        missing_fee_count = 0

        for student in students:
            if not student.current_class:
                missing_fee_count += 1
                continue

            # Find class-specific monthly fee structure, then fallback to any monthly fee
            fee_structure = (
                FeeStructure.objects.filter(
                    class_ref=student.current_class,
                    is_recurring=True,
                    frequency='monthly',
                ).first()
                or FeeStructure.objects.filter(
                    is_recurring=True,
                    frequency='monthly',
                ).first()
            )

            if not fee_structure:
                missing_fee_count += 1
                self.stdout.write(
                    self.style.WARNING(f"  No monthly fee structure for {student.full_name} ({student.student_id})")
                )
                continue

            # Idempotency: skip if an invoice already exists for this month
            already_exists = Invoice.objects.filter(
                student=student,
                invoice_month=invoice_month,
            ).exists()

            if already_exists:
                skipped_count += 1
                continue

            # ── Opening Balance (B/F) ──────────────────────────────────────────
            # Sum balance_due of ALL previous unpaid invoices (not this month).
            # We exclude the current month to avoid double-counting.
            previous_unpaid = Invoice.objects.filter(
                student=student,
                status__in=['issued', 'partial', 'overdue'],
            ).exclude(invoice_month=invoice_month)

            opening_balance = Decimal('0.00')
            for inv in previous_unpaid:
                opening_balance += inv.balance_due

            # ── Create Invoice ─────────────────────────────────────────────────
            description_parts = [f"Monthly Fee — {today.strftime('%B %Y')}"]
            if opening_balance > 0:
                description_parts.append(f"Opening Balance (B/F): PKR {opening_balance:,.2f}")

            if not dry_run:
                Invoice.objects.create(
                    student=student,
                    fee_structure=fee_structure,
                    amount=fee_structure.amount,          # Pure fee — NOT inflated
                    opening_balance=opening_balance,      # Carry-forward stored separately
                    due_date=due_date,
                    invoice_month=invoice_month,
                    status='issued',
                    description=' | '.join(description_parts),
                )

            created_count += 1

            if options['verbosity'] >= 2 or dry_run:
                self.stdout.write(
                    f"  {'[DRY] ' if dry_run else ''}Invoice for {student.full_name}: "
                    f"Fee={fee_structure.amount}, B/F={opening_balance}"
                )

        # Summary
        action = "Would create" if dry_run else "Created"
        self.stdout.write(
            self.style.SUCCESS(
                f"\nMonthly invoices ({today.strftime('%B %Y')}):\n"
                f"  {action}: {created_count}\n"
                f"  Skipped (already exists): {skipped_count}\n"
                f"  Missing fee structure: {missing_fee_count}"
            )
        )