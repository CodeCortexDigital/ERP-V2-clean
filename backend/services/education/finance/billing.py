"""Family billing: statements, family payments, account credit and refunds.

A "family" is a household (Phase 1). Students without a household are billed on
their own. Amounts use Decimal throughout; the school's currency comes from its
locale settings.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin, is_accountant

from .models import AccountCredit, Invoice, Payment, Refund, recalculate_invoice

OPEN = ('issued', 'partial', 'overdue')
ZERO = Decimal('0')


class FinanceStaff(BasePermission):
    message = 'Only school administrators and accountants can manage billing.'

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (is_admin(u) or is_accountant(u)))


# ---------------------------------------------------------------------------
# Who is billed
# ---------------------------------------------------------------------------

@dataclass
class Account:
    """A billing account: a household, or a single student without one."""
    household: object | None
    student: object | None

    @property
    def students(self):
        from services.education.students.models import Student

        if self.household is not None:
            return Student.objects.filter(household=self.household)
        return Student.objects.filter(pk=self.student.pk)

    @property
    def name(self):
        return self.household.name if self.household is not None else self.student.full_name

    def credit_filter(self):
        return Q(household=self.household) if self.household is not None else Q(student=self.student, household__isnull=True)

    def credit_balance(self) -> Decimal:
        return AccountCredit.objects.filter(self.credit_filter()).aggregate(t=Sum('amount'))['t'] or ZERO

    def open_invoices(self):
        return Invoice.objects.filter(student__in=self.students, status__in=OPEN).select_related('student').order_by('due_date', 'created_at')

    def outstanding(self) -> Decimal:
        return sum((inv.balance_due for inv in self.open_invoices()), ZERO)

    def add_credit(self, amount, kind, note='', user=None, **links):
        return AccountCredit.objects.create(
            tenant_id=(self.household or self.student).tenant_id, household=self.household,
            student=None if self.household is not None else self.student,
            amount=amount, kind=kind, note=note[:255], created_by=user if getattr(user, 'is_authenticated', False) else None,
            **links,
        )


def account_for_student(student) -> Account:
    return Account(household=student.household, student=None) if student.household_id else Account(None, student)


def get_account(kind: str, pk) -> Account:
    from services.education.students.models import Household, Student

    if kind == 'household':
        return Account(get_object_or_404(Household, pk=pk), None)
    student = get_object_or_404(Student, pk=pk)
    return account_for_student(student)


def billing_contacts(students) -> list[dict]:
    """Guardians marked 'receives invoices' for these students (falls back to the primary contact)."""
    from services.education.students.models import StudentGuardian

    links = StudentGuardian.objects.filter(student__in=students).select_related('guardian')
    chosen = [l for l in links if l.receives_billing] or [l for l in links if l.is_primary]
    seen, out = set(), []
    for l in chosen:
        g = l.guardian
        if g.id in seen:
            continue
        seen.add(g.id)
        out.append({'id': str(g.id), 'name': g.full_name, 'email': g.email, 'phone': g.mobile_phone})
    return out


def billing_emails(student) -> list[str]:
    emails = [c['email'] for c in billing_contacts([student]) if c['email']]
    return emails or ([student.email] if student.email else [])


# ---------------------------------------------------------------------------
# Money in and out
# ---------------------------------------------------------------------------

def allocate_payment(account: Account, amount: Decimal, method: str, reference: str = '', note: str = '', user=None):
    """Pay a family's open invoices oldest first; anything left becomes account credit."""
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValueError('Enter an amount greater than zero.')
    payments, remaining = [], amount
    with transaction.atomic():
        for inv in account.open_invoices().select_for_update():
            if remaining <= 0:
                break
            due = inv.balance_due
            if due <= 0:
                continue
            part = min(due, remaining)
            payments.append(Payment.objects.create(
                invoice=inv, amount=part, payment_method=method, transaction_id=reference,
                received_by=user if getattr(user, 'is_authenticated', False) else None,
                notes=note or 'Family payment',
            ))
            remaining -= part
        credit = account.add_credit(remaining, 'overpayment', note or f'Unallocated from a payment of {amount}',
                                    user) if remaining > 0 else None
    return payments, credit


