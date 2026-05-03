from rest_framework.throttling import UserRateThrottle, AnonRateThrottle, ScopedRateThrottle

class StudentRateThrottle(UserRateThrottle):
    """
    Throttle for student endpoints
    """
    scope = 'student'
    rate = '200/hour'

class StaffRateThrottle(UserRateThrottle):
    """
    Throttle for staff endpoints
    """
    scope = 'staff'
    rate = '1000/hour'

class AdminRateThrottle(UserRateThrottle):
    """
    Throttle for admin endpoints
    """
    scope = 'admin'
    rate = '5000/hour'

class BurstRateThrottle(UserRateThrottle):
    """
    Prevent burst requests
    """
    scope = 'burst'
    rate = '60/minute'

class DocumentUploadThrottle(UserRateThrottle):
    """
    Throttle for document uploads
    """
    scope = 'upload'
    rate = '50/hour'

class EnrollmentThrottle(UserRateThrottle):
    """
    Throttle for enrollment operations
    """
    scope = 'enrollment'
    rate = '100/hour'

class RoleBasedThrottle(UserRateThrottle):
    """
    Dynamic throttle based on user role
    """
    
    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Determine role
        if request.user.is_superuser:
            self.rate = '5000/hour'
            self.scope = 'admin'
        elif request.user.is_staff:
            self.rate = '1000/hour'
            self.scope = 'staff'
        else:
            self.rate = '200/hour'
            self.scope = 'student'
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': request.user.pk
        }

class ScopedRateThrottleWithBypass(ScopedRateThrottle):
    """
    Scoped throttle that allows bypass for internal services
    """
    
    def allow_request(self, request, view):
        # Bypass for internal service API key
        if request.headers.get('X-API-Key'):
            return True
        
        return super().allow_request(request, view)