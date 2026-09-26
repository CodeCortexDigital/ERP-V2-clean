"""JWT authentication that also binds the user's school for the request."""

from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication

from .binding import TenantAccessDenied, bind_tenant

SIGNED_OUT = 'You were signed out. Please sign in again.'
TWO_STEP_FIRST = 'Set up two-step sign-in first (Account → My sign-ins & data).'
# What someone who must set up two-step sign-in can still do before they have (P8).
TWO_STEP_OPEN = ('/security/2fa/', '/auth/logout', '/auth/token/refresh', '/auth/settings/change-password')


def needs_two_step_setup(request, user, school=None) -> bool:
    """Platform owners (live site) and, where the school requires it, administrators may not make changes until
    two-step sign-in is on."""
    if any(p in request.path for p in TWO_STEP_OPEN):
        return False
    from services.core.security import twofactor

    return not getattr(user, 'two_factor_enabled', False) and twofactor.required_for(user, school)


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
            if request.method not in ('GET', 'HEAD', 'OPTIONS') and needs_two_step_setup(request, result[0], school):
                raise PermissionDenied({'error': TWO_STEP_FIRST, 'two_factor_setup_required': True})
            from services.core.billing.service import check_request

            check_request(request, result[0], school)  # modules outside the plan; read-only after a lapse
            if request.method not in ('GET', 'HEAD', 'OPTIONS') and not result[0].is_superuser:
                from services.core.accounts.decorators import get_user_role
                from services.core.security import role_policy

                role_policy.check(request, result[0], get_user_role(result[0]))  # which changes this role may make
        return result
