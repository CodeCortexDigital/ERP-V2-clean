"""Queryset scoping helpers for views and services."""

from __future__ import annotations

from django.db.models import QuerySet

from .context import get_current_tenant


def scope_queryset(queryset: QuerySet, request=None) -> QuerySet:
    """Filter queryset by request.tenant or thread-local tenant."""
    tenant = None
    if request is not None:
        tenant = getattr(request, 'tenant', None)
    if tenant is None:
        tenant = get_current_tenant()
    if tenant is None:
        return queryset
    if not hasattr(queryset.model, '_meta'):
        return queryset
    field_names = {f.name for f in queryset.model._meta.fields}
    if 'tenant' in field_names:
        return queryset.filter(tenant=tenant)
    if 'tenant_id' in field_names and 'tenant' not in field_names:
        return queryset.filter(tenant_id=tenant.id)
    return queryset


def tenant_for_request(request):
    return getattr(request, 'tenant', None) or get_current_tenant()


def save_with_tenant(serializer, request, **kwargs):
    tenant = tenant_for_request(request)
    if tenant:
        kwargs.setdefault('tenant', tenant)
    return serializer.save(**kwargs)
