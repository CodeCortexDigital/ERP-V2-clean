from django.db import models

from .managers import TenantAwareManager


class SchoolAliasMixin:
    """Mixin to expose 'school' property as an alias for 'tenant'."""
    @property
    def school(self):
        return getattr(self, 'tenant', None)

    @school.setter
    def school(self, value):
        self.tenant = value


class TenantScopedModel(SchoolAliasMixin, models.Model):
    """Adds FK to School (tenant) with scoped default manager."""

    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='%(app_label)s_%(class)s_set',
        null=True,
        blank=True,
        db_index=True,
    )

    objects = TenantAwareManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
