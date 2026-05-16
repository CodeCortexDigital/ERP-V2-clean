"""Single-tenant restore for row-level multi-tenancy."""
from django.core.management.base import BaseCommand, CommandError

from services.core.backup.tenant_restore import restore_tenant_from_backup


class Command(BaseCommand):
    help = 'Restore a single tenant from a full database backup'

    def add_arguments(self, parser):
        parser.add_argument('tenant_id', help='Tenant UUID')
        parser.add_argument('--backup-file', required=True, help='Path to full .sql.gz backup')
        parser.add_argument('--target-db', help='Target database name')

    def handle(self, *args, **options):
        try:
            result = restore_tenant_from_backup(
                tenant_id=options['tenant_id'],
                backup_path=options['backup_file'],
                target_db=options.get('target_db'),
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

        for key, value in result.items():
            self.stdout.write(f'{key}: {value}')
