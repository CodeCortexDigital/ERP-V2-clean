"""Ensure PostgreSQL range partitions exist for growth tables."""

from django.core.management.base import BaseCommand

from services.core.db.partitioning import ensure_partitions_ahead, is_postgresql


class Command(BaseCommand):
    help = 'Create upcoming monthly/yearly PostgreSQL partitions'

    def add_arguments(self, parser):
        parser.add_argument('--months', type=int, default=3)
        parser.add_argument('--years', type=int, default=2)

    def handle(self, *args, **options):
        if not is_postgresql():
            self.stdout.write(self.style.WARNING('Skipped: not using PostgreSQL'))
            return
        created = ensure_partitions_ahead(
            months_ahead=options['months'],
            years_ahead=options['years'],
        )
        self.stdout.write(self.style.SUCCESS(f'Partitions ready: {created}'))
