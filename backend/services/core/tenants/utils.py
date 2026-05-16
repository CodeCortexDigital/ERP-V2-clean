"""Tenant resolution helpers."""

from __future__ import annotations

from django.conf import settings
from django.db.models import Q

from .models import School, TenantMembership


def resolve_tenant_from_host(host: str) -> School | None:
    """Extract tenant from subdomain (e.g. springfield.erp.com)."""
    if not host:
        return None
    host = host.split(':')[0].lower()
    base = getattr(settings, 'TENANT_BASE_DOMAIN', 'erp.com').lower()
    if host in ('localhost', '127.0.0.1'):
        return None
    if host.endswith(f'.{base}'):
        subdomain = host[: -(len(base) + 1)].split('.')[0]
        if subdomain and subdomain not in ('www', 'api'):
            return School.objects.filter(subdomain=subdomain, is_active=True).first()
    parts = host.split('.')
    if len(parts) >= 3:
        return School.objects.filter(subdomain=parts[0], is_active=True).first()
    return None


def resolve_tenant_from_header(request) -> School | None:
    raw = request.META.get('HTTP_X_TENANT_ID') or request.META.get('HTTP_X_TENANT_CODE')
    if not raw:
        return None
    raw = str(raw).strip()
    code = raw.upper()
    if len(code) == 3:
        return School.objects.filter(tenant_code=code, is_active=True).first()
    return School.objects.filter(
        Q(id=raw) | Q(school_id__iexact=raw) | Q(subdomain__iexact=raw),
        is_active=True,
    ).first()


def resolve_tenant_from_session(request) -> School | None:
    tenant_id = request.session.get('active_tenant_id')
    if not tenant_id:
        return None
    return School.objects.filter(pk=tenant_id, is_active=True).first()


def resolve_tenant_for_user(user) -> School | None:
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    membership = (
        TenantMembership.objects.filter(user=user, is_active=True)
        .select_related('school')
        .order_by('-is_primary', 'joined_at')
        .first()
    )
    return membership.school if membership else None


def set_session_tenant(request, school: School) -> None:
    request.session['active_tenant_id'] = str(school.id)
    request.session['active_tenant_code'] = school.tenant_code


def user_can_access_tenant(user, school: School) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return TenantMembership.objects.filter(
        user=user, school=school, is_active=True
    ).exists()


def assign_user_to_tenant(user, school: School, role: str = 'staff', *, primary: bool = False):
    return TenantMembership.objects.update_or_create(
        user=user,
        school=school,
        defaults={'role': role, 'is_active': True, 'is_primary': primary},
    )


def get_default_school() -> School:
    school, _ = School.objects.get_or_create(
        tenant_code='DEF',
        defaults={
            'name': 'Default School',
            'subdomain': 'default',
            'school_id': 'DEF-001',
        },
    )
    return school
