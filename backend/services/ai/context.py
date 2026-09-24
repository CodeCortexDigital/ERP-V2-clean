"""Per-request context for AI features: who is asking, in which role and school.

Every AI tool receives an `AIContext` so scoping (tenant, role, teacher classes)
is decided server-side from the authenticated user — never from request data.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import cached_property
from typing import Any

from django.db.models import Q, QuerySet
from rest_framework.exceptions import PermissionDenied

from services.core.accounts.decorators import get_user_role, _get_teacher_class_ids
from services.core.tenants.utils import resolve_tenant_for_user, user_can_access_tenant

STAFF_ROLES = ("admin", "accountant")


@dataclass
class AIContext:
    user: Any
    role: str | None
    tenant: Any = None
    extra: dict = field(default_factory=dict)

    @classmethod
    def from_request(cls, request) -> "AIContext":
        user = request.user
        role = get_user_role(user)
        # TenantMiddleware runs before DRF's JWT auth, so its membership check
        # was skipped for token-authenticated users. Re-check it here.
        tenant = getattr(request, "tenant", None)
        if tenant is not None and not user_can_access_tenant(user, tenant):
            raise PermissionDenied("You do not have access to this school tenant.")
        if tenant is None:
            tenant = resolve_tenant_for_user(user)
        return cls(user=user, role=role, tenant=tenant)

    @property
    def is_staff(self) -> bool:
        return self.role in STAFF_ROLES

    @cached_property
    def teacher_class_ids(self) -> list:
        if self.role != "teacher":
            return []
        return list(_get_teacher_class_ids(self.user))

    def scope_tenant(self, qs: QuerySet, path: str | None = "tenant") -> QuerySet:
        """Restrict `qs` to the caller's school.

        Rows with no tenant are kept: the app currently runs single-tenant and
        most existing rows have tenant=NULL. Rows belonging to another school
        are always excluded.
        """
        if self.tenant is None or not path:
            return qs
        return qs.filter(Q(**{path: self.tenant}) | Q(**{f"{path}__isnull": True}))

    def scope_classes(self, qs: QuerySet, class_path: str) -> QuerySet:
        """For teachers, restrict `qs` to their assigned classes."""
        if self.role == "teacher":
            return qs.filter(**{f"{class_path}__in": self.teacher_class_ids})
        return qs
