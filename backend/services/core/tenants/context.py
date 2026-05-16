"""Thread-local current tenant (set by middleware)."""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import School

_local = threading.local()


def get_current_tenant() -> School | None:
    return getattr(_local, 'tenant', None)


def set_current_tenant(tenant: School | None) -> None:
    _local.tenant = tenant


def clear_current_tenant() -> None:
    if hasattr(_local, 'tenant'):
        del _local.tenant
