"""Cafeteria API (mounted at ``/api/v1/auth/cafeteria/``).

The office (and cafeteria staff with a staff login) run the till and top up accounts; the office sets up food, the
weekly menu and meal plans. Families see balances, purchases and the menu, set a daily limit and ask to top up.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import ensure_student_access, filter_students_for_user, get_user_role, is_admin

from .models import Account, CafeteriaSettings, FoodItem, MealPlan, MealPlanMember, MenuDay, TopUpRequest, Transaction

ITEM_FIELDS = ('name', 'category', 'price', 'description', 'allergens', 'is_vegetarian', 'is_halal', 'is_available')
SETTINGS_FIELDS = ('default_daily_limit', 'low_balance_level', 'allow_negative')


class Refused(Exception):
    pass


def _err(msg, code=400, **extra):
    return Response({'error': msg, **extra}, status=code)


def _school(request):
    return getattr(request, 'tenant', None)


def _money(value, what='Amount', blank_ok=False):
    if value in (None, '') and blank_ok:
        return None
    try:
        d = Decimal(str(value)).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError):
        raise Refused(f'{what} must be a number.')
    if d < 0:
        raise Refused(f'{what} cannot be negative.')
    return d


def _n(d):
    if d is None:
        return None
    f = float(d)
    return int(f) if f.is_integer() else f


def _office(request):
    return is_admin(request.user)


def _cashier(request):
    """The office, or cafeteria staff: anyone with a staff membership at this school."""
    if is_admin(request.user):
        return True
    from services.core.tenants.models import TenantMembership

    school = _school(request)
    return bool(school) and TenantMembership.objects.filter(user=request.user, school=school, role='staff', is_active=True).exists()


def settings_for(school) -> CafeteriaSettings:
    if school is None:
        return CafeteriaSettings()
    obj, _ = CafeteriaSettings.all_objects.get_or_create(tenant=school)
    return obj


def account_for(student) -> Account:
    a = Account.all_objects.filter(student=student).first()
    if a is None:
        a = Account.all_objects.create(tenant=student.tenant, student=student)
    return a


# ---------------------------------------------------------------------------
# Money in and out (everything goes through here)
# ---------------------------------------------------------------------------

def _tell_family(student, title, message):
    from services.core.user_notifications.utils import create_user_notification, get_user_by_email
    from services.education.attendance.register import _recipients

    _, users = _recipients(student)
    users = list(users)
    own = get_user_by_email(student.email)
    if own and own not in users:
        users.append(own)
    for u in users:
        create_user_notification(u, title, message, 'finance')


def post(account: Account, kind: str, amount: Decimal, *, by=None, **extra) -> Transaction:
    """Add (positive) or take (negative) money; keeps the balance and warns the family once when it runs low."""
    cfg = settings_for(account.tenant)
    with transaction.atomic():
        a = Account.objects.select_for_update().select_related('student').get(pk=account.pk)
        a.balance += amount
        was = a.low_alert_sent
        low = a.balance <= cfg.low_balance_level
        a.low_alert_sent = low and (was or amount < 0)
        a.save(update_fields=['balance', 'low_alert_sent', 'updated_at'])
        t = Transaction.objects.create(tenant=a.tenant, account=a, kind=kind, amount=amount, balance_after=a.balance, by=by, **extra)
    if a.low_alert_sent and not was:
        _tell_family(a.student, 'Cafeteria balance is low',
                     f"{a.student.full_name}'s cafeteria balance is {_n(a.balance)}. Please top it up.")
    return t


def _spent_today(account, day=None):
    day = day or timezone.localdate()
    total = Transaction.objects.filter(account=account, at__date=day, kind__in=('purchase', 'refund')).aggregate(s=Sum('amount'))['s']
    return -(total or Decimal('0'))


def _active_plans(student, day=None):
    day = day or timezone.localdate()
    return MealPlanMember.objects.filter(student=student, start_date__lte=day, plan__is_active=True) \
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=day)).select_related('plan')


def _allergy_text(student):
    h = getattr(student, 'health', None)
    if h is None:
        return '', '', False
    return (h.allergies or ''), (h.dietary_restrictions or ''), h.has_severe_allergy


def _clashes(student, items):
    """Food items whose allergens appear in the student's recorded allergies."""
    text, _, _ = _allergy_text(student)
    text = text.lower()
    if not text.strip():
        return []
    return [f'{i.name}: {a}' for i in items for a in i.allergen_list() if a and a in text]


