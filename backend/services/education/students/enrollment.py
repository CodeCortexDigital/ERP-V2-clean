"""Enrollment history: every class and section a student has been in, and how it ended."""
from __future__ import annotations

from django.utils import timezone

from .models import Enrollment


def _year_for(school_class, tenant_id):
    """The current school year; classes are reused every year, so theirs may be out of date."""
    from services.education.academics.models import AcademicYear

    year = AcademicYear.objects.filter(tenant_id=tenant_id, is_active=True).first()
    if year:
        return year.pk
    return school_class.academic_year_id if school_class is not None else None


def _closing_status(old_class, new_class, now_active: bool) -> str:
    if not now_active or new_class is None:
        return 'withdrawn'
    old_level = getattr(old_class, 'grade_level', None)
    new_level = getattr(new_class, 'grade_level', None)
    if old_level is not None and new_level is not None:
        return 'promoted' if new_level > old_level else 'transferred'
    # Without grade levels: a different class counts as a promotion, a new section as a move.
    return 'promoted' if old_class is not None and old_class.pk != new_class.pk else 'transferred'


def sync_enrollment(student, before: dict | None):
    """Called after a student is saved. ``before`` holds the old class, section and is_active."""
    today = timezone.localdate()
    current = Enrollment.objects.filter(student=student, end_date__isnull=True).order_by('-start_date').first()
    old_class_id = before['current_class_id'] if before else None
    old_section_id = before['current_section_id'] if before else None
    was_active = before['is_active'] if before else None

    changed_place = before is None or old_class_id != student.current_class_id or old_section_id != student.current_section_id
    reactivated = before is not None and not was_active and student.is_active
    deactivated = before is not None and was_active and not student.is_active
    if not (changed_place or reactivated or deactivated) and current is not None:
        return current

    new_class = student.current_class if student.current_class_id else None
    if current is not None and (changed_place or deactivated):
        current.end_date = today
        current.status = _closing_status(current.school_class, new_class, student.is_active)
        current.save(update_fields=['end_date', 'status'])
        current = None

    if new_class is not None and student.is_active and current is None:
        current = Enrollment.objects.create(
            tenant_id=student.tenant_id, student=student, academic_year_id=_year_for(new_class, student.tenant_id),
            school_class=new_class, section_id=student.current_section_id, class_name=new_class.name,
            start_date=(student.admission_date if before is None and student.admission_date else today),
        )
    return current


def history(student) -> list[dict]:
    return [
        {'id': str(e.id), 'academic_year': e.academic_year.name if e.academic_year_id else '',
         'class_name': e.school_class.name if e.school_class_id else e.class_name,
         'section': e.section.name if e.section_id else '', 'start_date': e.start_date.isoformat(),
         'end_date': e.end_date.isoformat() if e.end_date else None, 'status': e.status,
         'status_label': e.get_status_display(), 'note': e.note}
        for e in Enrollment.objects.filter(student=student).select_related('academic_year', 'school_class', 'section')
    ]
