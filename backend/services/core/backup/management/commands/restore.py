"""
Restore from backup.

Usage:
    python manage.py restore --list-backups
    python manage.py restore <uuid> --restore-type database
    python manage.py restore_tenant <tenant-uuid> --backup-file /backups/db.sql.gz
"""
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from services.core.backup.models import BackupLog, BackupRestoreLog
from services.core.backup.monitoring import BackupMonitoring


class Command(BaseCommand):
    help = 'Restore from backup'

    def add_arguments(self, parser):
        parser.add_argument('backup_id', nargs='?')
        parser.add_argument('--list-backups', action='store_true')
        parser.add_argument('--restore-type', default='full', choices=['full', 'database', 'media', 'config'])
        parser.add_argument('--target-env', default='dev', choices=['dev', 'staging', 'production'])
        parser.add_argument('--target-db')
        parser.add_argument('--recovery-time', help='PITR target: YYYY-MM-DD HH:MM:SS')
        parser.add_argument('--backup-file', help='Direct path to .sql.gz (bypass BackupLog)')
        parser.add_argument('--no-confirmation', action='store_true')

    def handle(self, *args, **options):
        if options['list_backups']:
            self._list_backups()
            return

        backup_file = options.get('backup_file')
        backup = None
        if options.get('backup_id'):
            try:
                backup = BackupLog.objects.get(id=options['backup_id'])
            except BackupLog.DoesNotExist as exc:
                raise CommandError(f'Backup not found: {options["backup_id"]}') from exc
        elif not backup_file:
            raise CommandError('Provide backup_id or --backup-file')

        restore_type = options['restore_type']
        target_env = options['target_env']

        if target_env == 'production' and not options['no_confirmation']:
            if input("Type 'I understand' to restore to PRODUCTION: ") != 'I understand':
                raise CommandError('Restore cancelled')

        start = time.time()
        restore_log = BackupRestoreLog.objects.create(
            restore_type=restore_type if not options.get('recovery_time') else 'pitr',
            status='running',
            source_backup=backup,
            recovery_time=options.get('recovery_time'),
            target_database=options['target_db'] or settings.DATABASES['default']['NAME'],
            target_environment=target_env,
            requested_by=os.environ.get('USER', 'system'),
        )

        try:
            backup_dir = Path(backup.backup_path) if backup else Path(backup_file).parent

            if restore_type in ('full', 'database'):
                self._restore_database(backup_dir, options['target_db'], backup_file)
            if restore_type in ('full', 'media'):
                self._restore_media(backup_dir)
            if restore_type in ('full', 'config'):
                self._restore_configuration(backup_dir)

            duration = int(time.time() - start)
            restore_log.status = 'success'
            restore_log.completed_at = timezone.now()
            restore_log.duration_seconds = duration
            restore_log.save()
            BackupMonitoring.record_restore_success(restore_type, duration)
            self._show_checklist()
        except Exception as exc:
            restore_log.status = 'failed'
            restore_log.error_message = str(exc)
            restore_log.completed_at = timezone.now()
            restore_log.save()
            BackupMonitoring.record_restore_failure(restore_type, int(time.time() - start))
            raise CommandError(str(exc)) from exc

    def _list_backups(self) -> None:
        for i, b in enumerate(BackupLog.objects.filter(status__in=('success', 'verified')).order_by('-started_at')[:20], 1):
            self.stdout.write(f"{i}. {b.id} | {b.backup_type} | {b.started_at} | {b.get_size_mb()} MB")

    def _restore_database(self, backup_dir: Path, target_db: str | None, backup_file: str | None) -> None:
        db = settings.DATABASES['default']
        target_db = target_db or f"{db['NAME']}_restored"
        if backup_file:
            path = Path(backup_file)
        else:
            files = list(backup_dir.glob('database_*.sql.gz')) + list(backup_dir.glob('full_*.sql.gz'))
            if not files:
                raise CommandError(f'No database backup in {backup_dir}')
            path = files[0]

        env = os.environ.copy()
        env['PGPASSWORD'] = db.get('PASSWORD', '')
        host, port, user = db.get('HOST', 'localhost'), str(db.get('PORT', 5432)), db.get('USER', 'postgres')

        subprocess.run(
            ['psql', '-h', host, '-p', port, '-U', user, '-tc', f'DROP DATABASE IF EXISTS {target_db};'],
            env=env, capture_output=True,
        )
        subprocess.run(
            ['psql', '-h', host, '-p', port, '-U', user, '-tc', f'CREATE DATABASE {target_db};'],
            env=env, check=True, capture_output=True,
        )

        with path.open('rb') as fh:
            gunzip = subprocess.Popen(['gunzip', '-c'], stdin=fh, stdout=subprocess.PIPE)
            psql = subprocess.Popen(
                ['psql', '-h', host, '-p', port, '-U', user, '-d', target_db, '-q'],
                stdin=gunzip.stdout, env=env,
            )
            gunzip.stdout.close()
            gunzip.wait()
            psql.communicate()
            if psql.returncode != 0:
                raise CommandError('Database restore failed')

        self.stdout.write(self.style.SUCCESS(f'  Database restored to {target_db}'))

    def _restore_media(self, backup_dir: Path) -> None:
        files = list(backup_dir.glob('media_*.tar.gz'))
        if not files:
            self.stdout.write('  Media: none found')
            return
        media_root = Path(getattr(settings, 'MEDIA_ROOT', settings.BASE_DIR / 'media'))
        if media_root.exists():
            media_root.rename(media_root.with_name(f'{media_root.name}.bak_{datetime.now():%Y%m%d_%H%M%S}'))
        subprocess.run(['tar', '-xzf', str(files[0]), '-C', str(media_root.parent)], check=True)
        self.stdout.write('  Media restored')

    def _restore_configuration(self, backup_dir: Path) -> None:
        files = list(backup_dir.glob('config_*.tar.gz'))
        if not files:
            return
        self.stdout.write(f'  Config extracted — review {files[0]} before applying')

    def _show_checklist(self) -> None:
        self.stdout.write(self.style.SUCCESS('\nPost-restore checklist:'))
        for item in (
            'Run migrations', 'Verify login', 'Check tenant data',
            'Test API /api/v1/health/', 'Resume scheduled backups',
            'See docs/DISASTER_RECOVERY_PLAN.md for failover steps',
        ):
            self.stdout.write(f'  [ ] {item}')
