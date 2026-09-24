"""JWT authentication that also binds the user's school for the request."""

from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

from .binding import TenantAccessDenied, bind_tenant


class TenantJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            try:
                bind_tenant(request, result[0])
            except TenantAccessDenied as exc:
                raise PermissionDenied(str(exc))
        return result
