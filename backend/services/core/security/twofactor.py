"""Two-step sign-in with an authenticator app (P8): standard 6-digit codes (RFC 6238, the same as Google Authenticator,
Microsoft Authenticator, 1Password...), plus ten one-time recovery codes for a lost phone.

Signing in: after the password (or Google / Microsoft), someone with two-step on gets a short-lived challenge instead
of tokens, and finishes with a code. Required for platform owners on the live site (REQUIRE_2FA_PLATFORM_OWNER) and for
a school's administrators when the school turns it on (Security settings).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import TwoFactor

STEP = 30
DIGITS = 6
ISSUER = 'School ERP'
CHALLENGE_SALT = 'two-factor-login'
CHALLENGE_SECONDS = 300
RECOVERY_COUNT = 10
_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'


# --- codes -----------------------------------------------------------------------------------------------------------
def new_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip('=')


def code_at(secret: str, step: int) -> str:
    key = base64.b32decode(secret + '=' * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack('>Q', step), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(value % 10 ** DIGITS).zfill(DIGITS)


def matching_step(secret: str, code: str, now: float | None = None) -> int | None:
    """The step the code belongs to, allowing one step either side for clock drift."""
    code = ''.join(ch for ch in str(code or '') if ch.isdigit())
    if len(code) != DIGITS:
        return None
    current = int((now if now is not None else time.time()) // STEP)
    for step in (current, current - 1, current + 1):
        if hmac.compare_digest(code_at(secret, step), code):
            return step
    return None


# --- storage ---------------------------------------------------------------------------------------------------------
def _fernet() -> MultiFernet:
    keys = [settings.SECRET_KEY, *getattr(settings, 'SECRET_KEY_FALLBACKS', [])]
    return MultiFernet([Fernet(base64.urlsafe_b64encode(hashlib.sha256(f'{k}:two-factor'.encode()).digest())) for k in keys])


def _seal(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def _open(row: TwoFactor) -> str | None:
    try:
        return _fernet().decrypt(row.secret.encode()).decode()
    except InvalidToken:
        return None


def _hash(code: str) -> str:
    return hashlib.sha256(code.replace('-', '').strip().lower().encode()).hexdigest()


def _new_recovery_codes() -> list[str]:
    return ['-'.join(''.join(secrets.choice(_ALPHABET) for _ in range(5)) for _ in range(2)) for _ in range(RECOVERY_COUNT)]


def enabled(user) -> bool:
    return TwoFactor.objects.filter(user=user, confirmed_at__isnull=False).exists()


def required_for(user, school=None) -> bool:
    if not getattr(user, 'is_authenticated', False):
        return False
    if user.is_superuser:
        default = '1' if getattr(settings, 'APP_ENV', '') == 'production' else '0'
        return os.environ.get('REQUIRE_2FA_PLATFORM_OWNER', default).strip().lower() in ('1', 'true', 'yes')
    from services.core.accounts.decorators import get_user_role

    from .policy import security_settings, user_school

    if not security_settings(school if school is not None else user_school(user)).get('admin_two_factor'):
        return False
    return get_user_role(user) == 'admin'


def status(user) -> dict:
    row = TwoFactor.objects.filter(user=user).first()
    on = bool(row and row.confirmed_at)
    return {'enabled': on, 'since': row.confirmed_at if on else None,
            'recovery_codes_left': len(row.recovery_hashes) if on else 0, 'required': required_for(user)}


def start_setup(user) -> dict:
    """A new secret (not active until confirmed with a code). Returns what the setup screen shows."""
    import segno

    secret = new_secret()
    TwoFactor.objects.update_or_create(user=user, defaults={'secret': _seal(secret), 'confirmed_at': None, 'last_step': 0,
                                                             'recovery_hashes': []})
    user.two_factor_enabled = False
    user.save(update_fields=['two_factor_enabled'])
    label = quote(f'{ISSUER}:{user.email}')
    uri = f'otpauth://totp/{label}?secret={secret}&issuer={quote(ISSUER)}&digits={DIGITS}&period={STEP}'
    return {'secret': ' '.join(secret[i:i + 4] for i in range(0, len(secret), 4)), 'uri': uri,
            'qr': segno.make(uri, error='m').svg_data_uri(scale=5, border=2)}


def confirm(user, code: str) -> list[str] | None:
    """Turns two-step on if the code matches the new secret. Returns the recovery codes (shown once)."""
    row = TwoFactor.objects.filter(user=user, confirmed_at__isnull=True).first()
    secret = _open(row) if row else None
    step = matching_step(secret, code) if secret else None
    if step is None:
        return None
    codes = _new_recovery_codes()
    row.confirmed_at, row.last_step, row.recovery_hashes = timezone.now(), step, [_hash(c) for c in codes]
    row.save()
    user.two_factor_enabled = True
    user.save(update_fields=['two_factor_enabled'])
    return codes


def verify(user, code: str) -> str | None:
    """'code' or 'recovery' when it matches (each works once), else None."""
    row = TwoFactor.objects.filter(user=user, confirmed_at__isnull=False).first()
    if not row:
        return None
    secret = _open(row)
    step = matching_step(secret, code) if secret else None
    if step is not None:
        if step <= row.last_step:
            return None  # already used
        TwoFactor.objects.filter(pk=row.pk).update(last_step=step)
        return 'code'
    hashed = _hash(str(code or ''))
    if hashed in row.recovery_hashes:
        row.recovery_hashes = [h for h in row.recovery_hashes if h != hashed]
        row.save(update_fields=['recovery_hashes', 'updated_at'])
        return 'recovery'
    return None


def new_recovery_codes(user) -> list[str]:
    codes = _new_recovery_codes()
    TwoFactor.objects.filter(user=user).update(recovery_hashes=[_hash(c) for c in codes])
    return codes


def turn_off(user) -> None:
    TwoFactor.objects.filter(user=user).delete()
    if user.two_factor_enabled:
        user.two_factor_enabled = False
        user.save(update_fields=['two_factor_enabled'])


# --- sign-in challenge -----------------------------------------------------------------------------------------------
def challenge(user, method: str) -> str:
    return signing.dumps({'u': str(user.pk), 'm': method, 'n': secrets.token_hex(8)}, salt=CHALLENGE_SALT)


def read_challenge(token: str):
    """(user, method, token id) or None if it is wrong or older than five minutes."""
    try:
        data = signing.loads(token or '', salt=CHALLENGE_SALT, max_age=CHALLENGE_SECONDS)
    except signing.BadSignature:
        return None
    from django.contrib.auth import get_user_model

    user = get_user_model()._base_manager.filter(pk=data.get('u'), is_active=True).first()
    return (user, data.get('m') or 'password', data.get('n', '')) if user else None
