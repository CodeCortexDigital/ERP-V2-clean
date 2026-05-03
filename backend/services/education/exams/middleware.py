import time
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    """Log all requests with performance metrics"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Start timer
        start_time = time.time()
        
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
        }
        
        # Log slow requests (>1 second)
        if duration > 1.0:
            logger.warning(f"Slow request detected", extra=log_data)
        
        # Add performance header
        response['X-Response-Time'] = str(round(duration * 1000, 2))
        
        return response