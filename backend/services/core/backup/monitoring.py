"""
Backup monitoring and Prometheus metrics.
"""
import logging
import shutil
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from prometheus_client import Counter, Gauge, Histogram

logger = logging.getLogger(__name__)

backup_total = Counter(
    'backup_total',
    'Total number of backups',
    ['backup_type', 'status'],
)

backup_duration_seconds = Histogram(
    'backup_duration_seconds',
    'Time spent creating backups',
    ['backup_type'],
    buckets=(60, 300, 600, 1800, 3600, 7200),
)

backup_size_bytes = Gauge(
    'backup_size_bytes',
    'Size of latest backup in bytes',
    ['backup_type'],
)

backup_age_hours = Gauge(
    'backup_age_hours',
    'Age of latest successful backup in hours',
)

backup_success_rate = Gauge(
    'backup_success_rate',
    'Percentage of successful backups in last 30 days',
)

backup_failures_total = Counter(
    'backup_failures_total',
    'Total failed backups',
    ['backup_type', 'error_type'],
)

backup_size_trend_bytes = Gauge(
    'backup_size_trend_bytes',
    'Rolling average backup size (7-day window)',
    ['backup_type'],
)

restore_duration_seconds = Histogram(
    'restore_duration_seconds',
    'Time spent restoring backups',
    ['restore_type'],
    buckets=(60, 300, 600, 1800, 3600, 7200),
)

restore_total = Counter(
    'restore_total',
    'Total restore operations',
    ['restore_type', 'status'],
)

backup_disk_space_available_bytes = Gauge(
    'backup_disk_space_available_bytes',
    'Available disk space for backups',
)

backup_disk_usage_percent = Gauge(
    'backup_disk_usage_percent',
    'Backup volume usage percent',
)


class BackupMonitoring:
    """Record backup/restore metrics and health."""

    @staticmethod
    def record_backup_start(backup_type: str) -> None:
        logger.info('Backup started: %s', backup_type)

    @staticmethod
    def record_backup_success(backup_type: str, duration_seconds: int, size_bytes: int | None) -> None:
        backup_total.labels(backup_type=backup_type, status='success').inc()
        backup_duration_seconds.labels(backup_type=backup_type).observe(duration_seconds)
        if size_bytes:
            backup_size_bytes.labels(backup_type=backup_type).set(size_bytes)
        BackupMonitoring.update_backup_health()

    @staticmethod
    def record_backup_failure(backup_type: str, error_type: str, duration_seconds: int) -> None:
        backup_total.labels(backup_type=backup_type, status='failed').inc()
        backup_failures_total.labels(backup_type=backup_type, error_type=error_type).inc()
        backup_duration_seconds.labels(backup_type=backup_type).observe(duration_seconds)
        logger.error('Backup failed: %s (%s)', backup_type, error_type)

    @staticmethod
    def record_restore_success(restore_type: str, duration_seconds: int) -> None:
        restore_total.labels(restore_type=restore_type, status='success').inc()
        restore_duration_seconds.labels(restore_type=restore_type).observe(duration_seconds)

    @staticmethod
    def record_restore_failure(restore_type: str, duration_seconds: int) -> None:
        restore_total.labels(restore_type=restore_type, status='failed').inc()
        restore_duration_seconds.labels(restore_type=restore_type).observe(duration_seconds)

    @staticmethod
    def update_backup_health() -> None:
        from .models import BackupLog

        latest = BackupLog.objects.filter(status__in=('success', 'verified')).order_by('-started_at').first()
        if latest:
            age_hours = (timezone.now() - latest.started_at).total_seconds() / 3600
            backup_age_hours.set(age_hours)

        cutoff = timezone.now() - timedelta(days=30)
        recent = BackupLog.objects.filter(started_at__gte=cutoff)
        total = recent.count()
        if total:
            rate = recent.filter(status__in=('success', 'verified')).count() / total * 100
            backup_success_rate.set(rate)

        # 7-day size trend per backup type
        week_cutoff = timezone.now() - timedelta(days=7)
        for btype in ('full', 'database', 'media'):
            rows = BackupLog.objects.filter(
                started_at__gte=week_cutoff,
                backup_type=btype,
                status__in=('success', 'verified'),
                size_bytes__isnull=False,
            )
            avg = rows.aggregate(avg=Sum('size_bytes'))['avg']
            if avg and rows.count():
                backup_size_trend_bytes.labels(backup_type=btype).set(avg / rows.count())

    @staticmethod
    def update_disk_space(backup_dir: str) -> None:
        try:
            stats = shutil.disk_usage(backup_dir)
            backup_disk_space_available_bytes.set(stats.free)
            if stats.total:
                backup_disk_usage_percent.set((stats.used / stats.total) * 100)
        except OSError as exc:
            logger.error('Disk metrics failed: %s', exc)

    @staticmethod
    def check_backup_health_alerts(backup_dir: str) -> list[str]:
        from .models import BackupLog

        alerts: list[str] = []
        latest = BackupLog.objects.filter(status__in=('success', 'verified')).order_by('-started_at').first()

        if not latest:
            alerts.append('No successful backups found')
        else:
            age_hours = (timezone.now() - latest.started_at).total_seconds() / 3600
            if age_hours > 48:
                alerts.append(f'CRITICAL: Latest backup is {age_hours:.1f}h old (RPO: 24h)')
            elif age_hours > 24:
                alerts.append(f'WARNING: Latest backup is {age_hours:.1f}h old')

        week = timezone.now() - timedelta(days=7)
        recent = BackupLog.objects.filter(started_at__gte=week)
        if recent.exists():
            rate = recent.filter(status__in=('success', 'verified')).count() / recent.count() * 100
            if rate < 80:
                alerts.append(f'Backup success rate {rate:.0f}% (expected > 90%)')

        try:
            stats = shutil.disk_usage(backup_dir)
            pct = (stats.used / stats.total) * 100 if stats.total else 0
            if pct > 90:
                alerts.append(f'CRITICAL: Backup disk at {pct:.0f}%')
            elif pct > 75:
                alerts.append(f'WARNING: Backup disk at {pct:.0f}%')
        except OSError:
            pass

        return alerts


class BackupHealthCheck:
    """Health probes for backup subsystem."""

    @staticmethod
    def is_healthy(max_age_hours: int = 48) -> tuple[bool, str]:
        from .models import BackupLog

        latest = BackupLog.objects.filter(status__in=('success', 'verified')).order_by('-started_at').first()
        if not latest:
            return False, 'No successful backups found'

        age_hours = (timezone.now() - latest.started_at).total_seconds() / 3600
        if age_hours > max_age_hours:
            return False, f'Latest backup is {age_hours:.1f}h old (max {max_age_hours}h)'

        return True, f'Latest backup is {age_hours:.1f}h old'

    @staticmethod
    def get_backup_statistics() -> dict:
        from .models import BackupLog

        cutoff = timezone.now() - timedelta(days=30)
        recent = BackupLog.objects.filter(started_at__gte=cutoff)
        successful = recent.filter(status__in=('success', 'verified'))
        total_size = successful.aggregate(total=Sum('size_bytes'))['total'] or 0
        count = successful.count()

        return {
            'total_backups': recent.count(),
            'successful_backups': successful.count(),
            'failed_backups': recent.filter(status='failed').count(),
            'success_rate': (successful.count() / recent.count() * 100) if recent.exists() else 0,
            'average_size_mb': round((total_size / count) / (1024 * 1024), 2) if count else 0,
            'total_size_gb': round(total_size / (1024 ** 3), 2),
        }
