"""Subscription rules (P11): trials, usage and limits, plan changes, and what a request may do."""
from __future__ import annotations

from datetime import timedelta

from django.apps import apps
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException

from .models import MODULES, Plan, Subscription, SubscriptionEvent

DEFAULT_TRIAL_PLAN = 'premium'  # a trial shows everything; the school then picks the plan it needs


class BillingBlocked(APIException):
    """402 Payment Required: the school's plan doesn't allow this."""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Your school plan does not allow this.'
    default_code = 'plan'


def subscription_for(school):
    if school is None or not getattr(school, 'pk', None):
        return None
    cached = getattr(school, '_subscription_cache', 'unset')
    if cached != 'unset':
        return cached
    sub = Subscription.objects.select_related('plan', 'pending_plan').filter(school_id=school.pk).first()
    school._subscription_cache = sub
    return sub


def log(school, kind, summary, by=None):
    SubscriptionEvent.objects.create(school=school, kind=kind, summary=summary[:255], by=by if getattr(by, 'pk', None) else None)


def start_trial(school, plan_code=DEFAULT_TRIAL_PLAN, by=None):
    plan = Plan.objects.filter(code=plan_code).first() or Plan.objects.filter(is_public=True, contact_sales=False).first()
    if plan is None:
        return None
    sub, created = Subscription.objects.get_or_create(school=school, defaults={
        'plan': plan, 'status': 'trialing', 'trial_ends_at': timezone.now() + timedelta(days=plan.trial_days)})
    if created:
        log(school, 'trial', f'Free trial of {plan.name} started ({plan.trial_days} days)', by)
    school._subscription_cache = sub
    return sub


# ---- Usage and limits -------------------------------------------------------------------------------------------

def usage(school):
    Student = apps.get_model('education_students', 'Student')
    Teacher = apps.get_model('education_academics', 'Teacher')
    return {
        'students': Student.all_objects.filter(tenant=school, is_active=True, deleted_at__isnull=True).count(),
        'staff': Teacher._base_manager.filter(tenant=school, is_active=True).count(),
    }


LIMIT_WORDS = {'students': ('student_limit', 'students'), 'staff': ('staff_limit', 'staff members')}


def room_left(school, kind):
    """How many more active records the plan allows (None = no limit)."""
    sub = subscription_for(school)
    if sub is None:
        return None
    limit = getattr(sub.plan, LIMIT_WORDS[kind][0])
    if limit is None:
        return None
    return max(0, limit - usage(school)[kind])


def check_limit(school, kind, adding=1):
    left = room_left(school, kind)
    if left is not None and adding > left:
        sub = subscription_for(school)
        limit = getattr(sub.plan, LIMIT_WORDS[kind][0])
        raise BillingBlocked(f'Your {sub.plan.name} plan allows up to {limit} {LIMIT_WORDS[kind][1]}. '
                             f'Upgrade in Settings → Plan & billing to add more.')


def fits(plan, counts):
    """Problems if the school's current numbers don't fit a plan."""
    problems = []
    for kind, (field, words) in LIMIT_WORDS.items():
        limit = getattr(plan, field)
        if limit is not None and counts[kind] > limit:
            problems.append(f'{plan.name} allows {limit} {words}; you have {counts[kind]}')
    return problems


# ---- Plan changes -----------------------------------------------------------------------------------------------

def _rank(plan):
    return (float(plan.price_monthly), len(plan.modules or []), plan.student_limit or 10**9)


def change_plan(sub, plan, cycle, by=None):
    """Upgrade now; downgrade at the end of the paid period (or now, during a trial). Returns a message."""
    if plan.contact_sales:
        raise BillingBlocked(f'{plan.name} is arranged with our team. Contact us and we will set it up.')
    problems = fits(plan, usage(sub.school))
    if problems:
        raise BillingBlocked('This plan is too small for your school: ' + '; '.join(problems) + '.')
    cycle = cycle if cycle in ('monthly', 'yearly') else sub.billing_cycle
    old = sub.plan
    now = timezone.now()
    with transaction.atomic():
        if sub.effective_status(now) == 'trialing' or _rank(plan) >= _rank(old) or sub.current_period_end is None:
            sub.plan, sub.billing_cycle, sub.pending_plan, sub.pending_cycle = plan, cycle, None, ''
            sub.save()
            msg = f'Now on {plan.name} ({cycle}).'
            log(sub.school, 'plan_changed', f'Plan changed from {old.name} to {plan.name} ({cycle})', by)
        else:
            sub.pending_plan, sub.pending_cycle = plan, cycle
            sub.save()
            msg = f'{plan.name} starts on {timezone.localtime(sub.current_period_end):%d %b %Y}, when the current period ends.'
            log(sub.school, 'downgrade_scheduled', f'Change to {plan.name} ({cycle}) scheduled for the end of the period', by)
    return msg