def apply_credit(account: Account, user=None, limit: Decimal | None = None):
    """Use available credit to pay open invoices, oldest first."""
    available = account.credit_balance()
    if limit is not None:
        available = min(available, Decimal(str(limit)))
    if available <= 0:
        raise ValueError('There is no credit to apply.')
    used = []
    with transaction.atomic():
        for inv in account.open_invoices().select_for_update():
            if available <= 0:
                break
            part = min(inv.balance_due, available)
            if part <= 0:
                continue
            payment = Payment.objects.create(invoice=inv, amount=part, payment_method='account_credit',
                                             received_by=user if getattr(user, 'is_authenticated', False) else None,
                                             notes='Paid from account credit')
            account.add_credit(-part, 'applied', f'Applied to {inv.invoice_number}', user, invoice=inv, payment=payment)
            available -= part
            used.append(payment)
    if not used:
        raise ValueError('There are no open invoices to apply the credit to.')
    return used


def refund(payment: Payment, amount, method: str, reason: str = '', user=None) -> Refund:
    """Refund a payment. Card payments go back through Stripe; 'account_credit' keeps the money as credit."""
    amount = Decimal(str(amount))
    if payment.payment_method == 'account_credit' and method != 'account_credit':
        raise ValueError('A payment made from account credit can only be returned to account credit.')
    gateway_ref = ''
    with transaction.atomic():
        if method == 'original' and payment.payment_method == 'online':
            from .models import PaymentTransaction
            from .payments import stripe_gateway
            from .payments.gateways import get_active_gateway_config

            tx = PaymentTransaction.objects.filter(gateway_reference=payment.transaction_id, gateway='stripe').first()
            if tx is not None:
                config = get_active_gateway_config('stripe', tenant=payment.invoice.student.tenant)
                gateway_ref = stripe_gateway.refund_payment(
                    config, (tx.response_payload or {}).get('payment_intent', ''), amount, tx.currency)
        r = Refund.objects.create(payment=payment, amount=amount, method=method, reason=reason,
                                  gateway_reference=gateway_ref,
                                  created_by=user if getattr(user, 'is_authenticated', False) else None)
        if method == 'account_credit':
            account_for_student(payment.invoice.student).add_credit(
                amount, 'refund', reason or f'Refund of payment on {payment.invoice.invoice_number}', user, payment=payment)
    return r


def _add_period(d: date, frequency: str, steps: int) -> date:
    import calendar
    from datetime import timedelta

    if frequency == 'weekly':
        return d + timedelta(weeks=steps)
    if frequency == 'biweekly':
        return d + timedelta(weeks=2 * steps)
    months = {'monthly': 1, 'quarterly': 3, 'yearly': 12}.get(frequency, 1) * steps
    y, m = divmod(d.month - 1 + months, 12)
    year, month = d.year + y, m + 1
    return d.replace(year=year, month=month, day=min(d.day, calendar.monthrange(year, month)[1]))


