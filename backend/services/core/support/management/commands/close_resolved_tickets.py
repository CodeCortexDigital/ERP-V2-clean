"""Daily: close tickets that were resolved a week ago with no further reply (P15)."""
from django.core.management.base import BaseCommand

from services.core.support.service import close_resolved


class Command(BaseCommand):
    help = 'Close support tickets resolved more than a week ago.'

    def handle(self, *args, **opts):
        self.stdout.write(f'Closed {close_resolved()} ticket(s).')
