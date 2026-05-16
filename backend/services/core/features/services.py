from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from django.core.cache import cache

from .models import DEFAULT_FEATURES, FeatureFlag

if TYPE_CHECKING:
    from services.core.tenants.models import School

CACHE_TTL = 60
CACHE_KEY_GLOBAL = 'feature_flags:global'
CACHE_KEY_TENANT = 'feature_flags:tenant:{tenant_id}'


def _cache_key_tenant(tenant_id) -> str:
    return CACHE_KEY_TENANT.format(tenant_id=tenant_id)


def invalidate_feature_cache(tenant_id=None) -> None:
    cache.delete(CACHE_KEY_GLOBAL)
    if tenant_id:
        cache.delete(_cache_key_tenant(tenant_id))


def _load_global_flags() -> dict[str, FeatureFlag]:
    cached = cache.get(CACHE_KEY_GLOBAL)
    if cached is not None:
        return cached
    flags = {f.name: f for f in FeatureFlag.objects.filter(tenant__isnull=True)}
    cache.set(CACHE_KEY_GLOBAL, flags, CACHE_TTL)
    return flags


def _load_tenant_flags(tenant: School) -> dict[str, FeatureFlag]:
    key = _cache_key_tenant(tenant.pk)
    cached = cache.get(key)
    if cached is not None:
        return cached
    flags = {f.name: f for f in FeatureFlag.objects.filter(tenant=tenant)}
    cache.set(key, flags, CACHE_TTL)
    return flags


def _rollout_bucket(name: str, tenant: School | None, user_id) -> int:
    tenant_part = str(tenant.pk) if tenant else 'global'
    user_part = str(user_id) if user_id else 'anon'
    digest = hashlib.sha256(f'{name}:{tenant_part}:{user_part}'.encode()).hexdigest()
    return int(digest[:8], 16) % 100


def evaluate_flag(flag: FeatureFlag, tenant: School | None = None, user=None) -> bool:
    if not flag.is_enabled:
        return False
    pct = flag.rollout_percentage
    if pct >= 100:
        return True
    if pct <= 0:
        return False
    user_id = getattr(user, 'pk', None) if user and getattr(user, 'is_authenticated', False) else None
    return _rollout_bucket(flag.name, tenant, user_id) < pct


def get_flag_record(name: str, tenant: School | None = None) -> FeatureFlag | None:
    if tenant:
        tenant_flags = _load_tenant_flags(tenant)
        if name in tenant_flags:
            return tenant_flags[name]
    return _load_global_flags().get(name)


def is_feature_enabled(
    name: str,
    tenant: School | None = None,
    user=None,
) -> bool:
    flag = get_flag_record(name, tenant=tenant)
    if not flag:
        return False
    return evaluate_flag(flag, tenant=tenant, user=user)


def resolve_all_features(tenant: School | None = None, user=None) -> dict[str, bool]:
    global_flags = _load_global_flags()
    tenant_flags = _load_tenant_flags(tenant) if tenant else {}
    names = {name for name, _ in DEFAULT_FEATURES}
    names.update(global_flags)
    names.update(tenant_flags)

    resolved: dict[str, bool] = {}
    for name in sorted(names):
        flag = tenant_flags.get(name) or global_flags.get(name)
        if flag:
            resolved[name] = evaluate_flag(flag, tenant=tenant, user=user)
        else:
            resolved[name] = False
    return resolved
