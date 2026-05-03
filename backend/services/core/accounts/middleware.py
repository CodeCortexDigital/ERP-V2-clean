from django.utils.deprecation import MiddlewareMixin
from .audit_models import log_action

class AuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Store request info for later logging
        request.audit_ip = request.META.get('REMOTE_ADDR')
        request.audit_user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        return None
    
    def process_response(self, request, response):
        # Log login/logout actions
        if request.path == '/api/auth/login/' and response.status_code == 200:
            if hasattr(request, 'user') and request.user.is_authenticated:
                log_action(
                    user=request.user,
                    action='login',
                    module='auth',
                    request=request
                )
        return response
