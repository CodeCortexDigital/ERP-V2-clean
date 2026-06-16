"""Attendance write helpers (bulk save, auto-present for school days)."""

from __future__ import annotations

import logging
from datetime import date

from django.apps import apps
from django.db import IntegrityError, transaction

from services.core.accounts.decorators import get_user_role
from .calendar import (
    default_status_for_date,
    is_school_day,
    normalize_status_for_date,
    parse_attendance_date,
)

logger = logging.getLogger(__name__)

Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
Student = apps.get_model('education_students', 'Student')


def _teacher_class_ids(user) -> list[str]:
    if not hasattr(user, 'teacher_profile'):
        return []
    try:
        return [str(pk) for pk in user.teacher_profile.assigned_classes.values_list('id', flat=True)]
    except Exception:
        return []


def upsert_attendance_record(
    *,
    student,
    record_date: date,
    status: str,
    course_id: str = '',
    remarks: str = '',
    marked_by=None,
) -> bool:
    """Create or update one row (includes soft-deleted). Returns True if created."""
    status = normalize_status_for_date(record_date, status)
    course_id = course_id or ''
    remarks = remarks or ''

    attendance = Attendance.all_objects.filter(student=student, date=record_date).first()
    if attendance:
        created = False
        if attendance.deleted_at:
            attendance.restore()
        attendance.status = status
        attendance.course_id = course_id
        attendance.remarks = remarks
        if marked_by is not None:
            attendance.marked_by = marked_by
        attendance.save(update_fields=['status', 'course_id', 'remarks', 'marked_by', 'deleted_at', 'updated_at'])
        return created

    try:
        Attendance.all_objects.create(
            student=student,
            date=record_date,
            status=status,
            course_id=course_id,
            remarks=remarks,
            marked_by=marked_by,
            deleted_at=None,
        )
        return True
    except IntegrityError:
        attendance = Attendance.all_objects.filter(student=student, date=record_date).first()
        if attendance:
            if attendance.deleted_at:
                attendance.restore()
            attendance.status = status
            attendance.course_id = course_id
            attendance.remarks = remarks
            if marked_by is not None:
                attendance.marked_by = marked_by
            attendance.save(update_fields=['status', 'course_id', 'remarks', 'marked_by', 'deleted_at', 'updated_at'])
            return False
        raise


def _students_queryset(class_id=None, section_id=None):
    qs = Student.objects.filter(is_active=True)
    if class_id:
        qs = qs.filter(current_class_id=class_id)
    if section_id:
        qs = qs.filter(current_section_id=section_id)
    return qs


def ensure_present_for_school_day(
    query_date: date,
    student_queryset=None,
    *,
    class_id=None,
    section_id=None,
) -> int:
    """Auto-mark students present on school days (default before teacher edits)."""
    if not is_school_day(query_date):
        return 0

    qs = student_queryset if student_queryset is not None else _students_queryset(class_id, section_id)
    student_ids = list(qs.values_list('id', flat=True))
    if not student_ids:
        return 0

    existing_ids = set(
        Attendance.all_objects.filter(date=query_date, student_id__in=student_ids).values_list(
            'student_id', flat=True
        )
    )
    to_create = []
    for student in qs.exclude(id__in=existing_ids).iterator():
        to_create.append(
            Attendance(
                student=student,
                date=query_date,
                status='present',
                course_id=str(student.current_class_id) if getattr(student, 'current_class_id', None) else '',
                remarks='Auto-marked present',
            )
        )
    created = 0
    if to_create:
        Attendance.all_objects.bulk_create(to_create, ignore_conflicts=True)
        created = len(to_create)

    # Rows never marked by a teacher default back to present on school days
    Attendance.all_objects.filter(
        date=query_date,
        student_id__in=student_ids,
        marked_by__isnull=True,
    ).exclude(status='present').update(status='present', remarks='Auto-marked present')

    return created


def ensure_holiday_for_non_school_day(
    query_date: date,
    *,
    class_id=None,
    section_id=None,
) -> int:
    """Default Sunday / non-school days to holiday."""
    if is_school_day(query_date):
        return 0

    qs = _students_queryset(class_id, section_id)
    student_ids = list(qs.values_list('id', flat=True))
    if not student_ids:
        return 0

    existing_ids = set(
        Attendance.all_objects.filter(date=query_date, student_id__in=student_ids).values_list(
            'student_id', flat=True
        )
    )
    to_create = []
    for student in qs.exclude(id__in=existing_ids).iterator():
        to_create.append(
            Attendance(
                student=student,
                date=query_date,
                status='holiday',
                course_id=str(student.current_class_id) if getattr(student, 'current_class_id', None) else '',
                remarks='Non-school day',
            )
        )
    created = 0
    if to_create:
        Attendance.all_objects.bulk_create(to_create, ignore_conflicts=True)
        created = len(to_create)

    Attendance.all_objects.filter(
        date=query_date,
        student_id__in=student_ids,
        marked_by__isnull=True,
    ).exclude(status='holiday').update(status='holiday', remarks='Non-school day')

    return created


