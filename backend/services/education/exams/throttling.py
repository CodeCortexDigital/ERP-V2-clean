from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class ExamBurstRateThrottle(UserRateThrottle):
    """Prevent burst requests"""
    scope = 'burst'
    rate = '60/minute'

class ExamResultsThrottle(UserRateThrottle):
    """Throttle for exam results endpoints"""
    scope = 'results'
    rate = '100/hour'

class ExamRegistrationThrottle(UserRateThrottle):
    """Throttle for exam registration"""
    scope = 'registration'
    rate = '50/hour'

class RoleBasedThrottle(UserRateThrottle):
    """Dynamic throttle based on user role"""
    
    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        
        # Determine role
        if request.user.is_superuser:
            self.rate = '1000/hour'
            self.scope = 'admin'
        elif request.user.is_staff:
            self.rate = '500/hour'
            self.scope = 'staff'
        else:
            self.rate = '100/hour'
            self.scope = 'user'
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': request.user.pk
        }