def split_into_plan(invoice: Invoice, installments: int, frequency: str, first_due: date, plan=None, user=None):
    """Replace one invoice with a payment plan of smaller invoices.

    The original invoice is closed (status "cancelled", with a note) so the
    family is never billed twice. Only unpaid invoices without a brought-forward
    balance can be split, which keeps statements exact.
    """
    from services.core.tenants.localization import school_locale

    if invoice.is_installment:
        raise ValueError('This invoice is already part of a payment plan.')
    if invoice.status not in OPEN:
        raise ValueError('Only open invoices can be put on a payment plan.')
    if invoice.paid_amount and invoice.paid_amount > 0:
        raise ValueError('This invoice already has payments. Put the remaining balance on a new invoice first.')
    if invoice.opening_balance and invoice.opening_balance > 0:
        raise ValueError('This invoice includes a balance brought forward. Split the earlier invoices instead.')
    if not 2 <= installments <= 24:
        raise ValueError('Choose between 2 and 24 installments.')
    if frequency not in ('weekly', 'biweekly', 'monthly', 'quarterly'):
        raise ValueError('Choose weekly, every two weeks, monthly or quarterly.')

    total = invoice.total_amount
    decimals = school_locale(invoice.student.tenant)['currency_decimals'] if hasattr(invoice.student, 'tenant') else 2
    step = Decimal(1).scaleb(-decimals)
    part = (total / installments).quantize(step, rounding='ROUND_DOWN')
    amounts = [part] * (installments - 1) + [total - part * (installments - 1)]
    children = []
    with transaction.atomic():
        for i, amount in enumerate(amounts, start=1):
            child = Invoice.objects.create(
                student=invoice.student, fee_structure=invoice.fee_structure, installment_plan=plan,
                amount=amount, due_date=_add_period(first_due, frequency, i - 1), invoice_month=invoice.invoice_month,
                description=f'Installment {i} of {installments}: {invoice.description or invoice.invoice_number}'[:500],
                is_installment=True, installment_number=i, parent_invoice=invoice,
                breakdown={'payment_plan_of': invoice.invoice_number},
            )
            # Invoice.save() adds scholarship discounts automatically; the total above already includes them.
            Invoice.objects.filter(pk=child.pk).update(discount_amount=0, scholarship=None)
            children.append(child)
        invoice.status = 'cancelled'
        invoice.cancellation_remarks = f'Replaced by a payment plan of {installments} installments.'
        invoice.save(update_fields=['status', 'cancellation_remarks', 'updated_at'])
    return children


# ---------------------------------------------------------------------------
# Statement
# ---------------------------------------------------------------------------

