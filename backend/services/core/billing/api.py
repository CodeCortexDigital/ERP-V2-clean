"""Plans & billing (P11). /api/v1/billing/"""
from __future__ import annotations

from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin
from services.core.accounts.permissions import IsPlatformOwner
from services.core.tenants.models import School

from . import service
from .models import MODULES, Plan, Subscription, SubscriptionEvent


def _plan(p, counts=None):
    d = {
        'code': p.code, 'name': p.name, 'description': p.description, 'currency': p.currency,
        'price_monthly': float(p.price_monthly), 'price_yearly': float(p.price_yearly),
        'student_limit': p.student_limit, 'staff_limit': p.staff_limit, 'trial_days': p.trial_days,
        'modules': [{'key': k, 'label': MODULES[k], 'included': k in (p.modules or [])} for k in MODULES],
        'contact_sales': p.contact_sales,
    }
    if counts is not None:
        d['fits'] = not service.fits(p, counts)
        d['too_small'] = service.fits(p, counts)
    return d


def _local(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def _subscription(sub, school):
    counts = service.usage(school)
    if sub is None:
        return {'plan': None, 'status': 'legacy', 'status_label': 'No plan (unlimited)', 'usage': counts, 'can_write': True}
    state = sub.effective_status()
    now = timezone.now()
    days_left = None
    if state == 'trialing' and sub.trial_ends_at:
        days_left = max(0, (sub.trial_ends_at - now).days + (1 if (sub.trial_ends_at - now).seconds else 0))
    return {
        'plan': _plan(sub.plan), 'status': state, 'status_label': dict(Subscription.STATUSES).get(state, state),
        'billing_cycle': sub.billing_cycle, 'trial_ends_at': _local(sub.trial_ends_at), 'trial_days_left': days_left,
        'current_period_end': _local(sub.current_period_end), 'cancel_at_period_end': sub.cancel_at_period_end,
        'grace_ends_at': _local(sub.current_period_end + timedelta(days=7)) if state == 'past_due' and sub.current_period_end else None,
        'pending_plan': _plan(sub.pending_plan) if sub.pending_plan_id else None, 'pending_cycle': sub.pending_cycle,
        'usage': counts, 'can_write': sub.can_write(),
        'limits': {'students': sub.plan.student_limit, 'staff': sub.plan.staff_limit},
    }


def _events(school):
    return [{'when': _local(e.created_at), 'summary': e.summary, 'by': (getattr(e.by, 'full_name', '') or getattr(e.by, 'email', '')) if e.by else ''}
            for e in SubscriptionEvent.objects.filter(school=school).select_related('by')[:30]]


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def plans(request):
    """Public price list (signup and pricing pages)."""
    return Response({'plans': [_plan(p) for p in Plan.objects.filter(is_public=True)], 'modules': MODULES})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_subscription(request):
    """Everyone in the school can see which areas are open (menus use it); only admins see prices and history."""
    school = getattr(request, 'tenant', None)
    if school is None:
        return Response({'status': 'none', 'modules': list(MODULES)})
    sub = service.subscription_for(school)
    modules = list(MODULES) if sub is None else list(sub.plan.modules or [])
    base = {'status': sub.effective_status() if sub else 'legacy', 'modules': modules, 'can_write': sub.can_write() if sub else True}
    if not is_admin(request.user):
        return Response(base)
    data = _subscription(sub, school)
    data.update(base)
    data['plans'] = [_plan(p, data['usage']) for p in Plan.objects.filter(is_public=True)]
    data['events'] = _events(school)
    return Response(data)


def _admin_sub(request):
    if not is_admin(request.user):
        return None, Response({'error': 'Only school administrators can change the plan.'}, status=status.HTTP_403_FORBIDDEN)
    school = getattr(request, 'tenant', None)
    sub = service.subscription_for(school)
    if sub is None:
        sub = service.start_trial(school, by=request.user) if school else None
    if sub is None:
        return None, Response({'error': 'No plans are set up yet.'}, status=status.HTTP_400_BAD_REQUEST)
    return sub, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change(request):
    sub, error = _admin_sub(request)
    if error:
        return error
    plan = Plan.objects.filter(code=(request.data or {}).get('plan'), is_public=True).first()
    if plan is None:
        return Response({'error': 'Choose a plan.'}, status=status.HTTP_400_BAD_REQUEST)
    old_plan, old_cycle = sub.plan, sub.billing_cycle
    message = service.change_plan(sub, plan, (request.data or {}).get('cycle'), by=request.user)
    from .invoicing import after_plan_change

    invoice = after_plan_change(sub, old_plan, old_cycle)  # P12: the first period, or the upgrade difference
    if invoice is not None and invoice.status == 'open':
        message += f' Invoice {invoice.number} ({invoice.currency} {invoice.total}) is ready under Invoices.'
    return Response({'message': message, 'subscription': _subscription(sub, sub.school)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel(request):
    sub, error = _admin_sub(request)
    if error:
        return error
    if (request.data or {}).get('resume'):
        service.resume(sub, by=request.user)
        msg = 'Your subscription will continue.'
    else:
        service.cancel(sub, by=request.user)
        end = sub.current_period_end or sub.trial_ends_at
        msg = (f'The subscription ends on {timezone.localtime(end):%d %b %Y}. ' if end else '') + \
              'After that the school becomes read-only; nothing is deleted, and you can export everything.'
    return Response({'message': msg, 'subscription': _subscription(sub, sub.school)})


# ---- Platform owner ---------------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def platform_overview(request):
    subs = {s.school_id: s for s in Subscription.objects.select_related('plan', 'pending_plan')}
    rows = []
    for school in School.objects.order_by('name'):
        sub = subs.get(school.pk)
        d = _subscription(sub, school)
        rows.append({'school_id': str(school.pk), 'name': school.name, 'code': school.tenant_code, 'is_active': school.is_active,
                     'plan': d['plan']['name'] if d['plan'] else None, 'plan_code': d['plan']['code'] if d['plan'] else None,
                     'status': d['status'], 'status_label': d['status_label'], 'usage': d['usage'],
                     'trial_ends_at': d.get('trial_ends_at'), 'current_period_end': d.get('current_period_end'),
                     'billing_cycle': d.get('billing_cycle')})
    return Response({'schools': rows, 'plans': [dict(_plan(p), is_public=p.is_public, sort=p.sort) for p in Plan.objects.all()],
                     'statuses': dict(Subscription.STATUSES)})


@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def platform_school(request, school_id):
    """Set a school's plan and state: {plan, cycle, status, trial_ends_at, renew: true, note}."""
    school = get_object_or_404(School, pk=school_id)
    if request.method == 'GET':
        sub = service.subscription_for(school)
        return Response({'subscription': _subscription(sub, school), 'events': _events(school)})
    d = request.data or {}
    sub = service.subscription_for(school)
    plan = Plan.objects.filter(code=d.get('plan')).first() if d.get('plan') else None
    if sub is None:
        if plan is None:
            return Response({'error': 'Choose a plan.'}, status=status.HTTP_400_BAD_REQUEST)
        sub = service.start_trial(school, plan.code, by=request.user)
    note = (d.get('note') or '').strip()[:120]
    changes = []
    if plan is not None and plan.pk != sub.plan_id:
        changes.append(f'plan {sub.plan.name} → {plan.name}')
        sub.plan, sub.pending_plan = plan, None
    if d.get('cycle') in ('monthly', 'yearly') and d['cycle'] != sub.billing_cycle:
        sub.billing_cycle = d['cycle']
        changes.append(f'billing {d["cycle"]}')
    if d.get('status') in dict(Subscription.STATUSES) and d['status'] != sub.status:
        changes.append(f'status {sub.status} → {d["status"]}')
        sub.status = d['status']
    if d.get('trial_ends_at'):
        day = parse_date(str(d['trial_ends_at']))
        if day is None:
            return Response({'error': 'Trial end must be a date.'}, status=status.HTTP_400_BAD_REQUEST)
        sub.trial_ends_at = timezone.make_aware(timezone.datetime.combine(day, timezone.datetime.max.time()))
        changes.append(f'trial until {day:%d %b %Y}')
    sub.save()
    if changes:
        service.log(school, 'platform', 'Platform owner: ' + ', '.join(changes) + (f' ({note})' if note else ''), request.user)
    if d.get('renew'):
        service.renew(sub, by=request.user, note=note or 'payment recorded by the platform owner')
    school._subscription_cache = 'unset'
    sub = service.subscription_for(school)
    return Response({'subscription': _subscription(sub, school), 'events': _events(school)})


@api_view(['PUT'])
@permission_classes([IsPlatformOwner])
def platform_plan(request, code):
    plan = get_object_or_404(Plan, code=code)
    d = request.data or {}
    for field in ('name', 'description', 'currency'):
        if field in d:
            setattr(plan, field, str(d[field])[:255])
    for field in ('price_monthly', 'price_yearly'):
        if field in d:
            try:
                value = float(d[field])
                assert value >= 0
            except (TypeError, ValueError, AssertionError):
                return Response({'error': f'{field} must be a number of 0 or more.'}, status=status.HTTP_400_BAD_REQUEST)
            setattr(plan, field, value)
    for field in ('student_limit', 'staff_limit'):
        if field in d:
            v = d[field]
            if v in (None, ''):
                setattr(plan, field, None)
            elif str(v).isdigit():
                setattr(plan, field, int(v))
            else:
                return Response({'error': f'{field} must be a whole number or empty for unlimited.'}, status=status.HTTP_400_BAD_REQUEST)
    if 'modules' in d:
        plan.modules = [m for m in d['modules'] if m in MODULES]
    for field in ('is_public', 'contact_sales'):
        if field in d:
            setattr(plan, field, bool(d[field]))
    if 'trial_days' in d and str(d['trial_days']).isdigit():
        plan.trial_days = int(d['trial_days'])
    plan.save()
    return Response(_plan(plan))
