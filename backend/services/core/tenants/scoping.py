"""School (tenant) isolation for every model in registry.py.

install() (called from the tenants AppConfig) wires isolation in once:

* reads:  the default manager of each registered model, DRF generic views'
  get_queryset(), and DRF related-field querysets (so a serializer can't point
  a new row at another school's record) are filtered to the current school;
* writes: a pre_save hook stamps new rows with the current school and refuses
  rows that belong to a different one; bulk_create is stamped too.

The current school is set per request by TenantJWTAuthentication (API calls)
and TenantMiddleware (session / header). See context.py for the states.
"""

from __future__ import annotations

import logging

from django.apps import apps
from django.core.exceptions import PermissionDenied
from django.db.models import QuerySet
from django.db.models.signals import pre_save

from .context import NO_TENANT, get_current_tenant, tenant_state
from .registry import DIRECT, tenant_paths

logger = logging.getLogger('erp.tenants')

_PATHS: dict[str, str] = {}
_DIRECT: set[str] = set()
_installed = False


def path_for(model) -> str | None:
    return _PATHS.get(model._meta.label)


def apply_tenant_filter(queryset):
    """Filter a queryset of a school-owned model to the current school."""
    if not isinstance(queryset, QuerySet):
        return queryset
    state = tenant_state()
    if state is None:
        return queryset
    path = path_for(queryset.model)
    if not path:
        return queryset
    if state is NO_TENANT:
        return queryset.none()
    return queryset.filter(**{path: state})


# Kept for existing callers (students views).
def scope_queryset(queryset: QuerySet, request=None) -> QuerySet:
    return apply_tenant_filter(queryset)


def tenant_for_request(request):
    return getattr(request, 'tenant', None) or get_current_tenant()


def save_with_tenant(serializer, request, **kwargs):
    tenant = tenant_for_request(request)
    if tenant:
        kwargs.setdefault('tenant', tenant)
    return serializer.save(**kwargs)


def tenant_id_of(instance):
    """School id a row belongs to (following its parent path), or None if unknown."""
    path = path_for(type(instance))
    if not path:
        return None
    obj = instance
    parts = path.split('__')
    for part in parts[:-1]:
        obj = getattr(obj, part, None)
        if obj is None:
            return None
    return getattr(obj, f'{parts[-1]}_id', None)


def _guard_save(sender, instance, raw=False, **kwargs):
    if raw:  # loaddata / fixtures
        return
    state = tenant_state()
    if state is None:
        return
    if state is NO_TENANT:
        raise PermissionDenied('Your account is not linked to a school.')
    label = sender._meta.label
    if label in _DIRECT and getattr(instance, 'tenant_id', None) is None:
        instance.tenant = state
        return
    owner = tenant_id_of(instance)
    if owner is not None and owner != state.pk:
        logger.warning('Blocked cross-school write: %s %s by school %s', label, instance.pk, state.pk)
        raise PermissionDenied('That record belongs to another school.')


def _patch_managers(model):
    for manager in model._meta.managers_map.values():
        if manager.name == 'all_objects':  # explicit "everything" manager (archival, maintenance)
            continue
        if getattr(manager, '_tenant_scoped', False):
            continue
        original = manager.get_queryset

        def get_queryset(_original=original):
            return apply_tenant_filter(_original())

        manager.get_queryset = get_queryset
        manager._tenant_scoped = True


def _patch_drf():
    from rest_framework.generics import GenericAPIView
    from rest_framework.relations import RelatedField

    if getattr(GenericAPIView, '_tenant_scoped', False):
        return
    view_get_queryset = GenericAPIView.get_queryset
    field_get_queryset = RelatedField.get_queryset

    def scoped_view_queryset(self):
        # Class-level ``queryset = Model.objects.all()`` is built at import time,
        # before any school is known; re-apply the filter per request.
        return apply_tenant_filter(view_get_queryset(self))

    def scoped_field_queryset(self):
        return apply_tenant_filter(field_get_queryset(self))

    GenericAPIView.get_queryset = scoped_view_queryset
    RelatedField.get_queryset = scoped_field_queryset
    GenericAPIView._tenant_scoped = True


def _patch_bulk_create():
    if getattr(QuerySet, '_tenant_scoped', False):
        return
    original = QuerySet.bulk_create

    def bulk_create(self, objs, *args, **kwargs):
        state = tenant_state()
        objs = list(objs)
        if state is NO_TENANT and self.model._meta.label in _PATHS:
            raise PermissionDenied('Your account is not linked to a school.')
        if state is not None and state is not NO_TENANT and self.model._meta.label in _DIRECT:
            for obj in objs:
                if getattr(obj, 'tenant_id', None) is None:
                    obj.tenant = state
        return original(self, objs, *args, **kwargs)

    QuerySet.bulk_create = bulk_create
    QuerySet._tenant_scoped = True


def install():
    global _installed
    if _installed:
        return
    for label, path in tenant_paths().items():
        try:
            model = apps.get_model(label)
        except LookupError:
            logger.warning('Tenant registry: model %s not found', label)
            continue
        _PATHS[label] = path
        if label in DIRECT:
            _DIRECT.add(label)
        _patch_managers(model)
        pre_save.connect(_guard_save, sender=model, dispatch_uid=f'tenant-guard-{label}')
    _patch_drf()
    _patch_bulk_create()
    _installed = True
