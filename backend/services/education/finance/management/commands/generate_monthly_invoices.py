from django.core.management.base import BaseCommand
from django.utils import timezone

from services.education.finance.models import Invoice, FeeStructure
from services.education.students.models import Student


class Command(BaseCommand):
    help = (
        "Generate monthly invoices for active students. "
        "Run automatically on the 1st day of each month at 00:00."
    )

    def handle(self, *args, **options):

        today = timezone.localtime().date()
        due_date = today.replace(day=5)

        if today.day != 1:
            self.stdout.write(
                self.style.WARNING(
                    "This command is designed for the 1st day of the month. "
                    "Continuing for current month."
                )
            )

        students = Student.objects.filter(
            is_active=True
        )

        created_count = 0
        skipped_count = 0
        missing_fee_count = 0

        for student in students:

            if not student.current_class:
                continue

            # Try class-specific monthly fee
            fee_structure = FeeStructure.objects.filter(
                class_ref=student.current_class,
                is_recurring=True,
                frequency='monthly'
            ).first()

            # Fallback monthly fee
            if not fee_structure:
                fee_structure = FeeStructure.objects.filter(
                    is_recurring=True,
                    frequency='monthly'
                ).first()

            if not fee_structure:
                missing_fee_count += 1
                continue

            # Prevent duplicates
            invoice_exists = Invoice.objects.filter(
                student=student,
                issue_date__year=today.year,
                issue_date__month=today.month
            ).exists()

            if invoice_exists:
                skipped_count += 1
                continue

            # Create invoice
            # find old unpaid invoices
            old_pending = Invoice.objects.filter(
                student=student
            ).exclude(
                status='paid'
            )

            carry_forward = sum(
                invoice.balance_due for invoice in old_pending
            )

            new_amount = fee_structure.amount + carry_forward

            Invoice.objects.create(
                tenant=student.tenant,
                student=student,
                fee_structure=fee_structure,
                amount=new_amount,
                due_date=due_date,
                description=f"Monthly Fee {today.strftime('%B %Y')} + Pending {carry_forward}",
                status='issued'
            )
            
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Monthly invoices complete → "
                f"Created: {created_count}, "
                f"Skipped: {skipped_count}, "
                f"Missing Fee Structure: {missing_fee_count}"
            )
        )