def statement(account: Account, start: date | None = None, end: date | None = None) -> dict:
    """Chronological statement with a running balance (positive = the family owes the school).

    Charges are each invoice's own fee, late fee and discount. The Pakistani
    "balance brought forward" is not counted again, so carried-forward invoices
    stay correct. Credit applied to an invoice is shown once (as the use of credit).
    """
    students = list(account.students)
    rows = []
    for inv in Invoice.objects.filter(student__in=students).exclude(status__in=('cancelled', 'draft')).select_related('student'):
        charge = (inv.amount or ZERO) + (inv.late_fee_amount or ZERO) - (inv.discount_amount or ZERO)
        rows.append({'date': inv.issue_date or inv.due_date, 'type': 'invoice', 'ref': inv.invoice_number,
                     'student': inv.student.full_name,
                     'description': inv.description or f'Invoice {inv.invoice_number}', 'amount': charge,
                     'due_date': inv.due_date, 'status': inv.status, 'id': str(inv.id),
                     'open_amount': float(inv.balance_due) if inv.status in OPEN else 0.0})
    for p in Payment.objects.filter(invoice__student__in=students).exclude(payment_method='account_credit').select_related('invoice__student'):
        rows.append({'date': p.payment_date, 'type': 'payment', 'ref': p.transaction_id or p.invoice.invoice_number,
                     'student': p.invoice.student.full_name,
                     'description': f'{p.get_payment_method_display()} payment', 'amount': -p.amount, 'id': str(p.id),
                     'refundable': float(p.amount - (p.refunds.aggregate(t=Sum('amount'))['t'] or ZERO))})
    for r in Refund.objects.filter(payment__invoice__student__in=students).select_related('payment__invoice__student'):
        rows.append({'date': r.created_at.date(), 'type': 'refund', 'ref': r.payment.invoice.invoice_number,
                     'student': r.payment.invoice.student.full_name,
                     'description': f'Refund ({r.get_method_display().lower()})' + (f': {r.reason}' if r.reason else ''),
                     'amount': r.amount, 'id': str(r.id)})
    for c in AccountCredit.objects.filter(account.credit_filter()).exclude(kind='applied'):
        rows.append({'date': c.created_at.date(), 'type': 'credit', 'ref': '', 'student': '',
                     'description': f'{c.get_kind_display()}' + (f': {c.note}' if c.note else ''), 'amount': -c.amount,
                     'id': str(c.id)})
    rows.sort(key=lambda r: (r['date'] or date.min, {'invoice': 0, 'payment': 1, 'credit': 2, 'refund': 3}[r['type']]))

    balance, opening, shown = ZERO, ZERO, []
    for r in rows:
        if start and r['date'] and r['date'] < start:
            opening += r['amount']
            balance += r['amount']
            continue
        if end and r['date'] and r['date'] > end:
            continue
        balance += r['amount']
        shown.append({**r, 'amount': float(r['amount']), 'balance': float(balance),
                      'date': r['date'].isoformat() if r['date'] else None,
                      'due_date': r['due_date'].isoformat() if r.get('due_date') else None})

    from services.core.tenants.localization import school_locale

    owner = account.household or account.student
    return {
        'account': {'type': 'household' if account.household is not None else 'student', 'id': str(owner.pk),
                    'name': account.name,
                    'address': ', '.join(x for x in [getattr(owner, 'address', ''), getattr(owner, 'city', '')] if x)},
        'students': [{'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
                      'class_name': s.current_class.name if s.current_class_id else ''} for s in students],
        'billing_contacts': billing_contacts(students),
        'currency': school_locale(getattr(owner, 'tenant', None))['currency'],
        'period': {'from': start.isoformat() if start else None, 'to': end.isoformat() if end else None},
        'opening_balance': float(opening),
        'closing_balance': float(balance),
        'outstanding': float(account.outstanding()),
        'credit_available': float(account.credit_balance()),
        'lines': shown,
        'generated_at': timezone.now().isoformat(),
    }


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def _parse_date(value):
    try:
        return date.fromisoformat(value) if value else None
    except ValueError:
        return None


@api_view(['GET'])
@permission_classes([FinanceStaff])
def family_accounts(request):
    """Households (and students without one) with their balance and credit."""
    from services.education.students.models import Household, Student

    q = (request.query_params.get('search') or '').strip()
    only_owing = request.query_params.get('owing') in ('1', 'true')
    households = Household.objects.prefetch_related('students')
    if q:
        households = households.filter(Q(name__icontains=q) | Q(students__full_name__icontains=q)
                                       | Q(students__student_id__icontains=q)).distinct()
    open_by_student = {}
    for inv in Invoice.objects.filter(status__in=OPEN).only('id', 'student_id', 'amount', 'opening_balance', 'discount_amount',
                                                            'late_fee_amount', 'paid_amount', 'status'):
        open_by_student[inv.student_id] = open_by_student.get(inv.student_id, ZERO) + inv.balance_due
    credit_by_household = dict(AccountCredit.objects.filter(household__isnull=False).values_list('household')
                               .annotate(t=Sum('amount')).values_list('household', 't'))
    rows = []
    for h in households:
        kids = list(h.students.all())
        owing = sum((open_by_student.get(k.id, ZERO) for k in kids), ZERO)
        credit = credit_by_household.get(h.id) or ZERO
        if only_owing and owing <= 0:
            continue
        rows.append({'type': 'household', 'id': str(h.id), 'name': h.name, 'students': [k.full_name for k in kids],
                     'outstanding': float(owing), 'credit': float(credit)})
    loners = Student.objects.filter(household__isnull=True, is_active=True)
    if q:
        loners = loners.filter(Q(full_name__icontains=q) | Q(student_id__icontains=q))
    for s in loners:
        owing = open_by_student.get(s.id, ZERO)
        if only_owing and owing <= 0:
            continue
        credit = AccountCredit.objects.filter(student=s, household__isnull=True).aggregate(t=Sum('amount'))['t'] or ZERO
        rows.append({'type': 'student', 'id': str(s.id), 'name': s.full_name, 'students': [s.full_name],
                     'outstanding': float(owing), 'credit': float(credit)})
    rows.sort(key=lambda r: (-r['outstanding'], r['name']))
    return Response({'results': rows, 'total_outstanding': float(sum(Decimal(str(r['outstanding'])) for r in rows)),
                     'total_credit': float(sum(Decimal(str(r['credit'])) for r in rows))})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def family_statement(request, kind, pk):
    """Statement for staff, or for a parent whose child belongs to the account."""
    account = get_account(kind, pk)
    user = request.user
    if not (is_admin(user) or is_accountant(user)):
        from services.core.accounts.decorators import ensure_student_access, is_parent

        if not (is_parent(user) and any(ensure_student_access(user, s) for s in account.students)):
            return Response({'error': 'You can only see statements for your own family.'}, status=403)
    return Response(statement(account, _parse_date(request.query_params.get('from')),
                              _parse_date(request.query_params.get('to'))))