def ensure_defaults_for_date(query_date: date, *, class_id=None, section_id=None) -> None:
    if is_school_day(query_date):
        ensure_present_for_school_day(query_date, class_id=class_id, section_id=section_id)
    else:
        ensure_holiday_for_non_school_day(query_date, class_id=class_id, section_id=section_id)


def serialize_attendance_record(record) -> dict:
    marked_by_name = ''
    if getattr(record, 'marked_by_id', None) and record.marked_by:
        marked_by_name = record.marked_by.get_full_name() or record.marked_by.email or ''
    return {
        'id': str(record.id),
        'student_id': str(record.student_id),
        'student_name': record.student.full_name if hasattr(record, 'student') else '',
        'status': record.status,
        'date': str(record.date),
        'remarks': record.remarks or '',
        'course_id': record.course_id or '',
        'marked_by_id': str(record.marked_by_id) if record.marked_by_id else None,
        'marked_by_name': marked_by_name,
        'updated_at': record.updated_at.isoformat() if record.updated_at else None,
    }


def bulk_save_attendance_records(user, records: list) -> dict:
    """
    Save bulk attendance from API payload.
    School days default to present; Sundays to holiday unless teacher sets absent/late.
    """
    role = get_user_role(user)
    if role not in ('admin', 'teacher'):
        return {
            'error': 'Permission denied',
            'created': 0,
            'updated': 0,
            'errors': [],
            'forbidden': True,
        }

    teacher_classes = _teacher_class_ids(user) if role == 'teacher' else []
    created_count = 0
    updated_count = 0
    errors: list[str] = []

    from django.utils import timezone
    with transaction.atomic():
        for record in records or []:
            student_id = record.get('student_id')
            if not student_id:
                continue

            record_date = parse_attendance_date(record.get('date'))
            status_val = normalize_status_for_date(
                record_date,
                record.get('status'),
            )
            
            # Prevent future present/absent/late marking in bulk
            if record_date > timezone.localtime().date():
                if status_val in ['present', 'absent', 'late']:
                    errors.append(f"Future dates can only be marked as Holiday or Excused. Skipped student {student_id} on {record_date}.")
                    continue

            class_id = record.get('class_id') or record.get('course_id') or ''
            if class_id:
                class_id = str(class_id)
            remarks = record.get('remarks') or ''
            if status_val == 'holiday' and not remarks:
                remarks = 'Non-school day' if not is_school_day(record_date) else remarks

            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                errors.append(f'Student not found: {student_id}')
                continue

            if role == 'teacher' and str(student.current_class_id) not in teacher_classes:
                errors.append(f'Permission denied for student: {student_id}')
                continue

            try:
                created = upsert_attendance_record(
                    student=student,
                    record_date=record_date,
                    status=status_val,
                    course_id=class_id,
                    remarks=remarks,
                    marked_by=user,
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except Exception as exc:
                logger.exception('Failed to save attendance for student %s', student_id)
                errors.append(f'{student_id}: {exc}')

    return {
        'message': f'Attendance saved: {created_count} created, {updated_count} updated',
        'created': created_count,
        'updated': updated_count,
        'errors': errors,
        'forbidden': False,
    }


def ensure_attendance_for_past_days(till_date: date, days_limit: int = 30) -> None:
    """Ensure default attendance records are generated for all past days up to till_date."""
    from datetime import timedelta
    from django.db.models import Count
    
    start_date = till_date - timedelta(days=days_limit)
    total_students = Student.objects.filter(is_active=True).count()
    if total_students == 0:
        return

    # Get the count of existing attendance records per date in the range
    existing_counts = dict(
        Attendance.all_objects.filter(date__gte=start_date, date__lte=till_date)
        .values('date')
        .annotate(count=Count('id'))
        .values_list('date', 'count')
    )

    for i in range(days_limit, -1, -1):
        day = till_date - timedelta(days=i)
        # If any student is missing attendance for this date, ensure defaults
        if existing_counts.get(day, 0) < total_students:
            ensure_defaults_for_date(day)
