"""
Backup monitoring and Prometheus metrics.

Tracks backup health, age, size, and other metrics for monitoring.
"""
from datetime import datetime, timedelta
from django.utils import timezone
from prometheus_client import Counter, Gauge, Histogram
import logging

logger = logging.getLogger(__name__)

# Prometheus metrics
backup_count = Counter(
    'backup_total',
    'Total number of backups',
    ['backup_type', 'status']
)

backup_duration = Histogram(
    'backup_duration_seconds',
    'Time spent creating backups',
    ['backup_type'],
    buckets=(60, 300, 600, 1800, 3600, 7200)
)

backup_size = Gauge(
    'backup_size_bytes',
    'Size of latest backups',
    ['backup_type']
)

backup_age = Gauge(
    'backup_age_hours',
    'Age of latest backup in hours'
)

backup_success_rate = Gauge(
    'backup_success_rate',
    'Percentage of successful backups (0-100)'
)

backup_failures = Counter(
    'backup_failures_total',
    'Total number of failed backups',
    ['backup_type', 'error_type']
)

restore_duration = Histogram(
    'restore_duration_seconds',
    'Time spent restoring backups',
    ['restore_type'],
    buckets=(60, 300, 600, 1800, 3600, 7200)
)

restore_count = Counter(
    'restore_total',
    'Total number of restore operations',
    ['restore_type', 'status']
)

disk_space_available = Gauge(
    'backup_disk_space_available_bytes',
    'Available disk space for backups'
)

disk_space_usage_percent = Gauge(
    'backup_disk_usage_percent',
    'Percentage of backup disk space used (0-100)'
)


class BackupMonitoring:
    """Monitor backup operations and generate metrics."""
    
    @staticmethod
    def record_backup_start(backup_type):
        """Record start of backup operation."""
        logger.info(f"Backup started: {backup_type}")
    
    @staticmethod
    def record_backup_success(backup_type, duration_seconds, size_bytes):
        """Record successful backup."""
        logger.info(f"Backup completed: {backup_type} ({duration_seconds}s, {size_bytes}B)")
        
        # Record metrics
        backup_count.labels(backup_type=backup_type, status='success').inc()
        backup_duration.labels(backup_type=backup_type).observe(duration_seconds)
        if size_bytes:
            backup_size.labels(backup_type=backup_type).set(size_bytes)
    
    @staticmethod
    def record_backup_failure(backup_type, error_type, duration_seconds):
        """Record failed backup."""
        logger.error(f"Backup failed: {backup_type} ({error_type})")
        
        # Record metrics
        backup_count.labels(backup_type=backup_type, status='failed').inc()
        backup_failures.labels(backup_type=backup_type, error_type=error_type).inc()
        backup_duration.labels(backup_type=backup_type).observe(duration_seconds)
    
    @staticmethod
    def record_restore_success(restore_type, duration_seconds):
        """Record successful restore."""
        logger.info(f"Restore completed: {restore_type} ({duration_seconds}s)")
        
        # Record metrics
        restore_count.labels(restore_type=restore_type, status='success').inc()
        restore_duration.labels(restore_type=restore_type).observe(duration_seconds)
    
    @staticmethod
    def record_restore_failure(restore_type, duration_seconds):
        """Record failed restore."""
        logger.error(f"Restore failed: {restore_type}")
        
        # Record metrics
        restore_count.labels(restore_type=restore_type, status='failed').inc()
        restore_duration.labels(restore_type=restore_type).observe(duration_seconds)
    
    @staticmethod
    def update_backup_health():
        """Update backup health metrics."""
        from .models import BackupLog
        from django.utils import timezone
        
        # Calculate backup age
        latest_backup = BackupLog.objects.filter(
            status='success'
        ).order_by('-started_at').first()
        
        if latest_backup:
            age = timezone.now() - latest_backup.started_at
            age_hours = age.total_seconds() / 3600
            backup_age.set(age_hours)
            
            logger.debug(f"Latest backup age: {age_hours:.1f} hours")
        
        # Calculate success rate (last 30 days)
        cutoff_date = timezone.now() - timedelta(days=30)
        recent_backups = BackupLog.objects.filter(
            started_at__gte=cutoff_date
        )
        
        total = recent_backups.count()
        if total > 0:
            successful = recent_backups.filter(status='success').count()
            success_rate = (successful / total) * 100
            backup_success_rate.set(success_rate)
            
            logger.debug(f"30-day backup success rate: {success_rate:.1f}%")
    
    @staticmethod
    def update_disk_space(backup_dir):
        """Update disk space metrics."""
        import os
        import shutil
        
        try:
            stats = shutil.disk_usage(backup_dir)
            disk_space_available.set(stats.free)
            
            usage_percent = (stats.used / stats.total) * 100 if stats.total > 0 else 0
            disk_space_usage_percent.set(usage_percent)
            
            logger.debug(f"Backup disk usage: {usage_percent:.1f}% ({stats.used / (1024**3):.1f}GB / {stats.total / (1024**3):.1f}GB)")
        except Exception as e:
            logger.error(f"Failed to update disk space metrics: {e}")
    
    @staticmethod
    def check_backup_health_alerts(backup_dir):
        """Check backup health and generate alerts."""
        from .models import BackupLog
        
        alerts = []
        
        # Check backup age
        latest_backup = BackupLog.objects.filter(
            status='success'
        ).order_by('-started_at').first()
        
        if not latest_backup:
            alerts.append("❌ No successful backups found")
        else:
            age = timezone.now() - latest_backup.started_at
            age_hours = age.total_seconds() / 3600
            
            if age_hours > 48:
                alerts.append(f"⚠️ Latest backup is {age_hours:.1f} hours old (expected < 24h)")
            elif age_hours > 24:
                alerts.append(f"⚠️ Latest backup is {age_hours:.1f} hours old")
        
        # Check success rate
        cutoff_date = timezone.now() - timedelta(days=7)
        recent_backups = BackupLog.objects.filter(started_at__gte=cutoff_date)
        total = recent_backups.count()
        
        if total > 0:
            successful = recent_backups.filter(status='success').count()
            success_rate = (successful / total) * 100
            
            if success_rate < 80:
                alerts.append(f"❌ Backup success rate is {success_rate:.0f}% (expected > 90%)")
        
        # Check disk space
        try:
            stats = __import__('shutil').disk_usage(backup_dir)
            usage_percent = (stats.used / stats.total) * 100 if stats.total > 0 else 0
            
            if usage_percent > 90:
                alerts.append(f"❌ Backup disk usage at {usage_percent:.0f}% (critical)")
            elif usage_percent > 75:
                alerts.append(f"⚠️ Backup disk usage at {usage_percent:.0f}%")
        except Exception as e:
            logger.error(f"Failed to check disk space: {e}")
        
        return alerts


