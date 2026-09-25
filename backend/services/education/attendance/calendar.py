"""School calendar helpers for attendance (weekends, default statuses)."""

from __future__ import annotations

from datetime import date

from django.utils.dateparse import parse_date


def parse_attendance_date(value) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        parsed = parse_date(value)
        if parsed:
            return parsed
    return date.today()


def is_weekend(d: date) -> bool:
    return d.weekday() in (5, 6)


def is_school_day(d: date) -> bool:
    """Monday–Friday are school days, unless the school calendar marks a holiday or closure."""
    if is_weekend(d):
        return False
    try:
        from services.education.schoolcalendar.api import school_closed_on

        return not school_closed_on(d)
    except Exception:  # no school selected (e.g. a maintenance command)
        return True


def default_status_for_date(d: date) -> str:
    if is_weekend(d):
        return 'holiday'
    return 'present'


def normalize_status_for_date(d: date, status: str | None) -> str:
    status = (status or default_status_for_date(d)).lower()
    allowed = {'present', 'absent', 'late', 'excused', 'holiday', 'early_dismissal'}
    if status not in allowed:
        return default_status_for_date(d)
    return status
