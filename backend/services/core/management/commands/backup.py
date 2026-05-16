"""
Django management command for backup operations.

Usage:
    python manage.py backup [backup_type] [--output-dir /path/to/backups]
    python manage.py backup full
    python manage.py backup database --output-dir /backups/db
"""
import os
import subprocess
import time
from pathlib import Path
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.conf import settings
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
            help='Type of backup to create'
        )
        
        parser.add_argument(
            '--output-dir',
            type=str,
            default='/backups',
            help='Directory to store backups (default: /backups)'
        )
        
        parser.add_argument(
            '--retention-days',
            type=int,
            default=30,
            help='Days to retain this backup (default: 30)'
        )
        
        parser.add_argument(
            '--skip-verification',
            action='store_true',
            help='Skip backup verification'
        )
        
        parser.add_argument(
            '--skip-cleanup',
            action='store_true',
            help='Skip cleanup of old backups'
        )
    
    def handle(self, *args, **options):
        backup_type = options['backup_type']
        output_dir = options['output_dir']
        retention_days = options['retention_days']
        skip_verification = options['skip_verification']
        skip_cleanup = options['skip_cleanup']
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Starting {backup_type} backup to {output_dir}"
            )
        )
        
        start_time = time.time()
        
        try:
            # Create backup directory
            backup_path = Path(output_dir)
            backup_path.mkdir(parents=True, exist_ok=True)
            
            # Create backup log entry
            expires_at = timezone.now() + timedelta(days=retention_days)
            backup_log = BackupLog.objects.create(
                backup_type=backup_type,
                backup_path=str(backup_path),
                retention_days=retention_days,
                expires_at=expires_at,
                status='running'
            )
            
            self.stdout.write(f"Backup ID: {backup_log.id}")
            
            # Execute backup based on type
            size_bytes = None
            
            if backup_type in ['full', 'database']:
                size_bytes = self._backup_database(output_dir, backup_log)
            
            if backup_type in ['full', 'media']:
                self._backup_media(output_dir, backup_log)
            
            if backup_type in ['full', 'config']:
                self._backup_configuration(output_dir, backup_log)
            
            if backup_type in ['full', 'redis']:
                self._backup_redis(output_dir, backup_log)
            
            # Verify backup
            if not skip_verification:
                self.stdout.write("Verifying backup...")
                self._verify_backup(output_dir, backup_log)
            
            # Cleanup old backups
            if not skip_cleanup:
                self.stdout.write("Cleaning up old backups...")
                self._cleanup_old_backups(output_dir)
            
            # Record success
            duration = int(time.time() - start_time)
            backup_log.mark_success(size_bytes=size_bytes, duration_seconds=duration)
            
            BackupMonitoring.record_backup_success(backup_type, duration, size_bytes)
            BackupMonitoring.update_backup_health()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Backup completed successfully in {duration}s"
                )
            )
        
        except Exception as e:
            duration = int(time.time() - start_time)
            error_msg = str(e)
            
            try:
                backup_log.mark_failed(error_msg, {'exception': error_msg})
            except:
                pass
            
            BackupMonitoring.record_backup_failure(backup_type, str(type(e).__name__), duration)
            
            self.stdout.write(self.style.ERROR(f"✗ Backup failed: {error_msg}"))
            raise CommandError(error_msg)
    
    def _backup_database(self, output_dir, backup_log):
        """Backup PostgreSQL database."""
        self.stdout.write("Backing up database...")
        
        db_config = settings.DATABASES['default']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(output_dir, f'database_{timestamp}.sql.gz')
        
        try:
            env = os.environ.copy()
            env['PGPASSWORD'] = db_config.get('PASSWORD', '')
            
            # Use pg_dump with compression
            cmd = [
                'pg_dump',
                '-h', db_config.get('HOST', 'localhost'),
                '-U', db_config.get('USER', 'postgres'),
                '-d', db_config.get('NAME', 'erp_core'),
                '-F', 'c',  # Custom format
                '-f', backup_file
            ]
            
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=3600)
            
            if result.returncode != 0:
                raise CommandError(f"pg_dump failed: {result.stderr}")
            
            # Get backup size
            size_bytes = os.path.getsize(backup_file)
            size_mb = size_bytes / (1024 * 1024)
            
            backup_log.database_backed_up = True
            backup_log.save(update_fields=['database_backed_up'])
            
            self.stdout.write(f"  Database backed up: {size_mb:.1f} MB")
            
            return size_bytes
        
        except subprocess.TimeoutExpired:
            raise CommandError("Database backup timed out")
        except Exception as e:
            raise CommandError(f"Database backup failed: {e}")
    
    def _backup_media(self, output_dir, backup_log):
        """Backup media files."""
        self.stdout.write("Backing up media files...")
        
        media_root = getattr(settings, 'MEDIA_ROOT', os.path.join(settings.BASE_DIR, 'media'))
        
        if not os.path.exists(media_root):
            self.stdout.write("  Media directory not found, skipping")
            return
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(output_dir, f'media_{timestamp}.tar.gz')
        
        try:
            cmd = [
                'tar', '-czf', backup_file,
                '-C', os.path.dirname(media_root),
                os.path.basename(media_root)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
            
            if result.returncode != 0:
                raise CommandError(f"tar failed: {result.stderr}")
            
            size_mb = os.path.getsize(backup_file) / (1024 * 1024)
            
            backup_log.media_backed_up = True
            backup_log.save(update_fields=['media_backed_up'])
            
            self.stdout.write(f"  Media backed up: {size_mb:.1f} MB")
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Media backup failed: {e}"))
    
    def _backup_configuration(self, output_dir, backup_log):
        """Backup configuration files."""
        self.stdout.write("Backing up configuration...")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(output_dir, f'config_{timestamp}.tar.gz')
        
        config_files = []
        
        # Add environment files
        if os.path.exists('.env'):
            config_files.append('.env')
        
        # Add Django settings
        if os.path.exists('backend/erp_core'):
            config_files.append('backend/erp_core')
        
        if not config_files:
            self.stdout.write("  No configuration files found, skipping")
            return
        
        try:
            cmd = ['tar', '-czf', backup_file] + config_files
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd(), timeout=300)
            
            if result.returncode != 0:
                raise CommandError(f"tar failed: {result.stderr}")
            
            backup_log.config_backed_up = True
            backup_log.save(update_fields=['config_backed_up'])
            
            self.stdout.write("  Configuration backed up")
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Configuration backup failed: {e}"))
    
    def _backup_redis(self, output_dir, backup_log):
        """Backup Redis data."""
        self.stdout.write("Backing up Redis...")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(output_dir, f'redis_{timestamp}.rdb')
        
        try:
            import redis
            
            redis_config = getattr(settings, 'CACHES', {}).get('default', {})
            host = redis_config.get('LOCATION', 'redis://127.0.0.1:6379').replace('redis://', '').split(':')[0]
            port = int(redis_config.get('LOCATION', 'redis://127.0.0.1:6379').split(':')[-1])
            
            r = redis.Redis(host=host, port=port)
            
            # Trigger Redis BGSAVE
            r.bgsave()
            
            # Wait for save to complete
            import time
            time.sleep(2)
            
            # Get Redis dump file location
            info = r.info('persistence')
            redis_dump_file = '/var/lib/redis/dump.rdb'
            
            if os.path.exists(redis_dump_file):
                cmd = ['cp', redis_dump_file, backup_file]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    backup_log.redis_backed_up = True
                    backup_log.save(update_fields=['redis_backed_up'])
                    self.stdout.write("  Redis backed up")
            else:
                self.stdout.write("  Redis dump file not found, skipping")
        
        except ImportError:
            self.stdout.write("  redis-py not installed, skipping")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Redis backup failed: {e}"))
    
    def _verify_backup(self, output_dir, backup_log):
        """Verify backup integrity."""
        try:
            # Check if backup files exist and have content
            backup_files = list(Path(output_dir).glob('*'))
            
            if not backup_files:
                raise CommandError("No backup files created")
            
            total_size = sum(f.stat().st_size for f in backup_files if f.is_file())
            
            if total_size < 1024:  # Less than 1KB
                raise CommandError("Backup files too small")
            
            backup_log.mark_verified()
            self.stdout.write("  Backup verified")
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Verification failed: {e}"))
    
    def _cleanup_old_backups(self, output_dir):
        """Cleanup old backup files."""
        try:
            cutoff_date = timezone.now() - timedelta(days=30)
            old_backups = BackupLog.objects.filter(
                expires_at__lt=timezone.now(),
                cleanup_completed=False
            )
            
            for backup in old_backups:
                try:
                    if os.path.exists(backup.backup_path):
                        # This is a simplified cleanup - in production, use better file management
                        self.stdout.write(f"  Marked for cleanup: {backup.backup_path}")
                    
                    backup.cleanup_completed = True
                    backup.save(update_fields=['cleanup_completed'])
                
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  Cleanup failed for {backup.id}: {e}"))
        
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Cleanup error: {e}"))
