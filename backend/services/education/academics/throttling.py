from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class RoleBasedThrottle(UserRateThrottle):
    """
    Throttle based on user role
    """
    scope = 'user'
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }

class BurstRateThrottle(UserRateThrottle):
    """
    Prevent burst requests
    """
    scope = 'burst'
    rate = '60/minute'

class ProgramEndpointThrottle(UserRateThrottle):
    """
    Throttle for program endpoints
    """
    scope = 'programs'
    rate = '100/hour'

class CourseEndpointThrottle(UserRateThrottle):
    """
    Throttle for course endpoints
    """
    scope = 'courses'
    rate = '100/hour'