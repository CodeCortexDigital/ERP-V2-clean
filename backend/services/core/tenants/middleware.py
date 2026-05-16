"""
Identify active tenant per request: header → subdomain → session → user membership.
"""

from __future__ import annotations

import logging

from django.http import JsonResponse

from .context import clear_current_tenant, set_current_tenant
from .utils import (
    resolve_tenant_for_user,
    resolve_tenant_from_header,
    resolve_tenant_from_host,
    resolve_tenant_from_session,
    user_can_access_tenant,
)

logger = logging.getLogger('erp.tenants')


class TenantMiddleware:
    """Attach request.tenant and thread-local tenant for ORM scoping."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        clear_current_tenant()
        request.tenant = None

        tenant = resolve_tenant_from_header(request)
        if not tenant:
            tenant = resolve_tenant_from_host(request.get_host())
        if not tenant:
            tenant = resolve_tenant_from_session(request)

        user = getattr(request, 'user', None)
        if tenant and user and user.is_authenticated and not user.is_superuser:
            if not user_can_access_tenant(user, tenant):
                return JsonResponse(
                    {'error': 'You do not have access to this school tenant.'},
                    status=403,
                )

        if not tenant and user and user.is_authenticated:
            tenant = resolve_tenant_for_user(user)

        if tenant:
            request.tenant = tenant
            set_current_tenant(tenant)

        response = self.get_response(request)
        clear_current_tenant()
        return response
