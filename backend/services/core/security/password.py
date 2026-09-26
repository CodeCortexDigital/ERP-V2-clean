"""Forgotten passwords and email verification (P3)."""
from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.cache import cache
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from . import mailer, policy

RESET_LIMIT = 5  # per email address and per IP address, per hour
VERIFY_SALT = 'email-verification'
VERIFY_DAYS = 3


def app_origin(request) -> str:
    """Where links in emails should point: the app the request came from (if it is ours), else the first known one."""
    from services.education.integrations.api import allowed_origins, safe_origin

    origin = safe_origin(request.headers.get('Origin', '') or (request.data.get('origin') if hasattr(request, 'data') else ''))
    if origin:
        return origin
    known = allowed_origins()
    return known[0] if known else 'http://localhost:5173'


def _limited(key: str) -> bool:
    count = cache.get(key, 0)
    if count >= RESET_LIMIT:
        return True
    cache.set(key, count + 1, 3600)
    return False


def request_reset(request, email: str) -> None:
    """Email a reset link if the account exists. Says nothing about whether it does (the caller answers the same)."""
    email = (email or '').strip().lower()
    ip = policy.client_ip(request) or 'unknown'
    if _limited(f'pwreset:email:{email}') or _limited(f'pwreset:ip:{ip}'):
        return
    user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
    if user is None:
        return
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f'{app_origin(request)}/reset-password?uid={uid}&token={token}'
    school = policy.user_school(user)
    text, html = mailer.layout('Reset your password', [
        f'Hello {user.full_name or ""}'.strip() + ',',
        'Someone (hopefully you) asked to reset the password for this account. Use the button below to choose a new one. '
        'The link works once and expires in a few days.',
        'If you did not ask for this, you can ignore this email; your password stays the same.',
    ], button=('Choose a new password', link), school_name=getattr(school, 'name', ''))
    mailer.send('password_reset', [user.email], 'Reset your password', text, html, school=school)


def user_from_uid(uid: str):
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        return get_user_model().objects.filter(pk=pk, is_active=True).first()
    except Exception:
        return None


def confirm_reset(uid: str, token: str, password: str) -> tuple[bool, str]:
    user = user_from_uid(uid)
    if user is None or not default_token_generator.check_token(user, token):
        return False, 'This reset link is not valid any more. Ask for a new one.'
    problems = policy.password_problems(password, user)
    if problems:
        return False, ' '.join(problems)
    user.set_password(password)
    user.save(update_fields=['password'])
    policy.unlock(user)
    policy.revoke_sessions(user)  # anyone signed in with the old password is signed out
    notify_changed(user)
    return True, 'Your password has been changed. Sign in with the new one.'


def notify_changed(user) -> None:
    school = policy.user_school(user)
    text, html = mailer.layout('Your password was changed', [
        f'The password for {user.email} was just changed.',
        'If this was you, there is nothing to do. If it was not, reset your password straight away with "Forgot password?" '
        'on the sign-in page, and tell the school office.',
    ], school_name=getattr(school, 'name', ''))
    mailer.send('password_changed', [user.email], 'Your password was changed', text, html, school=school)


def send_verification(request, user) -> bool:
    token = signing.TimestampSigner(salt=VERIFY_SALT).sign(f'{user.pk}:{user.email.lower()}')
    link = f'{app_origin(request)}/verify-email?token={token}'
    school = policy.user_school(user)
    text, html = mailer.layout('Confirm your email address', [
        f'Please confirm that {user.email} is your email address, so the school can reach you (for example to reset your password).',
    ], button=('Confirm my email', link), school_name=getattr(school, 'name', ''))
    return mailer.send('verify_email', [user.email], 'Confirm your email address', text, html, school=school)


def confirm_verification(token: str) -> tuple[bool, str]:
    try:
        value = signing.TimestampSigner(salt=VERIFY_SALT).unsign(token, max_age=VERIFY_DAYS * 86400)
    except signing.SignatureExpired:
        return False, 'This link has expired. Send a new one from Account settings.'
    except signing.BadSignature:
        return False, 'This link is not valid.'
    pk, email = value.split(':', 1)
    user = get_user_model().objects.filter(pk=pk).first()
    if user is None or user.email.lower() != email:
        return False, 'This link is for an email address that has since changed.'
    if not user.email_verified:
        user.email_verified = True
        user.save(update_fields=['email_verified'])
    return True, 'Thank you, your email address is confirmed.'
