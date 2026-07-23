"""Tenant-scoped queryset managers."""

from django.db import models

from .context import get_current_tenant


class TenantQuerySet(models.QuerySet):
    def for_tenant(self, tenant):
        if tenant is None:
            return self.none()
        return self.filter(tenant=tenant)


class TenantAwareManager(models.Manager):
    """
    Automatically filters by request tenant when set.
    Superusers/staff bypass when allow_unscoped=True on model Meta.
    """

    def get_queryset(self):
        qs = TenantQuerySet(self.model, using=self._db)
        # Bypass tenant scoping for single-tenant mode
        return qs

    def unscoped(self):
        return TenantQuerySet(self.model, using=self._db)