@api_view(['POST'])
@permission_classes([FinanceStaff])
def family_payment(request, kind, pk):
    account = get_account(kind, pk)
    method = request.data.get('method') or 'cash'
    if method not in dict(Payment.PAYMENT_METHODS) or method == 'account_credit':
        return Response({'error': 'Choose how the family paid.'}, status=400)
    try:
        payments, credit = allocate_payment(account, request.data.get('amount') or 0, method,
                                            str(request.data.get('reference') or ''), str(request.data.get('note') or ''),
                                            request.user)
    except (ValueError, ArithmeticError) as exc:
        return Response({'error': str(exc) or 'Enter a valid amount.'}, status=400)
    return Response({
        'allocated': [{'invoice': p.invoice.invoice_number, 'student': p.invoice.student.full_name, 'amount': float(p.amount)}
                      for p in payments],
        'credit_added': float(credit.amount) if credit else 0,
        'statement': statement(account),
    }, status=201)


@api_view(['POST'])
@permission_classes([FinanceStaff])
def family_credit(request, kind, pk):
    """Give credit (goodwill) or make an adjustment: {"amount": 50, "note": "..."}."""
    account = get_account(kind, pk)
    try:
        amount = Decimal(str(request.data.get('amount') or 0))
    except ArithmeticError:
        return Response({'error': 'Enter a valid amount.'}, status=400)
    kind_ = request.data.get('kind') or 'goodwill'
    if kind_ not in ('goodwill', 'adjustment') or amount == 0 or (kind_ == 'goodwill' and amount < 0):
        return Response({'error': 'Enter a credit amount.'}, status=400)
    if amount < 0 and account.credit_balance() + amount < 0:
        return Response({'error': 'The adjustment is larger than the credit available.'}, status=400)
    note = str(request.data.get('note') or '').strip()
    if not note:
        return Response({'error': 'Add a short reason for the credit.'}, status=400)
    account.add_credit(amount, kind_, note, request.user)
    return Response(statement(account), status=201)


@api_view(['POST'])
@permission_classes([FinanceStaff])
def family_apply_credit(request, kind, pk):
    account = get_account(kind, pk)
    try:
        apply_credit(account, request.user, request.data.get('amount'))
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    return Response(statement(account))


@api_view(['POST'])
@permission_classes([FinanceStaff])
def refund_payment_view(request, payment_id):
    payment = get_object_or_404(Payment.objects.select_related('invoice__student'), pk=payment_id)
    method = request.data.get('method') or 'original'
    if method not in dict(Refund.METHODS):
        return Response({'error': 'Choose how to refund.'}, status=400)
    try:
        r = refund(payment, request.data.get('amount') or 0, method, str(request.data.get('reason') or ''), request.user)
    except (ValueError, ArithmeticError) as exc:
        return Response({'error': str(exc) or 'Enter a valid amount.'}, status=400)
    return Response({'id': str(r.id), 'amount': float(r.amount), 'method': r.method,
                     'invoice_status': r.payment.invoice.status}, status=201)


