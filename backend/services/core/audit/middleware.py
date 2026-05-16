from django.utils.deprecation import MiddlewareMixin
from django.utils.functional import SimpleLazyObject
from .models import AuditLog


class AuditMiddleware(MiddlewareMixin):
    """Log API requests for authenticated users and record basic request metadata."""

    def process_response(self, request, response):
        try:
            user = getattr(request, 'user', None)
            path = getattr(request, 'path', '')
            if not path.startswith('/api/'):
                return response

            if user and user.is_authenticated:
                method = request.method.upper()
                action = 'VIEW'
                if method == 'POST':
                    action = 'CREATE'
                elif method in ('PUT', 'PATCH'):
                    action = 'UPDATE'
                elif method == 'DELETE':
                    action = 'DELETE'

                resource_type = path.replace('/api/', '')[:128]
                ip = request.META.get('HTTP_X_FORWARDED_FOR') or request.META.get('REMOTE_ADDR')
                ua = request.META.get('HTTP_USER_AGENT', '')[:512]

                AuditLog.objects.create(
                    user=user,
                    action=action,
                    resource_type=resource_type,
                    resource_id=None,
                    old_data=None,
                    new_data={'status_code': response.status_code},
                    ip_address=ip,
                    user_agent=ua,
                )
        except Exception:
            pass
        return response
