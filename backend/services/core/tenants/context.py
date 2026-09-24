"""Current tenant for the running request/task.

States:
  * a School      -> queries on tenant-scoped models are filtered to it
  * NO_TENANT     -> signed-in user without a school: those queries return nothing
  * None (unset)  -> system code, anonymous endpoints, platform superusers: unfiltered

asgiref's Local is context-aware, so this is safe under ASGI (Daphne) as well
as with threads.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import TYPE_CHECKING

from asgiref.local import Local

if TYPE_CHECKING:
    from .models import School

_local = Local()


class _NoTenant:
    """Sentinel: an authenticated user whose school could not be determined."""

    def __repr__(self):
        return 'NO_TENANT'

    def __bool__(self):
        return False


NO_TENANT = _NoTenant()


def get_current_tenant() -> School | None:
    """The active School, or None (also for NO_TENANT). Use tenant_state() to tell them apart."""
    tenant = getattr(_local, 'tenant', None)
    return None if tenant is NO_TENANT else tenant


def tenant_state():
    """Raw state: a School, NO_TENANT, or None."""
    return getattr(_local, 'tenant', None)


def set_current_tenant(tenant) -> None:
    _local.tenant = tenant


def clear_current_tenant() -> None:
    if hasattr(_local, 'tenant'):
        del _local.tenant


@contextmanager
def use_tenant(tenant):
    """Temporarily act as ``tenant`` (None = unfiltered), e.g. in commands and tasks."""
    previous = tenant_state()
    set_current_tenant(tenant)
    try:
        yield
    finally:
        if previous is None:
            clear_current_tenant()
        else:
            set_current_tenant(previous)
