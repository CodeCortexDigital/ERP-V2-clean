"""Platform invoices (P12): billing details, tax, issuing, proration, payment, reminders and the daily run."""
from __future__ import annotations

import os
import re
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.db import transaction
from django.utils import timezone

from . import service
from .models import PlatformInvoice, Subscription, TaxRule

INVOICE_AHEAD_DAYS = 7         # issue the next invoice this long before it is due
REMINDERS = [                  # (key, days relative to the due date, subject)
    ('soon', -3, 'Your school subscription invoice is due in 3 days'),
    ('due', 0, 'Your school subscription invoice is due today'),
    ('late3', 3, 'Reminder: your school subscription invoice is overdue'),
    ('late7', 7, 'Final reminder: your school will become read-only'),
]
CENT = Decimal('0.01')


def money(v) -> Decimal:
    return Decimal(str(v)).quantize(CENT, rounding=ROUND_HALF_UP)


# ---- Billing details and tax ------------------------------------------------------------------------------------

def billing_details(school) -> dict:
    d = dict((school.settings_json or {}).get('billing') or {})
    s = school.settings_json or {}
    return {
        'legal_name': d.get('legal_name') or s.get('institute_name') or school.name,
        'address': d.get('address') or s.get('address', ''),
        'country': (d.get('country') or '').upper(),
        'tax_id': d.get('tax_id', ''),
        'email': d.get('email') or s.get('email', ''),
    }


def save_billing_details(school, data) -> tuple[dict | None, str | None]:
    current = billing_details(school)
    for key in ('legal_name', 'address', 'tax_id', 'email'):
        if key in data:
            current[key] = str(data[key] or '').strip()[:300]
    if 'country' in data:
        country = str(data['country'] or '').strip().upper()
        if country and not re.fullmatch(r'[A-Z]{2}', country):
            return None, 'Country must be a two-letter code, for example GB, US or PK.'
        current['country'] = country
    if current['email'] and not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', current['email']):
        return None, 'The billing email is not valid.'
    settings_json = dict(school.settings_json or {})
    settings_json['billing'] = current
    school.settings_json = settings_json
    school.save(update_fields=['settings_json'])
    return current, None


def tax_for(details) -> tuple[str, Decimal, str]:
    rule = TaxRule.objects.filter(country=details.get('country') or '').first()
    if rule is None:
        return '', Decimal('0'), ''
    if rule.exempt_with_tax_id and details.get('tax_id'):
        return rule.label, Decimal('0'), f'Reverse charge: {rule.label} to be accounted for by the customer ({details["tax_id"]}).'
    return rule.label, rule.rate, ''


# ---- Issuing ----------------------------------------------------------------------------------------------------

def _next_number(today: date) -> str:
    prefix = f'PI-{today:%Y}-'
    last = PlatformInvoice.objects.filter(number__startswith=prefix).order_by('-number').values_list('number', flat=True).first()
    n = int(last.rsplit('-', 1)[1]) + 1 if last else 1
    return f'{prefix}{n:05d}'


def _period_end(start: date, cycle: str) -> date:
    return start + timedelta(days=365 if cycle == 'yearly' else 30)


def issue(school, plan, cycle, period_start: date, *, amount=None, kind='period', due: date | None = None, period_end: date | None = None):
    """Create an open invoice (idempotent for a period: returns the existing one). None when nothing is owed."""
    if plan is None or plan.contact_sales:
        return None
    subtotal = money(amount if amount is not None else plan.price(cycle))
    if subtotal <= 0:
        return None
    if kind == 'period':
        existing = PlatformInvoice.objects.filter(school=school, kind='period', period_start=period_start).exclude(status='void').first()
        if existing:
            return existing
    details = billing_details(school)
    label, rate, note = tax_for(details)
    tax = money(subtotal * rate / 100)
    today = timezone.localdate()
    with transaction.atomic():
        return PlatformInvoice.objects.create(
            number=_next_number(today), school=school, kind=kind, plan=plan, plan_name=plan.name, billing_cycle=cycle,
            period_start=period_start, period_end=period_end or _period_end(period_start, cycle), currency=plan.currency,
            subtotal=subtotal, tax_label=label, tax_rate=rate, tax_amount=tax, tax_note=note, total=subtotal + tax,
            issue_date=today, due_date=due or max(period_start, today), bill_to=details)


def _local_date(dt):
    return timezone.localtime(dt).date() if dt else None


def after_plan_change(sub, old_plan, old_cycle):
    """Bill what a plan choice means: the first period (trial / read-only / legacy), or the upgrade difference."""
    today = timezone.localdate()
    state = sub.effective_status()
    if state == 'trialing':
        start = _local_date(sub.trial_ends_at) or today
        return issue(sub.school, sub.plan, sub.billing_cycle, start, due=start)
    if state in ('read_only', 'cancelled') or sub.current_period_end is None:
        return issue(sub.school, sub.plan, sub.billing_cycle, today, due=today)
    # Paid period running: charge the difference for the days left (upgrades only; downgrades wait for renewal).
    if sub.plan_id != getattr(old_plan, 'id', None) and not sub.pending_plan_id:
        end = _local_date(sub.current_period_end)
        start = _local_date(sub.current_period_start) or (end - timedelta(days=30))
        total_days = max(1, (end - start).days)
        left = max(0, (end - today).days)
        diff = (Decimal(sub.plan.price(sub.billing_cycle)) - Decimal(old_plan.price(old_cycle))) * left / total_days
        if diff > 0:
            return issue(sub.school, sub.plan, sub.billing_cycle, today, amount=diff, kind='proration', due=today + timedelta(days=7), period_end=end)
    return None


