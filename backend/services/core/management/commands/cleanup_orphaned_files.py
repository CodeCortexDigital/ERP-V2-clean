"""
Remove objects in storage that have no StoredFile row (and optional unreferenced keys).
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from services.core.storage.backends import get_storage_for_bucket
from services.core.storage.models import StoredFile


class Command(BaseCommand):
    help = 'Delete orphaned files in object storage (no database reference)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--bucket',
            choices=['media', 'reports', 'public'],
            default='media',
        )
        parser.add_argument('--prefix', default='tenant/')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        bucket = options['bucket']
        prefix = options['prefix']
        dry_run = options['dry_run']
        storage = get_storage_for_bucket(bucket)

        if not hasattr(storage, 'listdir'):
            self.stdout.write(
                self.style.WARNING(
                    'Filesystem storage: scanning MEDIA_ROOT is not implemented. '
                    'Use S3/R2 for full orphan detection.'
                )
            )
            return self._cleanup_db_orphans(dry_run)

        removed = 0
        try:
            dirs, files = storage.listdir(prefix)
            keys = [f'{prefix}{name}' for name in files]
            for subdir in dirs:
                _, subfiles = storage.listdir(f'{prefix}{subdir}/')
                keys.extend(f'{prefix}{subdir}/{name}' for name in subfiles)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f'List failed: {exc}'))
            return

        known = set(StoredFile.objects.filter(bucket_type=bucket).values_list('storage_key', flat=True))
        for key in keys:
            if key in known or '/temp/' in key:
                continue
            if dry_run:
                self.stdout.write(f'Would delete: {key}')
            else:
                storage.delete(key)
            removed += 1

        self.stdout.write(self.style.SUCCESS(f'Orphan cleanup ({bucket}): {removed} files'))

    def _cleanup_db_orphans(self, dry_run: bool) -> None:
        """Remove StoredFile rows whose object no longer exists."""
        removed = 0
        for record in StoredFile.objects.iterator():
            storage = get_storage_for_bucket(record.bucket_type)
            if not storage.exists(record.storage_key):
                if dry_run:
                    self.stdout.write(f'Would delete DB row: {record.storage_key}')
                else:
                    record.delete()
                removed += 1
        self.stdout.write(self.style.SUCCESS(f'DB orphan rows: {removed}'))
