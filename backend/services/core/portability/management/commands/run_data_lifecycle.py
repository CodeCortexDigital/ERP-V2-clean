"""Daily: carry out school deletions whose date has come and remove expired exports (P13)."""
from django.core.management.base import BaseCommand

from services.core.portability.api import run_due


class Command(BaseCommand):
    help = 'Delete schools scheduled for deletion today and remove expired data exports.'

    def handle(self, *args, **options):
        r = run_due()
        self.stdout.write(self.style.SUCCESS(f"{r['deleted_schools']} schools deleted, {r['expired_exports']} exports removed."))
