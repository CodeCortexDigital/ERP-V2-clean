import time
import logging
import json
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    """Log all requests with performance metrics"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Start timer
        start_time = time.time()
        
        # Store request start
        request.start_time = start_time
        
        # Process request
        response = self.get_response(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log request details
        log_data = {
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'user_id': str(getattr(request.user, 'id', 'anonymous')),
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        
        # Log slow requests (>1 second)
        if duration > 1.0:
            logger.warning(f"Slow request detected", extra=log_data)
        else:
            logger.info(f"Request processed", extra=log_data)
        
        # Add performance header
        response['X-Response-Time'] = str(round(duration * 1000, 2))
        
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class AuditMiddleware:
    """Track user actions for audit purposes"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log write operations for audit
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            self.log_audit(request, response)
        
        return response
    
    def log_audit(self, request, response):
        """Log write operations for audit trail"""
        user = request.user if request.user.is_authenticated else None
        
        # Don't log file uploads fully
        content_length = len(response.content) if hasattr(response, 'content') else 0
        
        audit_data = {
            'timestamp': timezone.now().isoformat(),
            'user_id': str(user.id) if user else None,
            'username': user.username if user else 'anonymous',
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'content_length': content_length,
            'ip_address': self.get_client_ip(request),
        }
        
        logger.info(f"AUDIT: {json.dumps(audit_data)}")
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

class StudentActivityMiddleware:
    """Track student last activity"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Update student last activity if viewing student data
        if request.user.is_authenticated and '/api/v1/students/' in request.path:
            # This would update the student's last_activity field
            # Implementation would need to map user to student
            pass
        
        return response

class MaintenanceModeMiddleware:
    """Handle maintenance mode"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check if maintenance mode is enabled
        maintenance_mode = cache.get('maintenance_mode', False)
        
        if maintenance_mode and not request.user.is_staff:
            from django.http import JsonResponse
            return JsonResponse(
                {'error': 'Service is under maintenance', 'status_code': 503},
                status=503
            )
        
        return self.get_response(request)

class RequestIDMiddleware:
    """Add unique request ID to each request"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        import uuid
        request.id = str(uuid.uuid4())
        
        response = self.get_response(request)
        response['X-Request-ID'] = request.id
        
        return response