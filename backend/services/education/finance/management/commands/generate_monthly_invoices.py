from datetime import date

from django.core.management.base import BaseCommand
from django.utils import timezone

from services.education.finance.models import Invoice, FeeStructure
from services.education.students.models import Student


class Command(BaseCommand):
    help = (
        'Generate monthly pending fee invoices for active students. '
        'This should be run on the 1st of each month and creates invoices due on the 5th.'
    )

    def handle(self, *args, **options):
        today = timezone.localtime().date()
        first_of_month = today.replace(day=1)
        due_date = today.replace(day=5)

        if today.day != 1:
            self.stdout.write(self.style.WARNING(
                'This command is intended to run on the 1st of the month. '
                'Proceeding anyway for the current month.'
            ))

        students = Student.objects.filter(is_active=True)
        created_count = 0
        skipped_count = 0
        missing_fee_count = 0

        for student in students:
            if Invoice.objects.filter(student=student, due_date=due_date).exists():
                skipped_count += 1
                continue

            fee_structure = FeeStructure.objects.filter(class_ref=student.current_class).first()
            if not fee_structure:
                missing_fee_count += 1
                continue

            invoice = Invoice(
                student=student,
                fee_structure=fee_structure,
                amount=fee_structure.amount,
                due_date=due_date,
                issue_date=first_of_month
            )
            invoice.save()
            created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Monthly invoice generation complete. Created: {created_count}, '
            f'Skipped (already exists): {skipped_count}, Missing fee structure: {missing_fee_count}.'
        ))
