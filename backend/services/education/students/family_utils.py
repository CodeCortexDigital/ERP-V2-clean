"""Sibling / family grouping helpers.

A student belongs to an existing family when a parent national id (NIC) already
exists on another student. We match on the father's NIC first and fall back to
the mother's NIC. Detected families are recorded on the denormalized
``select_family`` label (kept in sync across all members) plus ``total_siblings``
(the number of enrolled children sharing that family), which the finance pages
already use for family-level grouping.
"""

from __future__ import annotations


def _norm(value) -> str:
    return (value or '').strip()


def resolve_family_key(student):
    """Return (field_name, value) used to group this student's family.

    Father NIC is preferred; the mother NIC is used only when the father NIC is
    blank. Returns (None, None) when neither parent NIC is available.
    """
    father_nic = _norm(getattr(student, 'father_national_id', ''))
    if father_nic:
        return 'father_national_id', father_nic
    mother_nic = _norm(getattr(student, 'mother_national_id', ''))
    if mother_nic:
        return 'mother_national_id', mother_nic
    return None, None


def _family_label(members, student, key_value) -> str:
    """Prefer an existing non-empty family label; otherwise derive a stable one."""
    for member in members:
        existing = _norm(getattr(member, 'select_family', ''))
        if existing:
            return existing
    base = _norm(getattr(student, 'father_name', '')) or _norm(getattr(student, 'mother_name', ''))
    return f'{base} Family' if base else f'FAM-{key_value}'


def link_family(student):
    """Group ``student`` with existing siblings sharing a parent NIC.

    Updates ``select_family`` and ``total_siblings`` for every member of the
    family (including ``student``). Returns a summary dict, or ``None`` when no
    parent NIC is present. Uses the model's default (tenant-scoped, non-deleted)
    manager so families never span tenants.
    """
    from .models import Student

    field_name, key_value = resolve_family_key(student)
    if not key_value:
        return None

    lookup = {f'{field_name}__iexact': key_value}
    # Student.objects is soft-delete scoped but NOT tenant scoped, so constrain
    # the family to the student's own tenant to prevent cross-tenant merges.
    tenant_id = getattr(student, 'tenant_id', None)
    if tenant_id is not None:
        lookup['tenant_id'] = tenant_id

    members = list(Student.objects.filter(**lookup))
    if not members:
        return None

    label = _family_label(members, student, key_value)
    member_count = len(members)
    member_ids = [m.pk for m in members]

    Student.objects.filter(pk__in=member_ids).update(
        select_family=label,
        total_siblings=member_count,
    )

    return {
        'family': label,
        'members': member_count,
        'siblings_found': max(member_count - 1, 0),
        'matched_on': field_name,
    }
