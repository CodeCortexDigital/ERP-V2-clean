"""Report DB connection stats and index usage (PostgreSQL)."""

from django.core.management.base import BaseCommand

from services.core.db.monitoring import analyze_index_usage, get_connection_stats, unused_indexes


class Command(BaseCommand):
    help = 'Show database connection pool stats and index usage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--unused-only',
            action='store_true',
            help='List indexes with zero scans',
        )

    def handle(self, *args, **options):
        stats = get_connection_stats()
        self.stdout.write(self.style.SUCCESS(f'Connections: {stats}'))

        rows = unused_indexes() if options['unused_only'] else analyze_index_usage()
        for row in rows[:50]:
            self.stdout.write(str(row))
        self.stdout.write(self.style.SUCCESS(f'Listed {len(rows)} indexes'))
