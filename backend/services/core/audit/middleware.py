from .models import AuditLog

WRITE_ACTIONS = {'POST': 'CREATE', 'PUT': 'UPDATE', 'PATCH': 'UPDATE', 'DELETE': 'DELETE'}
# Busy, low-value writes that would drown the log (sign-in has its own history).
SKIP_PARTS = ('/auth/login', '/token/refresh', '/auth/logout', '/firebase/login', '/sso/exchange', 'mark-read',
              'mark_read', 'read-all', 'mark-all-read', '/heartbeat', '/ai/chat',
              '/security/people/')  # logged by the security API itself, with the person's name


class AuditMiddleware:
    """The activity log: every change a signed-in person makes through the API (add, change, delete, run),
    every export, and every refused attempt, tagged with their school. Page views are not recorded."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._record(request, response)
        except Exception:  # the log must never break a request
            pass
        return response

    def _record(self, request, response):
        path = getattr(request, 'path', '') or ''
        if not path.startswith('/api/'):
            return
        user = getattr(request, 'user', None)  # DRF copies the JWT user onto the Django request
        if not (user and user.is_authenticated):
            return
        code = response.status_code
        method = request.method.upper()
        if code == 403:
            action = 'PERMISSION_DENIED'
        elif code >= 400:
            return
        elif method in WRITE_ACTIONS:
            action = WRITE_ACTIONS[method]
        elif method == 'GET' and (request.GET.get('export') or request.GET.get('download')):
            action = 'EXPORT'
        else:
            return
        if any(part in path for part in SKIP_PARTS):
            return
        from services.core.security.access import UUID_RE

        found = UUID_RE.search(path)
        school = getattr(request, 'tenant', None)
        AuditLog.objects.create(
            user=user,
            school=school if getattr(school, 'pk', None) else None,
            action=action,
            resource_type=path.replace('/api/', '', 1)[:128],
            resource_id=found.group(0) if found else None,
            new_data={'status_code': code, 'method': method},
            ip_address=_ip(request),
            user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:512],
        )


def _ip(request):
    from services.core.security.policy import client_ip

    return client_ip(request)
