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


def is_sunday(d: date) -> bool:
    return d.weekday() == 6


def is_school_day(d: date) -> bool:
    """Monday–Saturday are school days; Sunday is not."""
    return not is_sunday(d)


def default_status_for_date(d: date) -> str:
    if is_sunday(d):
        return 'holiday'
    return 'present'


def normalize_status_for_date(d: date, status: str | None) -> str:
    """On Sundays only holiday/absent/late/excused are stored; present becomes holiday."""
    status = (status or default_status_for_date(d)).lower()
    if is_sunday(d) and status == 'present':
        return 'holiday'
    allowed = {'present', 'absent', 'late', 'excused', 'holiday'}
    if status not in allowed:
        return default_status_for_date(d)
    if not is_school_day(d) and status == 'present':
        return 'holiday'
    return status
