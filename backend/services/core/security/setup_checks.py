"""Live-site settings check for the platform owner (P7): are the keys set in the environment, are demo accounts or
publicly known passwords still around, and is anything left over that shouldn't be.
"""
import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from services.core.accounts.permissions import IsPlatformOwner

from .defaults import DEMO_PASSWORDS, KNOWN, live

DEMO_EMAILS = ('admin@code.com', 'teacher@code.com', 'parent@code.com', 'student@code.com', 'admin@example.com')


def _env(name):
    return bool(os.environ.get(name, '').strip())


def _known_password_admins() -> list[str]:
    """Platform owners and staff whose password is a demo one. Slow (password hashing), so kept for an hour."""
    cached = cache.get('setup-checks:known-admins')
    if cached is not None:
        return cached
    User = get_user_model()
    found = []
    candidates = list(DEMO_PASSWORDS) + sorted(KNOWN - {p.lower() for p in DEMO_PASSWORDS})
    for user in User._base_manager.filter(is_active=True, is_superuser=True)[:20]:
        if any(user.check_password(p) for p in candidates):
            found.append(user.email)
    cache.set('setup-checks:known-admins', found, 3600)
    return found


def checks() -> list[dict]:
    User = get_user_model()
    demo = list(User._base_manager.filter(email__in=DEMO_EMAILS, is_active=True).values_list('email', flat=True))
    known_admins = _known_password_admins()
    no_two_step = list(User._base_manager.filter(is_active=True, is_superuser=True, two_factor_enabled=False)
                       .values_list('email', flat=True)[:10])
    rows = [
        ('secret_key', 'Secret key set in the environment', not settings.SECRET_KEY.startswith('django-insecure'),
         'Set SECRET_KEY on Render (a long random value).'),
        ('debug_off', 'Debug mode off', not settings.DEBUG, 'Set DEBUG=False on Render.'),
        ('frontend_origins', 'Web app address set (FRONTEND_ORIGINS)', _env('FRONTEND_ORIGINS'),
         'Set FRONTEND_ORIGINS to the web app address, so only it may call the API.'),
        ('backup_key', 'Own backup encryption key (BACKUP_ENCRYPTION_KEY)', _env('BACKUP_ENCRYPTION_KEY'),
         'Set BACKUP_ENCRYPTION_KEY (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"). '
         'Without it, backups use a key derived from SECRET_KEY.'),
        ('backup_storage', 'Backups stored outside the server (S3)', _env('BACKUP_S3_BUCKET') and _env('AWS_ACCESS_KEY_ID'),
         'Set BACKUP_S3_BUCKET and the AWS keys: the server disk is wiped on every deploy.'),
        ('email', 'Email sending set up', _env('EMAIL_HOST'), 'Set EMAIL_HOST and the email login on Render.'),
        ('alerts', 'Error alert address set', _env('ERROR_ALERT_EMAILS'), 'Set ERROR_ALERT_EMAILS (otherwise alerts go to the platform owners).'),
        ('demo_accounts', 'No demo accounts', not demo,
         f'Switch off or delete the demo accounts: {", ".join(demo)}.' if demo else ''),
        ('known_passwords', 'No platform owner uses a demo password', not known_admins,
         f'Change the password of: {", ".join(known_admins)}.' if known_admins else ''),
        ('owner_two_step', 'Platform owners use two-step sign-in', not no_two_step,
         f'Turn on two-step sign-in (My sign-ins & data): {", ".join(no_two_step)}.' if no_two_step else ''),
        ('admin_password_env', 'First-admin password removed from the environment', not _env('ADMIN_PASSWORD'),
         'ADMIN_PASSWORD is only needed for the very first start; remove it on Render once you have signed in.'),
    ]
    return [{'key': k, 'label': label, 'ok': bool(ok), 'advice': '' if ok else advice} for k, label, ok, advice in rows]


@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def setup_checks(request):
    items = checks()
    return Response({'checks': items, 'failing': sum(not c['ok'] for c in items), 'live': live(),
                     'env': getattr(settings, 'APP_ENV', '')})
