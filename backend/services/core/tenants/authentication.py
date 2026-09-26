"""JWT authentication that also binds the user's school for the request."""

from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

from .binding import TenantAccessDenied, bind_tenant

SIGNED_OUT = 'You were signed out. Please sign in again.'


def issued_before_sign_out(user, token) -> bool:
    """True if the person was signed out everywhere after this token was issued."""
    from services.core.security.policy import sessions_revoked_at

    revoked = sessions_revoked_at(user)
    return bool(revoked and int(token.get('iat', 0) or 0) < revoked)


class TenantJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            if issued_before_sign_out(result[0], result[1]):
                raise AuthenticationFailed(SIGNED_OUT, code='signed_out')
            try:
                school = bind_tenant(request, result[0])
            except TenantAccessDenied as exc:
                raise PermissionDenied(str(exc))
            from services.core.billing.service import check_request

            check_request(request, result[0], school)  # modules outside the plan; read-only after a lapse
        return result
