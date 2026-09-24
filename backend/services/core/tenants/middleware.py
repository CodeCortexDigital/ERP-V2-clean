"""Bind the current school for session-authenticated requests (Django admin,
browsable API). API calls with a JWT are bound in TenantJWTAuthentication,
because DRF authenticates after middleware runs.
"""

from __future__ import annotations

import logging

from django.http import JsonResponse

from .binding import TenantAccessDenied, bind_tenant
from .context import clear_current_tenant

logger = logging.getLogger('erp.tenants')


class TenantMiddleware:
    """Attach request.tenant and the ORM tenant scope; always cleared afterwards."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        clear_current_tenant()
        request.tenant = None
        user = getattr(request, 'user', None)
        try:
            if user is not None and user.is_authenticated:
                bind_tenant(request, user)
        except TenantAccessDenied as exc:
            clear_current_tenant()
            return JsonResponse({'error': str(exc)}, status=403)
        try:
            return self.get_response(request)
        finally:
            clear_current_tenant()
