"""Publicly known passwords (P7): the demo accounts' passwords are printed in the README and the old versions gave
every account a shared one. On the live site nobody may sign in with them, and nobody may choose them anywhere.
"""
from django.conf import settings
from django.core.exceptions import ValidationError

from services.core.accounts.credentials import LEGACY_DEFAULT_PASSWORDS

DEMO_PASSWORDS = ('Admin@123', 'Teacher@123', 'Parent@123', 'Student@123', 'admin123', 'Password@123', 'password123')
KNOWN = frozenset(p.lower() for p in DEMO_PASSWORDS + tuple(LEGACY_DEFAULT_PASSWORDS))


def is_known(password: str) -> bool:
    return (password or '').strip().lower() in KNOWN


def live() -> bool:
    """The real site (not a developer's computer or staging, where the demo passwords are expected)."""
    return getattr(settings, 'APP_ENV', '') == 'production'


class KnownPasswordValidator:
    """AUTH_PASSWORD_VALIDATORS entry: refuses the demo and old shared passwords."""

    def validate(self, password, user=None):
        if is_known(password):
            raise ValidationError('This password is publicly known (a demo or old default password). Choose another.',
                                  code='password_known_default')

    def get_help_text(self):
        return 'Your password can\'t be a demo or old default password.'


def refuse_on_live(what: str) -> None:
    """Stops demo tooling (seed data, password resets to the demo passwords) from running on the live site."""
    if live():
        from django.core.management.base import CommandError

        raise CommandError(f'Refused: {what} creates accounts with publicly known passwords and must not run on the '
                           f'live site (APP_ENV=production). Run it locally or on staging.')