class BackupHealthCheck:
    """Health check for backup systems."""
    
    @staticmethod
    def is_healthy(max_age_hours=48):
        """Check if backup system is healthy."""
        from .models import BackupLog
        
        # Check latest backup
        latest_backup = BackupLog.objects.filter(
            status='success'
        ).order_by('-started_at').first()
        
        if not latest_backup:
            return False, "No successful backups found"
        
        age = timezone.now() - latest_backup.started_at
        age_hours = age.total_seconds() / 3600
        
        if age_hours > max_age_hours:
            return False, f"Latest backup is {age_hours:.1f} hours old (max: {max_age_hours}h)"
        
        return True, f"Latest backup is {age_hours:.1f} hours old"
    
    @staticmethod
    def get_backup_statistics():
        """Get backup system statistics."""
        from .models import BackupLog
        
        cutoff_date = timezone.now() - timedelta(days=30)
        recent_backups = BackupLog.objects.filter(started_at__gte=cutoff_date)
        
        total = recent_backups.count()
        successful = recent_backups.filter(status='success').count()
        failed = recent_backups.filter(status='failed').count()
        
        stats = {
            'total_backups': total,
            'successful_backups': successful,
            'failed_backups': failed,
            'success_rate': (successful / total * 100) if total > 0 else 0,
            'average_size_mb': 0,
            'total_size_gb': 0,
        }
        
        # Calculate size statistics
        total_size = recent_backups.filter(status='success').aggregate(
            total=__import__('django.db.models').Sum('size_bytes')
        )['total'] or 0
        
        if recent_backups.filter(status='success').exists():
            avg_size = total_size / recent_backups.filter(status='success').count()
            stats['average_size_mb'] = round(avg_size / (1024 * 1024), 2)
        
        stats['total_size_gb'] = round(total_size / (1024 * 1024 * 1024), 2)
        
        return stats
