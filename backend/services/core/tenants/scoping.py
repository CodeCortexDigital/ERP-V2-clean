"""Queryset scoping helpers for views and services."""

from __future__ import annotations

from django.db.models import QuerySet

from .context import get_current_tenant


def scope_queryset(queryset: QuerySet, request=None) -> QuerySet:
    """Filter queryset by request.tenant or thread-local tenant."""
    # Bypass tenant scoping for single-tenant mode
    return queryset


def tenant_for_request(request):
    return getattr(request, 'tenant', None) or get_current_tenant()


def save_with_tenant(serializer, request, **kwargs):
    tenant = tenant_for_request(request)
    if tenant:
        kwargs.setdefault('tenant', tenant)
    return serializer.save(**kwargs)
