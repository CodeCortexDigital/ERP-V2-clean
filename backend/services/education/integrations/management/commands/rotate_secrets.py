"""Re-encrypt every school's saved integration secrets with the current SECRET_KEY (P7, docs/KEY_ROTATION.md).

Run it after setting a new SECRET_KEY with the old one in SECRET_KEY_FALLBACKS; then the old key can be removed.
"""
from cryptography.fernet import InvalidToken
from django.core.management.base import BaseCommand

from services.education.integrations.models import Integration
from services.education.integrations.secrets import reseal


class Command(BaseCommand):
    help = 'Re-encrypt integration secrets with the current SECRET_KEY.'

    def handle(self, *args, **opts):
        done = unreadable = 0
        for row in Integration._base_manager.exclude(secret_blob=''):
            try:
                row.secret_blob = reseal(row.secret_blob)
            except InvalidToken:
                unreadable += 1  # sealed with a key that is no longer listed: the school must enter it again
                continue
            Integration._base_manager.filter(pk=row.pk).update(secret_blob=row.secret_blob)
            done += 1
        self.stdout.write(self.style.SUCCESS(f'Re-encrypted {done} integration(s).'))
        if unreadable:
            self.stdout.write(self.style.WARNING(f'{unreadable} could not be opened with the current or old keys.'))
