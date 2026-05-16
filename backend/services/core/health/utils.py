"""Health check utilities for monitoring system status."""
import logging
from django.db import connection
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


def check_database():
    """Check database connectivity."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }


def check_redis():
    """Check Redis cache connectivity."""
    try:
        # Test Redis connection
        cache.set('health_check', 'ok', 10)
        value = cache.get('health_check')
        
        if value == 'ok':
            return {
                'status': 'healthy',
                'message': 'Redis connection successful'
            }
        else:
            return {
                'status': 'unhealthy',
                'message': 'Redis connection failed - cache value mismatch'
            }
    except Exception as e:
        logger.warning(f"Redis health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'message': f'Redis connection failed: {str(e)}'
        }


def check_celery():
    """Check Celery worker status."""
    try:
        from celery.app.control import Inspect
        from erp_core.celery import app
        
        inspect = Inspect(app=app)
        stats = inspect.stats()
        
        if stats:
            return {
                'status': 'healthy',
                'message': f'Celery workers active: {len(stats)}',
                'workers': list(stats.keys())
            }
        else:
            return {
                'status': 'unhealthy',
                'message': 'No active Celery workers'
            }
    except Exception as e:
        logger.warning(f"Celery health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'message': f'Celery check failed: {str(e)}'
        }


def check_backups():
    """Check backup subsystem health (RPO: 24h)."""
    try:
        from services.core.backup.monitoring import BackupHealthCheck
        ok, message = BackupHealthCheck.is_healthy(max_age_hours=getattr(settings, 'BACKUP_RPO_HOURS', 24) + 24)
        return {
            'status': 'healthy' if ok else 'unhealthy',
            'message': message,
        }
    except Exception as e:
        logger.warning('Backup health check skipped: %s', e)
        return {'status': 'unknown', 'message': str(e)}


def get_system_health():
    """Get overall system health status."""
    health_status = {
        'status': 'healthy',
        'timestamp': None,
        'checks': {
            'database': check_database(),
            'redis': check_redis(),
            'celery': check_celery(),
            'backups': check_backups(),
        }
    }
    
    # Overall status is unhealthy if any critical component is unhealthy
    critical_checks = ['database']
    for check_name in critical_checks:
        if health_status['checks'][check_name]['status'] == 'unhealthy':
            health_status['status'] = 'unhealthy'
            break
    
    return health_status