# ---------------------------------------------------------------------------
# Payloads
# ---------------------------------------------------------------------------

def _item_payload(i: FoodItem) -> dict:
    return {**{f: (_n(getattr(i, f)) if f == 'price' else getattr(i, f)) for f in ITEM_FIELDS}, 'id': str(i.id),
            'category_label': i.get_category_display(), 'allergen_list': i.allergen_list()}


def _txn_payload(t: Transaction) -> dict:
    return {'id': str(t.id), 'kind': t.kind, 'kind_label': t.get_kind_display(), 'amount': _n(t.amount),
            'balance_after': _n(t.balance_after), 'items': t.items, 'method': t.method, 'meal': t.meal, 'note': t.note,
            'refunded': t.refunds.exists() if t.kind == 'purchase' else False,
            'student': {'id': str(t.account.student_id), 'full_name': t.account.student.full_name},
            'by': (t.by.full_name or t.by.email) if t.by_id else '', 'at': t.at.isoformat()}


def _account_payload(a: Account, cfg=None, day=None, with_history=False) -> dict:
    cfg = cfg or settings_for(a.tenant)
    day = day or timezone.localdate()
    s = a.student
    allergies, diet, severe = _allergy_text(s)
    limit = a.daily_limit if a.daily_limit is not None else cfg.default_daily_limit
    spent = _spent_today(a, day)
    plans = []
    for m in _active_plans(s, day):
        served = Transaction.objects.filter(account=a, kind='meal_plan', meal=m.plan.meal, at__date=day).exists()
        plans.append({'id': str(m.plan_id), 'member_id': str(m.id), 'name': m.plan.name, 'meal': m.plan.meal, 'served_today': served})
    out = {'id': str(a.id), 'student': {'id': str(s.id), 'full_name': s.full_name, 'student_id': s.student_id,
                                        'class_name': s.current_class.name if s.current_class_id else ''},
           'balance': _n(a.balance), 'daily_limit': _n(limit), 'own_limit': a.daily_limit is not None,
           'spent_today': _n(spent), 'left_today': _n(max(limit - spent, Decimal('0'))) if limit is not None else None,
           'is_blocked': a.is_blocked, 'low': a.balance <= cfg.low_balance_level,
           'allergies': allergies, 'dietary_restrictions': diet, 'severe_allergy': severe, 'meal_plans': plans,
           'pending_top_ups': [{'id': str(r.id), 'amount': _n(r.amount), 'invoice_number': r.invoice.invoice_number if r.invoice_id else None}
                               for r in a.top_up_requests.filter(status='pending').select_related('invoice')]}
    if with_history:
        out['transactions'] = [_txn_payload(t) for t in a.transactions.select_related('account__student', 'by')[:60]]
    return out


def _menu_payload(m: MenuDay) -> dict:
    return {'id': str(m.id), 'date': m.date.isoformat(), 'meal': m.meal, 'meal_label': m.get_meal_display(), 'note': m.note,
            'items': [_item_payload(i) for i in m.items.all()]}


# ---------------------------------------------------------------------------
# Settings, food, menu, meal plans (office)
# ---------------------------------------------------------------------------

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def cafeteria_settings(request):
    cfg = settings_for(_school(request))
    if request.method == 'PATCH':
        if not _office(request):
            return _err('Only the office can change cafeteria rules.', 403)
        try:
            for f in SETTINGS_FIELDS:
                if f in request.data:
                    setattr(cfg, f, _money(request.data[f], f.replace('_', ' ').capitalize(), blank_ok=(f == 'default_daily_limit')))
        except Refused as exc:
            return _err(str(exc))
        cfg.save()
    return Response({f: _n(getattr(cfg, f)) for f in SETTINGS_FIELDS})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def items(request):
    if request.method == 'GET':
        qs = FoodItem.objects.all()
        if request.query_params.get('available') in ('1', 'true'):
            qs = qs.filter(is_available=True)
        return Response([_item_payload(i) for i in qs])
    if not _office(request):
        return _err('Only the office can change the food list.', 403)
    return _save_item(request, FoodItem(tenant=_school(request)), 201)


