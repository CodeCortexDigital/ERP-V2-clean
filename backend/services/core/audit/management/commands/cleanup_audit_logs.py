from django.core.management.base import BaseCommand
from datetime import timedelta
from django.utils import timezone
from services.core.audit.models import AuditLog


class Command(BaseCommand):
    help = 'Cleanup audit logs older than retention days (default 90)'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=90)

    def handle(self, *args, **options):
        days = options.get('days', 90)
        cutoff = timezone.now() - timedelta(days=days)
        qs = AuditLog.objects.filter(timestamp__lt=cutoff)
        count = qs.count()
        qs.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} audit logs older than {days} days'))
