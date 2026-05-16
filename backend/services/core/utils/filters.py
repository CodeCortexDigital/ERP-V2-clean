from datetime import datetime
from django.utils.dateparse import parse_date


def parse_status_param(value):
    if value is None:
        return None

    normalized = str(value).strip().lower()
    if normalized in ('active', 'true', '1', 'yes', 'y'):
        return True
    if normalized in ('inactive', 'false', '0', 'no', 'n'):
        return False
    return None


def parse_date_param(value):
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    parsed = parse_date(str(value))
    if parsed:
        return parsed

    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None
