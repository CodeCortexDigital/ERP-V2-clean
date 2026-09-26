"""
send_fee_reminders.py
=====================
Run on the 5th of every month (via cron or Windows Task Scheduler):

    python manage.py send_fee_reminders

Cron example (Linux/macOS):
    0 8 5 * * /path/to/venv/bin/python /path/to/manage.py send_fee_reminders

Business Rules:
  - Runs on 5th of month (due date)
  - Finds all issued/partial invoices for the current month
  - Sends email reminder to each student's registered email
  - Logs each reminder in TransactionLog
  - Use --force to run on any date
  - Use --dry-run to simulate without sending
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings


class Command(BaseCommand):
    help = (
        "Send fee payment reminders to all students with unpaid invoices. "
        "Designed to run on the 5th of each month (the due date). "
        "Sends email to students and logs reminders in TransactionLog."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force run even if today is not the 5th',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            help='Simulate without sending any emails',
        )

    def handle(self, *args, **options):
        from services.education.finance.models import Invoice, TransactionLog

        today = timezone.localtime().date()
        invoice_month = today.replace(day=1)

        # Guard: only run on/after the 5th
        if today.day < 5 and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    f"Today is {today} (day {today.day}). "
                    "Reminders are sent on the 5th (due date). "
                    "Use --force to send now."
                )
            )
            return

        dry_run = options['dry_run']
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no emails will be sent."))

        # Find unpaid invoices for this month
        unpaid_invoices = Invoice.objects.filter(
            invoice_month=invoice_month,
            status__in=['issued', 'partial'],
        ).select_related('student')

        sent_count = 0
        no_email_count = 0
        error_count = 0

        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@school.com')
        school_name = getattr(settings, 'SCHOOL_NAME', 'School Management System')

        for invoice in unpaid_invoices:
            student = invoice.student
            if not dry_run:
                try:
                    from services.education.communication import texts

                    texts.fee_reminder(invoice)  # SMS / WhatsApp where the school switched it on (P16)
                except Exception as exc:
                    self.stderr.write(f'  Text for {invoice.invoice_number} failed: {exc}')

            if not student.email:
                no_email_count += 1
                if options['verbosity'] >= 2:
                    self.stdout.write(
                        f"  SKIP {student.full_name} — no email address"
                    )
                continue

            days_overdue = max(0, (today - invoice.due_date).days)

            context = {
                'student_name': student.full_name,
                'school_name': school_name,
                'invoice_number': invoice.invoice_number,
                'due_date': invoice.due_date,
                'amount': float(invoice.amount),
                'opening_balance': float(invoice.opening_balance),
                'late_fee_amount': float(invoice.late_fee_amount),
                'discount_amount': float(invoice.discount_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_due': float(invoice.balance_due),
                'days_overdue': days_overdue,
                'invoice_month': invoice.invoice_month.strftime('%B %Y') if invoice.invoice_month else '',
            }

            try:
                # Render email using existing template
                html_content = render_to_string('finance/emails/fee_reminder.html', context)
                text_content = strip_tags(html_content)

                if not dry_run:
                    email = EmailMultiAlternatives(
                        subject=f"Fee Payment Reminder – {invoice.invoice_number} | Due: {invoice.due_date}",
                        body=text_content,
                        from_email=from_email,
                        to=[student.email],
                    )
                    email.attach_alternative(html_content, "text/html")
                    email.send()

                    # Log the reminder
                    TransactionLog.objects.create(
                        model_name='Invoice',
                        object_id=str(invoice.id),
                        object_name=invoice.invoice_number,
                        action='update',  # closest valid action
                        new_values={'reminder_sent': True, 'sent_to': student.email, 'sent_on': str(today)},
                    )

                sent_count += 1

                if options['verbosity'] >= 2 or dry_run:
                    self.stdout.write(
                        f"  {'[DRY] ' if dry_run else 'SENT '}"
                        f"→ {student.full_name} <{student.email}> | "
                        f"Balance: {invoice.balance_due}"
                    )

            except Exception as exc:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  ERROR sending to {student.email}: {exc}"
                    )
                )

        action = "Would send" if dry_run else "Sent"
        self.stdout.write(
            self.style.SUCCESS(
                f"\nFee reminders ({today.strftime('%B %Y')}):\n"
                f"  {action}: {sent_count} reminders\n"
                f"  No email on file: {no_email_count}\n"
                f"  Errors: {error_count}"
            )
        )
