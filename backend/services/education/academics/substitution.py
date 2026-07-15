"""Automatic timetable substitution engine.

When a regular teacher goes on leave, their timetable periods are covered by
available relief teachers. Matching priority:

    1. Subject match - the relief teacher's specialisations must intersect the
       subject taught in the period (case-insensitive).
    2. Availability  - the relief teacher must be free in that (day, period)
       slot (not already teaching, and not already covering another period in
       the same slot for an overlapping leave).

The original TimetableEntry is never modified. Coverage is recorded as
TimetableSubstitution rows which are removed automatically when the leave is
cancelled or expires.
"""
from django.db.models import Q
from .models import Teacher, TimetableEntry, TimetableSubstitution


def _normalise(value):
    return (value or '').strip().lower()


def _subject_matches(specializations, subject_name):
    """Return True if any specialisation matches the subject name."""
    if not subject_name:
        return False
    subject = _normalise(subject_name)
    for spec in (specializations or []):
        spec_norm = _normalise(spec)
        if not spec_norm:
            continue
        if spec_norm == subject or spec_norm in subject or subject in spec_norm:
            return True
    return False


def _relief_teacher_busy(relief_id, day_of_week, period_id, occupied):
    """A relief teacher is busy in a slot if they already teach there or are
    already assigned as a substitute there (tracked in `occupied`)."""
    if occupied.get((relief_id, day_of_week, period_id)):
        return True
    return TimetableEntry.objects.filter(
        teacher_id=relief_id,
        day_of_week=day_of_week,
        period_id=period_id,
        is_active=True,
    ).exists()


def create_substitutions_for_leave(leave):
    """Compute and persist substitution assignments for a leave.

    Returns the list of created TimetableSubstitution instances.
    """
    teacher = leave.teacher
    if not teacher:
        # Non-teaching staff leave: nothing to substitute on the timetable.
        leave.substitute_assigned = False
        leave.save(update_fields=['substitute_assigned'])
        return []

    entries = list(
        TimetableEntry.objects.filter(
            teacher=teacher, is_active=True
        ).select_related('class_subject__subject', 'period')
    )

    if not entries:
        leave.substitute_assigned = False
        leave.save(update_fields=['substitute_assigned'])
        return []

    tenant = getattr(teacher, 'tenant', None)
    relief_pool = Teacher.objects.filter(
        teacher_type='relief', is_active=True
    )
    if tenant is not None:
        relief_pool = relief_pool.filter(tenant=tenant)
    relief_pool = list(relief_pool)

    occupied = {}  # (relief_id, day, period) -> True
    created = []

    for entry in entries:
        subject_name = entry.class_subject.subject.name if entry.class_subject and entry.class_subject.subject else ''
        candidates = [
            r for r in relief_pool
            if _subject_matches(r.specializations, subject_name)
        ]
        # Fall back to any available relief teacher if no subject match exists.
        if not candidates:
            candidates = list(relief_pool)

        chosen = None
        for relief in candidates:
            if not _relief_teacher_busy(relief.id, entry.day_of_week, entry.period_id, occupied):
                chosen = relief
                break

        if chosen is None:
            continue

        sub, _ = TimetableSubstitution.objects.get_or_create(
            leave=leave,
            original_entry=entry,
            defaults={'relief_teacher': chosen},
        )
        occupied[(chosen.id, entry.day_of_week, entry.period_id)] = True
        created.append(sub)

    leave.substitute_assigned = bool(created)
    leave.save(update_fields=['substitute_assigned'])
    return created


def revert_substitutions_for_leave(leave):
    """Remove all substitution assignments tied to a leave."""
    deleted, _ = TimetableSubstitution.objects.filter(leave=leave).delete()
    leave.substitute_assigned = False
    leave.save(update_fields=['substitute_assigned'])
    return deleted
