"""
Health check views for monitoring - Simplified version.
"""

import time
import os
import platform
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.conf import settings
from django.core.cache import cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
import json

@csrf_exempt
@never_cache
def health_check(request):
    """Liveness probe - checks if service is running."""
    
    health_status = {
        "status": "healthy",
        "service": getattr(settings, 'SERVICE_NAME', 'accounts'),
        "version": getattr(settings, 'SERVICE_VERSION', '2.0.0'),
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
    
    # Check cache (if configured)
    try:
        if cache:
            cache.set("health_check", "ok", 10)
            if cache.get("health_check") == "ok":
                health_status["checks"]["cache"] = "healthy"
            else:
                health_status["checks"]["cache"] = "unhealthy"
        else:
            health_status["checks"]["cache"] = "not_configured"
    except Exception as e:
        health_status["checks"]["cache"] = f"error: {str(e)}"
    
    # Determine overall status
    http_status = 200 if health_status["status"] == "healthy" else 503
    
    return JsonResponse(health_status, status=http_status)

@csrf_exempt
@never_cache
def readiness_check(request):
    """Readiness probe - checks if service is ready to accept traffic."""
    
    readiness_status = {
        "status": "ready",
        "service": getattr(settings, 'SERVICE_NAME', 'accounts'),
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Check database migrations
    try:
        from django.db.migrations.executor import MigrationExecutor
        executor = MigrationExecutor(connection)
        if executor.migration_plan(executor.loader.graph.leaf_nodes()):
            readiness_status["checks"]["migrations"] = "pending"
            readiness_status["status"] = "not ready"
        else:
            readiness_status["checks"]["migrations"] = "applied"
    except Exception as e:
        readiness_status["status"] = "not ready"
        readiness_status["checks"]["migrations"] = f"error: {str(e)}"
    
    http_status = 200 if readiness_status["status"] == "ready" else 503
    
    return JsonResponse(readiness_status, status=http_status)

@csrf_exempt

@csrf_exempt
def metrics_endpoint(request):
    """Simple Prometheus metrics endpoint."""
    
    from django.db import connection
    from django.core.cache import cache
    from accounts.models import User
    
    # Gather metrics
    user_count = User.objects.count()
    active_users = User.objects.filter(account_status='active').count()
    
    # Get database stats
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
        table_count = cursor.fetchone()[0]
    
    metrics_data = f"""# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 0

# HELP users_total Total number of users
# TYPE users_total gauge
users_total {user_count}

# HELP users_active_total Total number of active users
# TYPE users_active_total gauge
users_active_total {active_users}

# HELP database_tables_total Total number of database tables
# TYPE database_tables_total gauge
database_tables_total {table_count}

# HELP service_info Service information
# TYPE service_info gauge
service_info{{service="{getattr(settings, 'SERVICE_NAME', 'accounts')}", version="{getattr(settings, 'SERVICE_VERSION', '2.0.0')}"}} 1
"""
    return HttpResponse(metrics_data, content_type="text/plain; version=0.0.4")
@csrf_exempt
def version_info(request):
    """Service version information."""
    
    version_data = {
        "service": getattr(settings, 'SERVICE_NAME', 'accounts'),
        "version": getattr(settings, 'SERVICE_VERSION', '2.0.0'),
        "git_commit": os.environ.get("GIT_COMMIT", "unknown"),
        "build_date": os.environ.get("BUILD_DATE", "unknown"),
        "python_version": platform.python_version(),
        "django_version": __import__('django').get_version(),
        "environment": os.environ.get("ENVIRONMENT", "development"),
    }
    
    return JsonResponse(version_data)

@csrf_exempt
def config_info(request):
    """Active configuration (sanitized)."""
    
    # List of sensitive keys to exclude
    sensitive_keys = [
        'SECRET_KEY', 'PASSWORD', 'TOKEN', 'KEY', 'SECRET',
        'TWILIO_AUTH_TOKEN', 'AWS_SECRET_ACCESS_KEY'
    ]
    
    config_data = {
        "service": getattr(settings, 'SERVICE_NAME', 'accounts'),
        "version": getattr(settings, 'SERVICE_VERSION', '2.0.0'),
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "settings": {}
    }
    
    # Get Django settings
    for setting in dir(settings):
        if setting.isupper() and not setting.startswith('_'):
            value = getattr(settings, setting)
            
            # Sanitize sensitive values
            if any(sensitive in setting for sensitive in sensitive_keys):
                config_data["settings"][setting] = "***REDACTED***"
            elif isinstance(value, (str, int, float, bool)):
                config_data["settings"][setting] = value
            elif isinstance(value, (list, tuple)) and len(value) < 10:
                config_data["settings"][setting] = str(value)
    
    return JsonResponse(config_data)