@api_view(['POST'])
@permission_classes([FinanceStaff])
def email_statement(request, kind, pk):
    account = get_account(kind, pk)
    data = statement(account)
    to = [c['email'] for c in data['billing_contacts'] if c['email']]
    if not to:
        return Response({'error': 'No billing contact with an email address. Mark a guardian as "Receives invoices".'},
                        status=400)
    school = getattr(request, 'tenant', None)
    school_name = ((school.settings_json or {}).get('institute_name') or school.name) if school else 'School'
    cur = data['currency']
    lines = '\n'.join(f"{l['date']}  {l['description'][:48]:<48} {l['amount']:>12,.2f}  {l['balance']:>12,.2f}"
                      for l in data['lines'][-40:])
    body = (f"Statement for {data['account']['name']} from {school_name}\n\n"
            f"Amount due now: {cur} {data['outstanding']:,.2f}\n"
            f"Credit available: {cur} {data['credit_available']:,.2f}\n\n{lines}\n\n"
            f"Balance: {cur} {data['closing_balance']:,.2f}\n")
    send_mail(f'{school_name}: account statement', body, None, to, fail_silently=True)
    return Response({'sent_to': to})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_family_accounts(request):
    """For parents: the billing accounts their children belong to."""
    from services.core.accounts.decorators import filter_students_for_user
    from services.education.students.models import Student

    seen, out = set(), []
    for s in filter_students_for_user(request.user, Student.objects.filter(is_active=True)).select_related('household'):
        acc = account_for_student(s)
        key = ('household', acc.household.pk) if acc.household is not None else ('student', s.pk)
        if key in seen:
            continue
        seen.add(key)
        out.append({'type': key[0], 'id': str(key[1]), 'name': acc.name, 'outstanding': float(acc.outstanding()),
                    'credit': float(acc.credit_balance())})
    return Response(out)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_providers(request):
    """Online payment options this school has switched on (no secrets)."""
    from .models import PaymentGatewayConfig
    from .payments.gateways import get_active_gateway_config

    school = getattr(request, 'tenant', None)
    providers = []
    for code, label in PaymentGatewayConfig.GATEWAY_PROVIDERS:
        cfg = get_active_gateway_config(code, tenant=school)
        ready = getattr(cfg, 'api_secret', '') if code == 'stripe' else getattr(cfg, 'merchant_id', '')
        if cfg and ready:
            providers.append({'code': code, 'label': label})
    return Response(providers)


@api_view(['POST'])
@permission_classes([FinanceStaff])
def invoice_payment_plan(request, invoice_id):
    """Split an invoice: {"installments": 3, "frequency": "monthly", "first_due_date": "2026-10-01", "plan_id": optional}."""
    from .models import InstallmentPlan

    invoice = get_object_or_404(Invoice.objects.select_related('student'), pk=invoice_id)
    plan = InstallmentPlan.objects.filter(pk=request.data.get('plan_id')).first() if request.data.get('plan_id') else None
    try:
        count = int(request.data.get('installments') or (plan.number_of_installments if plan else 0))
    except (TypeError, ValueError):
        return Response({'error': 'Enter the number of installments.'}, status=400)
    frequency = request.data.get('frequency') or (plan.frequency if plan else 'monthly')
    first_due = _parse_date(request.data.get('first_due_date')) or invoice.due_date
    try:
        children = split_into_plan(invoice, count, frequency, first_due, plan, request.user)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    return Response({'installments': [
        {'id': str(c.id), 'invoice_number': c.invoice_number, 'amount': float(c.amount), 'due_date': c.due_date.isoformat()}
        for c in children
    ]}, status=201)