def _save_item(request, i, code):
    try:
        for f in ITEM_FIELDS:
            if f not in request.data:
                continue
            v = request.data[f]
            if f == 'price':
                v = _money(v, 'Price')
            elif f.startswith('is_'):
                v = str(v).lower() in ('1', 'true', 'yes', 'on')
            elif f == 'category':
                if v not in dict(FoodItem.CATEGORIES):
                    continue
            else:
                v = str(v or '').strip()[:255]
            setattr(i, f, v)
        if not i.name:
            raise Refused('A food item needs a name.')
        if i.price is None:
            raise Refused('A food item needs a price.')
    except Refused as exc:
        return _err(str(exc))
    i.save()
    return Response(_item_payload(i), status=code)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def item_detail(request, item_id):
    if not _office(request):
        return _err('Only the office can change the food list.', 403)
    i = get_object_or_404(FoodItem, pk=item_id)
    if request.method == 'DELETE':
        i.delete()  # past sales keep their own copy of the name and price
        return Response(status=204)
    return _save_item(request, i, 200)


def _week(value):
    d = date.fromisoformat(value) if value else timezone.localdate()
    return d - timedelta(days=d.weekday())


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def menu(request):
    """GET ?week=YYYY-MM-DD (any day of the week): the week's menu. PUT {date, meal, item_ids, note}: set one meal."""
    if request.method == 'GET':
        start = _week(request.query_params.get('week'))
        days = MenuDay.objects.filter(date__range=(start, start + timedelta(days=6))).prefetch_related('items')
        return Response({'week': start.isoformat(), 'days': [_menu_payload(m) for m in days]})
    if not _office(request):
        return _err('Only the office can change the menu.', 403)
    try:
        day = date.fromisoformat(str(request.data.get('date')))
    except ValueError:
        return _err('Choose a date.')
    meal = request.data.get('meal') if request.data.get('meal') in dict(MenuDay.MEALS) else 'lunch'
    ids = request.data.get('item_ids') or []
    m, _ = MenuDay.objects.get_or_create(date=day, meal=meal, defaults={'tenant': _school(request)})
    m.items.set(FoodItem.objects.filter(id__in=ids))
    m.note = str(request.data.get('note') or '')[:255]
    m.save()
    if not ids and not m.note:
        m.delete()
        return Response(status=204)
    return Response(_menu_payload(m))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def copy_menu(request):
    """{from_week, to_week}: copy one week's menu onto another (replacing it)."""
    if not _office(request):
        return _err('Only the office can change the menu.', 403)
    src, dst = _week(request.data.get('from_week')), _week(request.data.get('to_week'))
    if src == dst:
        return _err('Choose a different week to copy to.')
    with transaction.atomic():
        MenuDay.objects.filter(date__range=(dst, dst + timedelta(days=6))).delete()
        n = 0
        for m in MenuDay.objects.filter(date__range=(src, src + timedelta(days=6))).prefetch_related('items'):
            new = MenuDay.objects.create(tenant=m.tenant, date=dst + (m.date - src), meal=m.meal, note=m.note)
            new.items.set(m.items.all())
            n += 1
    return Response({'copied': n, 'week': dst.isoformat()})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def plans(request):
    if not _office(request):
        return _err('Only the office can manage meal plans.', 403)
    if request.method == 'POST':
        try:
            p = MealPlan(tenant=_school(request), name=str(request.data.get('name') or '').strip()[:120],
                         meal=request.data.get('meal') if request.data.get('meal') in dict(MenuDay.MEALS) else 'lunch',
                         monthly_fee=_money(request.data.get('monthly_fee'), 'Monthly fee'),
                         description=str(request.data.get('description') or '')[:255])
        except Refused as exc:
            return _err(str(exc))
        if not p.name:
            return _err('A meal plan needs a name.')
        p.save()
    day = timezone.localdate()
    out = []
    for p in MealPlan.objects.all():
        members = [m for m in p.members.select_related('student__current_class') if m.start_date <= day and (m.end_date is None or m.end_date >= day)]
        out.append({'id': str(p.id), 'name': p.name, 'meal': p.meal, 'monthly_fee': _n(p.monthly_fee), 'description': p.description,
                    'is_active': p.is_active,
                    'members': [{'id': str(m.id), 'student': {'id': str(m.student_id), 'full_name': m.student.full_name,
                                                              'class_name': m.student.current_class.name if m.student.current_class_id else ''},
                                 'start_date': m.start_date.isoformat()} for m in members]})
    return Response(out, status=201 if request.method == 'POST' else 200)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def plan_detail(request, plan_id):
    if not _office(request):
        return _err('Only the office can manage meal plans.', 403)
    p = get_object_or_404(MealPlan, pk=plan_id)
    if request.method == 'DELETE':
        if p.members.exists():
            p.is_active = False
            p.save(update_fields=['is_active'])
            return Response({'id': str(p.id), 'is_active': False})
        p.delete()
        return Response(status=204)
    try:
        if 'name' in request.data:
            p.name = str(request.data['name']).strip()[:120] or p.name
        if 'monthly_fee' in request.data:
            p.monthly_fee = _money(request.data['monthly_fee'], 'Monthly fee')
        if 'is_active' in request.data:
            p.is_active = str(request.data['is_active']).lower() in ('1', 'true', 'yes', 'on')
        if 'description' in request.data:
            p.description = str(request.data['description'] or '')[:255]
    except Refused as exc:
        return _err(str(exc))
    p.save()
    return Response({'id': str(p.id), 'name': p.name, 'monthly_fee': _n(p.monthly_fee), 'is_active': p.is_active})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def plan_members(request, plan_id):
    """POST {student_id, start_date?}: join the plan. DELETE ?student_id=: leave it from today."""
    from services.education.students.models import Student

    if not _office(request):
        return _err('Only the office can manage meal plans.', 403)
    p = get_object_or_404(MealPlan, pk=plan_id)
    sid = request.data.get('student_id') if request.method == 'POST' else request.query_params.get('student_id')
    s = Student.objects.filter(pk=sid, is_active=True).first()
    if s is None:
        return _err('Student not found.', 404)
    day = timezone.localdate()
    current = MealPlanMember.objects.filter(plan=p, student=s).filter(Q(end_date__isnull=True) | Q(end_date__gte=day))
    if request.method == 'DELETE':
        current.update(end_date=day)
        return Response(status=204)
    if current.exists():
        return _err(f'{s.full_name} is already on this plan.')
    try:
        start = date.fromisoformat(str(request.data.get('start_date'))) if request.data.get('start_date') else day
    except ValueError:
        return _err('Choose a valid start date.')
    MealPlanMember.objects.create(tenant=p.tenant, plan=p, student=s, start_date=start)
    account_for(s)
    return Response({'student': s.full_name, 'plan': p.name, 'start_date': start.isoformat()}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def plan_invoices(request):
    """{month: 'YYYY-MM'}: one invoice per student per plan for that month (never twice)."""
    from services.education.finance.models import Invoice

    if not _office(request):
        return _err('Only the office can bill meal plans.', 403)
    try:
        first = date.fromisoformat(f"{request.data.get('month', '')}-01")
    except ValueError:
        return _err('Choose the month, e.g. 2026-10.')
    last = date(first.year + (first.month == 12), first.month % 12 + 1, 1) - timedelta(days=1)
    made = skipped = 0
    for m in MealPlanMember.objects.filter(start_date__lte=last, plan__is_active=True).filter(Q(end_date__isnull=True) | Q(end_date__gte=first)) \
            .select_related('plan', 'student'):
        desc = f'Meal plan – {m.plan.name} – {first:%B %Y}'
        if not m.plan.monthly_fee:
            continue
        if Invoice.objects.filter(student=m.student, invoice_month=first, description=desc).exclude(status='cancelled').exists():
            skipped += 1
            continue
        Invoice.objects.create(student=m.student, invoice_type='miscellaneous', amount=m.plan.monthly_fee, due_date=first.replace(day=10),
                               invoice_month=first, status='issued', description=desc, breakdown={'meal_plan': m.plan.name})
        made += 1
    return Response({'created': made, 'already_billed': skipped, 'month': first.isoformat()[:7]}, status=201)


# ---------------------------------------------------------------------------
# The till
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def till_find(request):
    """?q= name or student number: students with their balance, today's limit, meal plan and allergies."""
    from services.education.students.models import Student

    if not _cashier(request):
        return _err('Only the office or cafeteria staff can use the till.', 403)
    q = (request.query_params.get('q') or '').strip()
    if len(q) < 2:
        return Response([])
    exact = Student.objects.filter(is_active=True, student_id__iexact=q)
    qs = exact if exact.exists() else Student.objects.filter(is_active=True).filter(Q(full_name__icontains=q) | Q(student_id__icontains=q))
    cfg = settings_for(_school(request))
    return Response([_account_payload(account_for(s), cfg) for s in qs.select_related('current_class')[:12]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def till_charge(request):
    """{student_id, items: [{item_id, quantity}], meal_plan?: bool, override_allergy?: bool}."""
    from services.education.students.models import Student

    if not _cashier(request):
        return _err('Only the office or cafeteria staff can use the till.', 403)
    s = Student.objects.filter(pk=request.data.get('student_id'), is_active=True).first()
    if s is None:
        return _err('Student not found.', 404)
    a = account_for(s)
    rows = request.data.get('items') or []
    food = {str(i.id): i for i in FoodItem.objects.filter(id__in=[r.get('item_id') for r in rows])}
    lines, picked = [], []
    for r in rows:
        i = food.get(str(r.get('item_id')))
        try:
            qty = int(r.get('quantity') or 1)
        except (TypeError, ValueError):
            qty = 0
        if i is None or qty < 1:
            return _err('One of the items was not found.')
        if not i.is_available:
            return _err(f'{i.name} is not on sale right now.')
        lines.append({'item_id': str(i.id), 'name': i.name, 'quantity': qty, 'price': str(i.price)})
        picked.append(i)
    if not lines:
        return _err('Choose what the student is having.')
    if a.is_blocked:
        return _err(f"{s.full_name}'s cafeteria account is paused. Please ask the office.")
    clash = _clashes(s, picked)
    if clash and not request.data.get('override_allergy'):
        return _err(f"Allergy warning for {s.full_name}: {'; '.join(clash)}.", 409, allergy=clash)
    day = timezone.localdate()
    note = 'Allergy warning overridden: ' + '; '.join(clash) if clash else ''
    if request.data.get('meal_plan'):
        plan = next((m for m in _active_plans(s, day)), None)
        if plan is None:
            return _err(f'{s.full_name} is not on a meal plan.')
        if Transaction.objects.filter(account=a, kind='meal_plan', meal=plan.plan.meal, at__date=day).exists():
            return _err(f'{s.full_name} has already had today’s {plan.plan.get_meal_display().lower()} on the meal plan.')
        t = post(a, 'meal_plan', Decimal('0'), by=request.user, items=lines, meal=plan.plan.meal, note=note or plan.plan.name)
    else:
        total = sum((Decimal(l['price']) * l['quantity'] for l in lines), Decimal('0'))
        cfg = settings_for(a.tenant)
        limit = a.daily_limit if a.daily_limit is not None else cfg.default_daily_limit
        if limit is not None and _spent_today(a, day) + total > limit:
            return _err(f"That would pass {s.full_name}'s daily limit of {_n(limit)} (spent {_n(_spent_today(a, day))} today).")
        if a.balance - total < -cfg.allow_negative:
            return _err(f"Not enough money: {s.full_name}'s balance is {_n(a.balance)} and this costs {_n(total)}.", balance=_n(a.balance))
        t = post(a, 'purchase', -total, by=request.user, items=lines, note=note)
    a.refresh_from_db()
    t = Transaction.objects.select_related('account__student', 'by').get(pk=t.pk)
    return Response({'transaction': _txn_payload(t), 'account': _account_payload(a)}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_detail(request, student_id):
    from services.education.students.models import Student

    s = get_object_or_404(Student, pk=student_id)
    if not (_cashier(request) or (get_user_role(request.user) in ('parent', 'student') and ensure_student_access(request.user, s))):
        return _err('Account not found.', 404)
    return Response(_account_payload(account_for(s), with_history=True))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def account_action(request, student_id, action):
    """Office: ``top-up`` {amount, method}, ``adjust`` {amount (±), note}, ``block`` {blocked: bool}."""
    from services.education.students.models import Student

    if not _cashier(request):
        return _err('Only the office or cafeteria staff can do this.', 403)
    s = get_object_or_404(Student, pk=student_id)
    a = account_for(s)
    try:
        if action == 'top-up':
            amount = _money(request.data.get('amount'))
            if amount == 0:
                raise Refused('Enter the amount.')
            method = request.data.get('method') if request.data.get('method') in ('cash', 'other') else 'cash'
            post(a, 'top_up', amount, by=request.user, method=method, note=str(request.data.get('note') or '')[:255])
        elif action == 'adjust':
            if not _office(request):
                return _err('Only the office can adjust balances.', 403)
            try:
                amount = Decimal(str(request.data.get('amount'))).quantize(Decimal('0.01'))
            except (InvalidOperation, TypeError):
                raise Refused('Amount must be a number.')
            note = str(request.data.get('note') or '').strip()
            if not amount or not note:
                raise Refused('Enter the amount and a reason.')
            post(a, 'adjustment', amount, by=request.user, note=note[:255])
        elif action == 'block':
            if not _office(request):
                return _err('Only the office can pause accounts.', 403)
            a.is_blocked = str(request.data.get('blocked')).lower() in ('1', 'true', 'yes', 'on')
            a.save(update_fields=['is_blocked'])
        else:
            return _err('Unknown action.', 404)
    except Refused as exc:
        return _err(str(exc))
    a.refresh_from_db()
    return Response(_account_payload(a, with_history=True))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refund(request, transaction_id):
    if not _cashier(request):
        return _err('Only the office or cafeteria staff can refund.', 403)
    t = get_object_or_404(Transaction.objects.select_related('account__student'), pk=transaction_id)
    if t.kind != 'purchase':
        return _err('Only purchases can be refunded.')
    if t.refunds.exists():
        return _err('This purchase has already been refunded.')
    r = post(t.account, 'refund', -t.amount, by=request.user, items=t.items, refund_of=t,
             note=str(request.data.get('note') or 'Refund')[:255])
    return Response(_txn_payload(Transaction.objects.select_related('account__student', 'by').get(pk=r.pk)), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def accounts(request):
    """Office: every account (?low=1 for low balances, ?q=)."""
    from services.education.students.models import Student

    if not _cashier(request):
        return _err('Only the office can see all accounts.', 403)
    cfg = settings_for(_school(request))
    qs = Account.objects.select_related('student__current_class').filter(student__is_active=True)
    if request.query_params.get('q'):
        q = request.query_params['q']
        qs = qs.filter(Q(student__full_name__icontains=q) | Q(student__student_id__icontains=q))
    if request.query_params.get('low') in ('1', 'true'):
        qs = qs.filter(balance__lte=cfg.low_balance_level)
    rows = [_account_payload(a, cfg) for a in qs.order_by('balance')[:300]]
    total = Account.objects.aggregate(s=Sum('balance'))['s'] or Decimal('0')
    return Response({'results': rows, 'total_balance': _n(total)})


# ---------------------------------------------------------------------------
# Families
# ---------------------------------------------------------------------------

def _my_student(request, student_id):
    from services.education.students.models import Student

    s = Student.objects.filter(pk=student_id).first()
    if s is None or get_user_role(request.user) not in ('parent', 'student') or not ensure_student_access(request.user, s):
        return None
    return s


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mine(request):
    from services.education.students.models import Student

    if get_user_role(request.user) not in ('parent', 'student'):
        return Response({'children': [], 'menu': []})
    kids = filter_students_for_user(request.user, Student.objects.filter(is_active=True)).order_by('full_name')
    start = _week(None)
    week = MenuDay.objects.filter(date__range=(start, start + timedelta(days=6))).prefetch_related('items')
    return Response({'children': [_account_payload(account_for(s), with_history=True) for s in kids],
                     'week': start.isoformat(), 'menu': [_menu_payload(m) for m in week],
                     'can_set_limit': get_user_role(request.user) == 'parent'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def family_action(request, student_id, action):
    """Parents: ``limit`` {daily_limit (blank = school default)} or ``top-up`` {amount} (billed as an invoice)."""
    from services.education.finance.models import Invoice

    s = _my_student(request, student_id)
    if s is None or get_user_role(request.user) != 'parent':
        return _err('Only a parent can do this for their own child.', 403)
    a = account_for(s)
    try:
        if action == 'limit':
            a.daily_limit = _money(request.data.get('daily_limit'), 'Daily limit', blank_ok=True)
            a.save(update_fields=['daily_limit'])
        elif action == 'top-up':
            amount = _money(request.data.get('amount'))
            if amount < 1:
                raise Refused('Enter the amount to add.')
            if amount > 100000:
                raise Refused('That is more than can be added at once.')
            today = timezone.localdate()
            with transaction.atomic():
                inv = Invoice.objects.create(student=s, invoice_type='miscellaneous', amount=amount, due_date=today + timedelta(days=3),
                                             invoice_month=today.replace(day=1), status='issued',
                                             description=f'Cafeteria top-up for {s.full_name}', breakdown={'cafeteria_top_up': str(amount)})
                TopUpRequest.objects.create(tenant=a.tenant, account=a, amount=amount, invoice=inv, requested_by=request.user)
        else:
            return _err('Unknown action.', 404)
    except Refused as exc:
        return _err(str(exc))
    a.refresh_from_db()
    return Response(_account_payload(a, with_history=True))


def credit_paid_top_up(invoice) -> bool:
    """Called when an invoice is saved: a paid cafeteria top-up invoice adds its amount to the balance (once)."""
    r = TopUpRequest.all_objects.filter(invoice=invoice, status='pending').select_related('account').first()
    if r is None or invoice.status != 'paid':
        return False
    with transaction.atomic():
        r = TopUpRequest.all_objects.select_for_update().get(pk=r.pk)
        if r.status != 'pending':
            return False
        r.status, r.credited_at = 'credited', timezone.now()
        r.save(update_fields=['status', 'credited_at'])
        post(r.account, 'top_up', r.amount, method='invoice', note=f'Invoice {invoice.invoice_number}')
    _tell_family(r.account.student, 'Cafeteria topped up', f'{_n(r.amount)} was added to {r.account.student.full_name}\'s cafeteria balance.')
    return True


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report(request):
    if not _office(request):
        return _err('Only the office can see cafeteria reports.', 403)
    days = max(min(int(request.query_params.get('days') or 30), 366), 1)
    today = timezone.localdate()
    since = today - timedelta(days=days - 1)
    txns = list(Transaction.objects.filter(at__date__gte=since).select_related('account__student'))
    sales = [t for t in txns if t.kind in ('purchase', 'refund')]
    by_day = defaultdict(lambda: Decimal('0'))
    item_count, item_value = Counter(), defaultdict(lambda: Decimal('0'))
    for t in sales:
        by_day[timezone.localtime(t.at).date().isoformat()] += -t.amount
        sign = 1 if t.kind == 'purchase' else -1
        for l in t.items:
            item_count[l['name']] += sign * int(l['quantity'])
            item_value[l['name']] += sign * Decimal(l['price']) * int(l['quantity'])
    cfg = settings_for(_school(request))
    top_ups = Counter()
    for t in txns:
        if t.kind == 'top_up':
            top_ups[t.get_method_display() or 'Other'] += t.amount
    return Response({
        'days': days,
        'sales': _n(sum((-t.amount for t in sales), Decimal('0'))),
        'transactions': sum(1 for t in txns if t.kind == 'purchase'),
        'meal_plan_meals': sum(1 for t in txns if t.kind == 'meal_plan'),
        'by_day': [{'date': d, 'sales': _n(v)} for d, v in sorted(by_day.items())],
        'top_items': [{'name': n, 'quantity': q, 'value': _n(item_value[n])} for n, q in item_count.most_common(10) if q > 0],
        'top_ups': [{'method': k, 'amount': _n(v)} for k, v in top_ups.items()],
        'balances_held': _n(Account.objects.aggregate(s=Sum('balance'))['s'] or Decimal('0')),
        'low_balances': Account.objects.filter(balance__lte=cfg.low_balance_level, student__is_active=True).count(),
        'below_zero': Account.objects.filter(balance__lt=0).count(),
        'meal_plan_members': MealPlanMember.objects.filter(start_date__lte=today, plan__is_active=True)
            .filter(Q(end_date__isnull=True) | Q(end_date__gte=today)).count(),
    })
