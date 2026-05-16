"""
Django management command for backup operations.

Usage:
    python manage.py backup
    python manage.py backup database --output-dir /backups
"""
import hashlib
import os
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from services.core.backup.models import BackupLog
from services.core.backup.monitoring import BackupMonitoring


class Command(BaseCommand):
    help = 'Backup database, media files, Redis, and configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_type',
            nargs='?',
            default='full',
            choices=['full', 'database', 'media', 'config', 'redis'],
        )
        parser.add_argument('--output-dir', default=None)
        parser.add_argument('--retention-days', type=int, default=None)
        parser.add_argument('--skip-verification', action='store_true')
        parser.add_argument('--skip-cleanup', action='store_true')
        parser.add_argument('--use-shell-script', action='store_true', help='Delegate to scripts/backup.sh')

    def handle(self, *args, **options):
        backup_type = options['backup_type']
        output_dir = options['output_dir'] or getattr(settings, 'BACKUP_OUTPUT_DIR', '/backups')
        retention_days = options['retention_days'] or getattr(settings, 'BACKUP_RETENTION_DAYS', 30)

        if options['use_shell_script']:
            return self._run_shell_backup(output_dir, retention_days)

        start = time.time()
        BackupMonitoring.record_backup_start(backup_type)
        backup_log = None

        try:
            ts = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            backup_path = Path(output_dir) / f'backup_{ts}'
            backup_path.mkdir(parents=True, exist_ok=True)

            backup_log = BackupLog.objects.create(
                backup_type=backup_type,
                backup_path=str(backup_path),
                retention_days=retention_days,
                expires_at=timezone.now() + timedelta(days=retention_days),
                status='running',
            )

            total_size = 0
            if backup_type in ('full', 'database'):
                total_size += self._backup_database(backup_path, backup_log)
            if backup_type in ('full', 'media'):
                total_size += self._backup_media(backup_path, backup_log)
            if backup_type in ('full', 'config'):
                self._backup_configuration(backup_path, backup_log)
            if backup_type in ('full', 'redis'):
                self._backup_redis(backup_path, backup_log)

            if not options['skip_verification']:
                self._verify_backup(backup_path, backup_log)

            if not options['skip_cleanup']:
                self._cleanup_old_backups(output_dir, retention_days)

            duration = int(time.time() - start)
            backup_log.mark_success(size_bytes=total_size or None, duration_seconds=duration)
            BackupMonitoring.record_backup_success(backup_type, duration, total_size)
            BackupMonitoring.update_disk_space(output_dir)
            self.stdout.write(self.style.SUCCESS(f'Backup OK in {duration}s -> {backup_path}'))
        except Exception as exc:
            duration = int(time.time() - start)
            if backup_log:
                backup_log.mark_failed(str(exc))
            BackupMonitoring.record_backup_failure(backup_type, type(exc).__name__, duration)
            raise CommandError(str(exc)) from exc

    def _run_shell_backup(self, output_dir: str, retention_days: int) -> None:
        script = Path(settings.BASE_DIR).parent / 'scripts' / 'backup.sh'
        if not script.exists():
            raise CommandError(f'Script not found: {script}')
        env = os.environ.copy()
        db = settings.DATABASES['default']
        env.update({
            'DB_NAME': db.get('NAME', ''),
            'DB_USER': db.get('USER', ''),
            'DB_PASSWORD': db.get('PASSWORD', ''),
            'DB_HOST': db.get('HOST', 'localhost'),
            'DB_PORT': str(db.get('PORT', 5432)),
            'MEDIA_ROOT': str(getattr(settings, 'MEDIA_ROOT', '')),
            'AWS_S3_BUCKET': getattr(settings, 'BACKUP_S3_BUCKET', ''),
        })
        result = subprocess.run(['bash', str(script), output_dir, str(retention_days)], env=env)
        if result.returncode != 0:
            raise CommandError('scripts/backup.sh failed')

    def _checksum(self, path: Path) -> str:
        h = hashlib.md5()
        with path.open('rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                h.update(chunk)
        return h.hexdigest()

    def _backup_database(self, backup_path: Path, backup_log: BackupLog) -> int:
        db = settings.DATABASES['default']
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        out = backup_path / f'database_{ts}.sql.gz'
        env = os.environ.copy()
        env['PGPASSWORD'] = db.get('PASSWORD', '')

        dump = subprocess.Popen(
            [
                'pg_dump', '-h', db.get('HOST', 'localhost'),
                '-p', str(db.get('PORT', 5432)),
                '-U', db.get('USER', 'postgres'),
                '-d', db.get('NAME', 'erp_core'),
                '--no-owner', '--no-acl',
            ],
            stdout=subprocess.PIPE,
            env=env,
        )
        with out.open('wb') as gz:
            gzip_proc = subprocess.Popen(['gzip'], stdin=dump.stdout, stdout=gz)
            dump.stdout.close()
            dump.wait()
            gzip_proc.communicate()

        if dump.returncode != 0:
            raise CommandError('pg_dump failed')

        size = out.stat().st_size
        checksum = self._checksum(out)
        backup_log.database_backed_up = True
        backup_log.checksum = checksum
        backup_log.save(update_fields=['database_backed_up', 'checksum'])
        self.stdout.write(f'  Database: {size / (1024 * 1024):.1f} MB (md5:{checksum[:12]}...)')
        return size

    def _backup_media(self, backup_path: Path, backup_log: BackupLog) -> int:
        media_root = Path(getattr(settings, 'MEDIA_ROOT', settings.BASE_DIR / 'media'))
        if not media_root.exists():
            self.stdout.write('  Media: skipped (not found)')
            return 0
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        out = backup_path / f'media_{ts}.tar.gz'
        subprocess.run(
            ['tar', '-czf', str(out), '-C', str(media_root.parent), media_root.name],
            check=True,
            capture_output=True,
        )
        backup_log.media_backed_up = True
        backup_log.save(update_fields=['media_backed_up'])
        return out.stat().st_size

    def _backup_configuration(self, backup_path: Path, backup_log: BackupLog) -> None:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        out = backup_path / f'config_{ts}.tar.gz'
        files = []
        root = Path(settings.BASE_DIR).parent
        for name in ('.env', '.env.production'):
            p = root / name
            if p.exists():
                files.append(str(p.relative_to(root)))
        if not files:
            return
        subprocess.run(['tar', '-czf', str(out), *files], cwd=str(root), check=True)
        backup_log.config_backed_up = True
        backup_log.save(update_fields=['config_backed_up'])

    def _backup_redis(self, backup_path: Path, backup_log: BackupLog) -> None:
        redis_url = getattr(settings, 'REDIS_URL', os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'))
        host = redis_url.replace('redis://', '').split('/')[0].split(':')[0]
        port = redis_url.replace('redis://', '').split('/')[0].split(':')[-1]
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        out = backup_path / f'redis_{ts}.rdb'
        result = subprocess.run(
            ['redis-cli', '-h', host, '-p', port, '--rdb', str(out)],
            capture_output=True,
        )
        if result.returncode == 0:
            backup_log.redis_backed_up = True
            backup_log.save(update_fields=['redis_backed_up'])

    def _verify_backup(self, backup_path: Path, backup_log: BackupLog) -> None:
        total = sum(f.stat().st_size for f in backup_path.iterdir() if f.is_file())
        if total < 1024:
            raise CommandError('Backup verification failed: files too small')
        if backup_log.checksum:
            backup_log.mark_verified(checksum=backup_log.checksum)

    def _cleanup_old_backups(self, output_dir: str, retention_days: int) -> None:
        cutoff = timezone.now() - timedelta(days=retention_days)
        for log in BackupLog.objects.filter(expires_at__lt=cutoff, cleanup_completed=False):
            log.cleanup_completed = True
            log.save(update_fields=['cleanup_completed'])
