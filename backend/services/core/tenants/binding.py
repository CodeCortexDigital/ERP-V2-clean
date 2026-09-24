"""Decide which school a signed-in request acts for."""

from __future__ import annotations

from .context import NO_TENANT, set_current_tenant, use_tenant
from .utils import resolve_tenant_for_user, resolve_tenant_from_header, user_can_access_tenant


class TenantAccessDenied(Exception):
    pass


def bind_tenant(request, user):
    """Set request.tenant and the ORM scope for ``user``.

    * ``X-Tenant-ID`` header: that school, if the user belongs to it (platform
      superusers may pick any school);
    * otherwise the user's own school (membership, or their student/teacher record);
    * superuser with no school: unfiltered (platform owner);
    * anyone else with no school: NO_TENANT, i.e. no school data at all.
    """
    with use_tenant(None):  # look the school up without any previous scope
        tenant = resolve_tenant_from_header(request)
        if tenant is not None:
            if not (user.is_superuser or user_can_access_tenant(user, tenant)):
                raise TenantAccessDenied('You do not have access to this school.')
        else:
            tenant = resolve_tenant_for_user(user)
        if tenant is not None and not tenant.is_active and not user.is_superuser:
            raise TenantAccessDenied("This school's account is suspended. Please contact support.")

    set_current_tenant(tenant if tenant is not None else (None if user.is_superuser else NO_TENANT))
    target = getattr(request, '_request', request)  # DRF Request wraps the Django one
    target.tenant = tenant
    return tenant
