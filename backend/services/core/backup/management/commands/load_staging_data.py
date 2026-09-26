"""Fill the staging site with an anonymised copy of the live data (P5).

    python manage.py load_staging_data                 # uses STAGING_SOURCE_BACKUP (a backup file name, or "latest")
    python manage.py load_staging_data --backup latest
    python manage.py load_staging_data --anonymise-only  # only anonymise the database as it is

Staging needs read access to the backup bucket (BACKUP_S3_BUCKET + AWS keys) and the same BACKUP_ENCRYPTION_KEY as the
live site. With no source set it does nothing, and staging starts with an empty database.
"""
import os
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from services.core.backup import anonymise, portable


class Command(BaseCommand):
    help = 'Replace the staging database with an anonymised copy of a live backup.'

    def add_arguments(self, parser):
        parser.add_argument('--backup', default=os.environ.get('STAGING_SOURCE_BACKUP', ''),
                            help='Backup file name in the backup storage, or "latest".')
        parser.add_argument('--anonymise-only', action='store_true')

    def handle(self, *args, **opts):
        if not anonymise.allowed():
            raise CommandError('Refused: this replaces the whole database. It only runs with APP_ENV=staging.')
        if not opts['anonymise_only']:
            source = opts['backup'].strip()
            if not source:
                self.stdout.write('No STAGING_SOURCE_BACKUP set: staging keeps its current (or empty) database.')
                return
            name = portable.latest_name() if source == 'latest' else source
            self.stdout.write(f'Loading {name} ...')
            raw = portable.read_named(name)
            with tempfile.TemporaryDirectory() as tmp:
                fixture = Path(tmp) / 'backup.json'
                fixture.write_bytes(raw)
                call_command('flush', '--noinput', verbosity=0)
                call_command('loaddata', str(fixture), verbosity=0)
            self.stdout.write(f'Loaded {sum(portable.counts(raw).values())} records.')
        report = anonymise.run()
        for key, n in report.items():
            self.stdout.write(f'  {key}: {n}')
        left = anonymise.leftovers()
        if left:
            raise CommandError(f'Real email addresses are still present: {", ".join(left)}')
        self.stdout.write(self.style.SUCCESS('Anonymised. Sign in with any account email and STAGING_PASSWORD.'))
