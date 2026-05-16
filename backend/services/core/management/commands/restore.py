"""
Django management command for restore operations.

Usage:
    python manage.py restore [backup_id] [--restore-type full|database|media]
    python manage.py restore --list-backups
    python manage.py restore <backup-id> --target-env development
"""
import os
import subprocess
import time
from pathlib import Path
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.conf import settings
from django.db import connections
from services.core.backup.models import BackupLog, BackupRestoreLog
from services.core.backup.monitoring import BackupMonitoring


class Command(BaseCommand):
    help = 'Restore from backup'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'backup_id',
            nargs='?',
            help='Backup ID to restore from'
        )
        
        parser.add_argument(
            '--list-backups',
            action='store_true',
            help='List available backups'
        )
        
        parser.add_argument(
            '--restore-type',
            type=str,
            default='full',
            choices=['full', 'database', 'media', 'config'],
            help='Type of restore (default: full)'
        )
        
        parser.add_argument(
            '--target-env',
            type=str,
            default='development',
            choices=['development', 'staging', 'production'],
            help='Target environment (default: development)'
        )
        
        parser.add_argument(
            '--target-db',
            type=str,
            help='Target database name (for database restore)'
        )
        
        parser.add_argument(
            '--recovery-time',
            type=str,
            help='Recovery time for PITR (format: YYYY-MM-DD HH:MM:SS)'
        )
        
        parser.add_argument(
            '--no-confirmation',
            action='store_true',
            help='Skip confirmation (dangerous!)'
        )
    
    def handle(self, *args, **options):
        if options['list_backups']:
            self._list_backups()
            return
        
        backup_id = options['backup_id']
        if not backup_id:
            self.stdout.write(self.style.ERROR("Backup ID required"))
            self.stdout.write("Use --list-backups to see available backups")
            raise CommandError("Backup ID not specified")
        
        restore_type = options['restore_type']
        target_env = options['target_env']
        target_db = options['target_db']
        recovery_time = options['recovery_time']
        no_confirmation = options['no_confirmation']
        
        # Get backup
        try:
            backup = BackupLog.objects.get(id=backup_id)
        except BackupLog.DoesNotExist:
            raise CommandError(f"Backup not found: {backup_id}")
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Restoring {restore_type} from backup {backup_id}"
            )
        )
        self.stdout.write(f"Backup type: {backup.backup_type}")
        self.stdout.write(f"Backup date: {backup.started_at}")
        self.stdout.write(f"Target environment: {target_env}")
        
        # Confirmation
        if not no_confirmation and target_env == 'production':
            self.stdout.write(
                self.style.WARNING(
                    "\n⚠️  WARNING: You are about to restore to PRODUCTION!"
                )
            )
            response = input("Type 'I understand' to confirm: ")
            
            if response != "I understand":
                raise CommandError("Restore cancelled")
        
        start_time = time.time()
        
        try:
            # Create restore log
            restore_log = BackupRestoreLog.objects.create(
                restore_type=restore_type,
                status='running',
                source_backup=backup,
                recovery_time=recovery_time,
                target_database=target_db or settings.DATABASES['default']['NAME'],
                target_environment=target_env,
                requested_by=os.environ.get('USER', 'system'),
            )
            
            self.stdout.write(f"Restore ID: {restore_log.id}")
            
            # Execute restore based on type
            if restore_type in ['full', 'database']:
                self._restore_database(backup, restore_log, target_db)
            
            if restore_type in ['full', 'media']:
                self._restore_media(backup, restore_log)
            
            if restore_type in ['full', 'config']:
                self._restore_configuration(backup, restore_log)
            
            # Record success
            duration = int(time.time() - start_time)
            restore_log.completed_at = timezone.now()
            restore_log.duration_seconds = duration
            restore_log.status = 'success'
            restore_log.save()
            
            BackupMonitoring.record_restore_success(restore_type, duration)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Restore completed successfully in {duration}s"
                )
            )
            self._show_post_restore_checklist()
        
        except Exception as e:
            duration = int(time.time() - start_time)
            
            try:
                restore_log.status = 'failed'
                restore_log.error_message = str(e)
                restore_log.completed_at = timezone.now()
                restore_log.duration_seconds = duration
                restore_log.save()
            except:
                pass
            
            BackupMonitoring.record_restore_failure(restore_type, duration)
            
            self.stdout.write(self.style.ERROR(f"✗ Restore failed: {e}"))
            raise CommandError(str(e))
    
    def _list_backups(self):
        """List available backups."""
        backups = BackupLog.objects.filter(status='success').order_by('-started_at')[:20]
        
        if not backups:
            self.stdout.write("No backups found")
            return
        
        self.stdout.write("\nAvailable backups:\n")
        
        for i, backup in enumerate(backups, 1):
            size_mb = backup.get_size_mb() or 'Unknown'
            self.stdout.write(
                f"{i}. ID: {backup.id}\n"
                f"   Type: {backup.backup_type}\n"
                f"   Date: {backup.started_at}\n"
                f"   Size: {size_mb} MB\n"
                f"   Status: {backup.status}\n"
            )
    
    def _restore_database(self, backup, restore_log, target_db):
        """Restore PostgreSQL database."""
        self.stdout.write("\nRestoring database...")
        
        db_config = settings.DATABASES['default']
        target_db = target_db or f"{db_config['NAME']}_restored"
        
        # Find database backup file
        backup_dir = Path(backup.backup_path)
        db_backup_files = list(backup_dir.glob('database_*.sql*'))
        
        if not db_backup_files:
            raise CommandError(f"No database backup files found in {backup_dir}")
        
        backup_file = str(db_backup_files[0])
        
        try:
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config.get('PASSWORD', '')
            
            # Create target database
            self.stdout.write(f"  Creating target database: {target_db}")
            
            cmd_create = [
                'psql',
                '-h', db_config.get('HOST', 'localhost'),
                '-U', db_config.get('USER', 'postgres'),
                '-c', f'CREATE DATABASE {target_db};'
            ]
            
            result = subprocess.run(cmd_create, env=env, capture_output=True, text=True)
            
            if result.returncode != 0 and 'already exists' not in result.stderr:
                self.stdout.write(f"  Warning: {result.stderr}")
            
            # Restore from backup
            self.stdout.write(f"  Restoring from {os.path.basename(backup_file)}")
            
            if backup_file.endswith('.gz'):
                # Compressed backup
                cmd_restore = f"zcat {backup_file} | psql -h {db_config.get('HOST', 'localhost')} -U {db_config.get('USER', 'postgres')} -d {target_db}"
                result = subprocess.run(cmd_restore, shell=True, env=env, capture_output=True, text=True, timeout=3600)
            else:
                # Plain SQL backup
                cmd_restore = [
                    'psql',
                    '-h', db_config.get('HOST', 'localhost'),
                    '-U', db_config.get('USER', 'postgres'),
                    '-d', target_db,
                    '-f', backup_file
                ]
                result = subprocess.run(cmd_restore, env=env, capture_output=True, text=True, timeout=3600)
            
            if result.returncode != 0:
                raise CommandError(f"Database restore failed: {result.stderr}")
            
            restore_log.target_database = target_db
            restore_log.save(update_fields=['target_database'])
            
            self.stdout.write(f"  Database restored to: {target_db}")
        
        except subprocess.TimeoutExpired:
            raise CommandError("Database restore timed out")
        except Exception as e:
            raise CommandError(f"Database restore failed: {e}")
    
    def _restore_media(self, backup, restore_log):
        """Restore media files."""
        self.stdout.write("\nRestoring media files...")
        
        media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
        backup_dir = Path(backup.backup_path)
        
        # Find media backup file
        media_backup_files = list(backup_dir.glob('media_*.tar.gz'))
        
        if not media_backup_files:
            self.stdout.write("  No media backup found")
            return
        
        backup_file = str(media_backup_files[0])
        
        try:
            # Backup current media
            if os.path.exists(media_root):
                backup_name = f"{media_root}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                self.stdout.write(f"  Backing up current media to {backup_name}")
                os.rename(media_root, backup_name)
            
            # Extract media backup
            self.stdout.write(f"  Extracting media files from {os.path.basename(backup_file)}")
            
            cmd = ['tar', '-xzf', backup_file, '-C', os.path.dirname(media_root)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                raise CommandError(f"Media restore failed: {result.stderr}")
            
            self.stdout.write("  Media files restored")
        
        except Exception as e:
            raise CommandError(f"Media restore failed: {e}")
    
    def _restore_configuration(self, backup, restore_log):
        """Restore configuration files."""
        self.stdout.write("\nRestoring configuration...")
        
        backup_dir = Path(backup.backup_path)
        config_backup_files = list(backup_dir.glob('config_*.tar.gz'))
        
        if not config_backup_files:
            self.stdout.write("  No configuration backup found")
            return
        
        backup_file = str(config_backup_files[0])
        
        # Extract to temporary directory
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            cmd = ['tar', '-xzf', backup_file, '-C', tmpdir]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise CommandError(f"Configuration extraction failed: {result.stderr}")
            
            self.stdout.write(f"  Configuration extracted to: {tmpdir}")
            self.stdout.write("  ⚠️  Review and manually apply configuration files")
    
    def _show_post_restore_checklist(self):
        """Show post-restore checklist."""
        self.stdout.write(
            self.style.SUCCESS("\n✓ Post-Restore Checklist:\n")
        )
        
        checklist = [
            "[ ] Verify database connections",
            "[ ] Run Django migrations: python manage.py migrate",
            "[ ] Verify data integrity",
            "[ ] Test login functionality",
            "[ ] Check student/teacher data",
            "[ ] Verify attendance records",
            "[ ] Test API endpoints",
            "[ ] Monitor application logs",
            "[ ] Notify stakeholders",
        ]
        
        for item in checklist:
            self.stdout.write(f"  {item}")
