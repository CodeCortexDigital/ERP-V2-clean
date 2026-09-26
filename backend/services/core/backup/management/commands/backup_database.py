"""Daily: an encrypted backup of the whole database, and removal of backups past their retention (P2).
Use --verify to also run the restore test on the new backup (weekly is enough)."""
from django.core.management.base import BaseCommand, CommandError

from services.core.backup import portable


class Command(BaseCommand):
    help = 'Back up the database (encrypted), prune old backups, optionally test restoring it.'

    def add_arguments(self, parser):
        parser.add_argument('--verify', action='store_true', help='Restore the new backup into an empty database and compare.')

    def handle(self, *args, **options):
        log = portable.create(note='scheduled')
        if log.status != 'success':
            raise CommandError(f'Backup failed: {log.error_message}')
        info = portable.notes(log)
        self.stdout.write(self.style.SUCCESS(f"Backup {log.backup_path}: {info.get('records')} records, {log.size_bytes} bytes"
                                             + ('' if portable.durable() else ' (WARNING: not in S3, so not durable on this host)')))
        removed = portable.prune()
        if removed:
            self.stdout.write(f'{removed} old backups removed.')
        if options['verify']:
            result = portable.verify(log)
            if not result['ok']:
                raise CommandError(f"Restore test FAILED: missing {result['missing']}")
            self.stdout.write(self.style.SUCCESS(f"Restore test passed: {result['records']} records of {result['kinds']} kinds."))