def cancel(sub, by=None):
    sub.cancel_at_period_end = True
    sub.save(update_fields=['cancel_at_period_end', 'updated_at'])
    log(sub.school, 'cancelled', 'Subscription set to end at the end of the current period', by)


def resume(sub, by=None):
    sub.cancel_at_period_end = False
    if sub.status == 'cancelled':
        sub.status = 'active'
    sub.save(update_fields=['cancel_at_period_end', 'status', 'updated_at'])
    log(sub.school, 'resumed', 'Subscription will continue', by)


def renew(sub, by=None, note='', now=None):
    """A paid period starts (payment received, or recorded by the platform owner). Applies any scheduled change."""
    now = now or timezone.now()
    if sub.cancel_at_period_end:
        sub.status, sub.cancel_at_period_end = 'cancelled', False
        sub.save()
        log(sub.school, 'ended', 'Subscription ended as requested', by)
        return sub
    if sub.pending_plan_id:
        sub.plan, sub.billing_cycle = sub.pending_plan, sub.pending_cycle or sub.billing_cycle
        sub.pending_plan, sub.pending_cycle = None, ''
    start = sub.current_period_end if (sub.current_period_end and sub.current_period_end > now) else now
    sub.current_period_start = start
    sub.current_period_end = start + (timedelta(days=365) if sub.billing_cycle == 'yearly' else timedelta(days=30))
    sub.status = 'active'
    sub.save()
    log(sub.school, 'renewed', f'{sub.plan.name} paid until {timezone.localtime(sub.current_period_end):%d %b %Y}' + (f' ({note})' if note else ''), by)
    return sub


# ---- What a request may do --------------------------------------------------------------------------------------

MODULE_PREFIXES = [
    ('library', ('library/',)),
    ('transport', ('transport/',)),
    ('inventory', ('inventory/',)),
    ('cafeteria', ('cafeteria/',)),
    ('reports', ('insights/',)),
    ('integrations', ('integrations/',)),
    ('ai', ('ai/',)),
    ('online_payments', ('finance/payments/session', 'finance/payment-gateways')),
]
# Allowed even when the school is read-only: paying, the plan itself, and personal account safety.
READ_ONLY_WRITES = ('billing/', 'portability/', 'privacy/', 'finance/payments/session', 'finance/payments/webhook', 'security/me/', 'security/2fa/', 'support/', 'auth/logout',
                    'auth/settings/change-password', 'notifications/', 'token/refresh')
SAFE = ('GET', 'HEAD', 'OPTIONS')


def _api_path(path):
    """'/api/v1/auth/library/books/' -> 'library/books/'; keeps 'billing/...', 'auth/logout' recognisable."""
    p = path.split('/api/', 1)[-1]
    for prefix in ('v1/', 'v2/'):
        if p.startswith(prefix):
            p = p[len(prefix):]
    return p


def check_request(request, user, school):
    """Raise BillingBlocked if the school's plan or subscription state doesn't allow this request."""
    if school is None or getattr(user, 'is_superuser', False):
        return
    sub = subscription_for(school)
    if sub is None:  # schools from before plans existed keep working until the platform owner assigns one
        return
    path = _api_path(request.path)
    bare = path[5:] if path.startswith('auth/') else path
    for module, prefixes in MODULE_PREFIXES:
        if any(bare.startswith(p) for p in prefixes) and not sub.has_module(module):
            raise BillingBlocked(f'{MODULES[module]} is not included in your {sub.plan.name} plan. '
                                 f'An administrator can upgrade in Settings → Plan & billing.')
    if request.method not in SAFE and not sub.can_write():
        if not any(path.startswith(p) or bare.startswith(p) for p in READ_ONLY_WRITES):
            state = sub.effective_status()
            reason = 'Your free trial has ended' if sub.status == 'trialing' else \
                'The school account is suspended' if state == 'suspended' else 'The subscription has lapsed'
            raise BillingBlocked(f'{reason}, so the school is read-only: you can view and export, but not add or change. '
                                 f'An administrator can choose a plan in Settings → Plan & billing.')