def upcoming(sub, today=None):
    """The invoice a subscription needs next, if it is due within INVOICE_AHEAD_DAYS."""
    today = today or timezone.localdate()
    state = sub.effective_status()
    if state == 'suspended' or sub.cancel_at_period_end or sub.status == 'cancelled':
        return None
    if sub.status == 'trialing':
        start = _local_date(sub.trial_ends_at)
        if start and start - today <= timedelta(days=INVOICE_AHEAD_DAYS):
            return issue(sub.school, sub.plan, sub.billing_cycle, max(start, today) if state == 'read_only' else start)
        return None
    if sub.current_period_end:
        start = _local_date(sub.current_period_end)
        if start - today <= timedelta(days=INVOICE_AHEAD_DAYS):
            plan = sub.pending_plan or sub.plan
            cycle = sub.pending_cycle or sub.billing_cycle
            return issue(sub.school, plan, cycle, start)
    return None


# ---- Payment ----------------------------------------------------------------------------------------------------

def mark_paid(invoice, *, via, reference='', by=None):
    """Record payment. A period invoice starts the paid period (renewing the subscription)."""
    if invoice.status == 'paid':
        return invoice
    if invoice.status == 'void':
        raise ValueError('This invoice was cancelled.')
    paid_note = f'{invoice.number} paid by {via.replace("_", " ")}' + (f', ref. {reference}' if reference else '')
    with transaction.atomic():
        invoice.status, invoice.paid_at, invoice.paid_via, invoice.payment_reference = 'paid', timezone.now(), via, reference[:120]
        invoice.save(update_fields=['status', 'paid_at', 'paid_via', 'payment_reference'])
        sub = Subscription.objects.select_related('plan').filter(school=invoice.school).first()
        if sub is not None and invoice.kind == 'period':
            if invoice.plan_id and sub.plan_id != invoice.plan_id and not sub.pending_plan_id:
                sub.plan, sub.billing_cycle = invoice.plan, invoice.billing_cycle
            if sub.status in ('trialing', 'read_only', 'past_due') or sub.effective_status() == 'read_only':
                # The paid period starts when the invoice's period does (paying early keeps the rest of the trial).
                start = timezone.make_aware(datetime.combine(invoice.period_start, time.min))
                sub.current_period_end = start if start > timezone.now() else None
            service.renew(sub, by=by, note=paid_note)
        else:
            service.log(invoice.school, 'paid', paid_note, by)
    return invoice


def void(invoice, by=None):
    if invoice.status == 'paid':
        raise ValueError('A paid invoice cannot be cancelled.')
    invoice.status = 'void'
    invoice.save(update_fields=['status'])
    service.log(invoice.school, 'void', f'{invoice.number} cancelled', by)


def bank_details() -> str:
    return os.environ.get('PLATFORM_BANK_DETAILS', '').strip()


# ---- Reminders and the daily run --------------------------------------------------------------------------------

def _recipients(school, invoice):
    from services.core.tenants.models import TenantMembership

    emails = [invoice.bill_to.get('email')] if invoice.bill_to.get('email') else []
    if not emails:
        emails = list(TenantMembership.objects.filter(school=school, role='admin', is_active=True).values_list('user__email', flat=True))
    return [e for e in emails if e]


def remind(invoice, today=None) -> str | None:
    """Send the reminder that is due for an open invoice (at most one per stage). Returns the stage sent."""
    today = today or timezone.localdate()
    if invoice.status != 'open':
        return None
    due_stage = None
    for key, offset, subject in REMINDERS:
        if (today - invoice.due_date).days >= offset and key not in (invoice.reminders or []):
            due_stage = (key, subject)
    if due_stage is None:
        return None
    key, subject = due_stage
    to = _recipients(invoice.school, invoice)
    if to:
        body = (f'Invoice {invoice.number} for {invoice.plan_name} ({invoice.period_start:%d %b %Y} – {invoice.period_end:%d %b %Y}): '
                f'{invoice.currency} {invoice.total}, due {invoice.due_date:%d %b %Y}.\n\n'
                'Pay it in the app under Settings → Plan & billing.\n'
                + ('If it is not paid within 7 days of the due date, the school becomes read-only until it is.\n' if key != 'late7' else
                   'The school becomes read-only if it is not paid now. Nothing is deleted.\n')
                + (f'\nBank transfer details:\n{bank_details()}\n' if bank_details() else ''))
        try:
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, to, connection=get_connection(settings.FALLBACK_EMAIL_BACKEND), fail_silently=True)
        except Exception:
            pass
    invoice.reminders = [*(invoice.reminders or []), key]
    invoice.save(update_fields=['reminders'])
    return key


def run(today=None) -> dict:
    """Daily: issue the invoices coming due and send the reminders that are due."""
    today = today or timezone.localdate()
    issued, reminded = 0, 0
    for sub in Subscription.objects.select_related('plan', 'pending_plan', 'school').exclude(status='suspended'):
        before = PlatformInvoice.objects.filter(school=sub.school).count()
        upcoming(sub, today)
        issued += PlatformInvoice.objects.filter(school=sub.school).count() - before
    for inv in PlatformInvoice.objects.filter(status='open').select_related('school'):
        if remind(inv, today):
            reminded += 1
    return {'issued': issued, 'reminded': reminded}
