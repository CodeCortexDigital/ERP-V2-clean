"""The school's security rules and the sign-in bookkeeping behind them.

Rules live in ``School.settings_json['security']``; anything a school never set falls back to DEFAULTS.
"""
from __future__ import annotations

import time
from datetime import timedelta

from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone

DEFAULTS = {
    'lockout_attempts': 5,      # wrong passwords in a row before the account is blocked for a while
    'lockout_minutes': 15,
    'password_min_length': 8,
    'idle_minutes': 0,          # sign out after this long without activity (0 = never)
    'activity_days': 365,       # how long the activity log is kept
    'sign_in_days': 180,        # how long sign-in history is kept
}
LIMITS = {
    'lockout_attempts': (3, 20),
    'lockout_minutes': (1, 1440),
    'password_min_length': (8, 64),
    'idle_minutes': (0, 480),
    'activity_days': (30, 3650),
    'sign_in_days': (30, 3650),
}


def security_settings(school) -> dict:
    saved = ((getattr(school, 'settings_json', None) or {}).get('security') or {}) if school else {}
    out = dict(DEFAULTS)
    for key, value in saved.items():
        if key in DEFAULTS:
            try:
                out[key] = int(value)
            except (TypeError, ValueError):
                pass
    return out


def save_settings(school, patch: dict) -> tuple[dict | None, str | None]:
    """Validate and store a partial update. Returns (settings, None) or (None, error)."""
    current = security_settings(school)
    for key, value in (patch or {}).items():
        if key not in DEFAULTS:
            continue
        try:
            value = int(value)
        except (TypeError, ValueError):
            return None, f'{key} must be a whole number.'
        low, high = LIMITS[key]
        if not (low <= value <= high):
            return None, f'{key} must be between {low} and {high}.'
        current[key] = value
    data = dict(school.settings_json or {})
    data['security'] = current
    school.settings_json = data
    school.save(update_fields=['settings_json'])
    return current, None


def client_ip(request) -> str | None:
    forwarded = (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')[0].strip()
    return forwarded or request.META.get('REMOTE_ADDR') or None


def user_school(user):
    if user is None:
        return None
    from services.core.tenants.context import use_tenant
    from services.core.tenants.utils import resolve_tenant_for_user

    with use_tenant(None):
        return resolve_tenant_for_user(user) if getattr(user, 'is_authenticated', False) else None


def record_sign_in(request, *, email: str, outcome: str, user=None, method: str = 'password', school=None):
    from .models import SignInEvent

    try:
        SignInEvent.objects.create(
            school=school if school is not None else user_school(user),
            user=user, email=(email or '')[:255], outcome=outcome, method=method,
            ip_address=client_ip(request), user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:300],
        )
    except Exception:  # bookkeeping must never stop a sign-in
        pass


def locked_minutes(user) -> int:
    until = getattr(user, 'account_locked_until', None)
    if until and until > timezone.now():
        return max(1, int((until - timezone.now()).total_seconds() // 60) + 1)
    return 0


def failed_attempt(user, school) -> bool:
    """Count a wrong password. Returns True when this attempt blocks the account."""
    rules = security_settings(school)
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    locked = user.failed_login_attempts >= rules['lockout_attempts']
    if locked:
        user.account_locked_until = timezone.now() + timedelta(minutes=rules['lockout_minutes'])
        user.account_lock_reason = 'Too many wrong passwords'
        user.failed_login_attempts = 0
    user.save(update_fields=['failed_login_attempts', 'account_locked_until', 'account_lock_reason'])
    return locked


def unlock(user):
    user.account_locked_until = None
    user.account_lock_reason = ''
    user.failed_login_attempts = 0
    user.save(update_fields=['failed_login_attempts', 'account_locked_until', 'account_lock_reason'])


def successful_sign_in(request, user, *, method: str = 'password'):
    changed = []
    if user.failed_login_attempts or user.account_locked_until:
        user.failed_login_attempts, user.account_locked_until, user.account_lock_reason = 0, None, ''
        changed += ['failed_login_attempts', 'account_locked_until', 'account_lock_reason']
    ip = client_ip(request)
    if ip and ip != user.last_login_ip:
        user.last_login_ip = ip
        changed.append('last_login_ip')
    if changed:
        user.save(update_fields=changed)
    update_last_login(None, user)
    record_sign_in(request, email=user.email, outcome='success', user=user, method=method)


def revoke_sessions(user):
    """Sign the person out everywhere: tokens issued before now stop working."""
    meta = dict(user.metadata or {})
    meta['sessions_revoked_at'] = int(time.time())
    user.metadata = meta
    user.save(update_fields=['metadata'])
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

        for token in OutstandingToken.objects.filter(user=user).exclude(blacklistedtoken__isnull=False):
            BlacklistedToken.objects.get_or_create(token=token)
    except Exception:
        pass


def sessions_revoked_at(user) -> int | None:
    value = (getattr(user, 'metadata', None) or {}).get('sessions_revoked_at')
    try:
        return int(value) if value else None
    except (TypeError, ValueError):
        return None


def password_problems(password: str, user=None, school=None) -> list[str]:
    problems = []
    minimum = security_settings(school if school is not None else user_school(user))['password_min_length']
    if len(password or '') < minimum:
        problems.append(f'Use at least {minimum} characters.')
    try:
        validate_password(password or '', user)
    except ValidationError as exc:
        problems += [m for m in exc.messages if 'too short' not in m]
    return problems
