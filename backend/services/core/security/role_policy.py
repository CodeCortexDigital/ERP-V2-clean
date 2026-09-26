"""Which changes each role may make (P1). Checked on every signed-in API request, before any view runs.

Many older views only check that someone is signed in. Rather than trusting each of them, this is one rule for all:
- parents and students may only change things on a short list (their portal, messages, bookings, library, cafeteria,
  paying fees online, their own account and privacy);
- teachers and staff may not change the school's structure, money, settings or accounts;
- administrators (and the platform owner) are not limited here; each view still applies its own checks.
Reading is not limited here: views filter what each person sees.
"""
from __future__ import annotations

from rest_framework.exceptions import PermissionDenied

SAFE = ('GET', 'HEAD', 'OPTIONS')

# Always allowed for anyone signed in: signing in and out, their own account, security and privacy, notifications.
PERSONAL = (
    'login', 'logout', 'token/refresh', 'firebase/login', 'settings/change-password', 'me/', 'me',
    'security/me/', 'security/verify-email/', 'security/password-reset/', 'security/2fa/', 'privacy/', 'support/', 'notifications/', 'user-notifications/',
    'ai/', 'search',
)

# Parents and students: what the family portal lets them do.
FAMILY = PERSONAL + (
    'portal/', 'family/', 'messaging/', 'messages/', 'communication/conversations', 'communication/messages',
    'communication/inbox', 'communication/threads', 'communication/announcements', 'attendance/absence-reports', 'calendar/', 'meetings/', 'library/', 'cafeteria/',
    'finance/payments/session', 'finance/online', 'admissions/', 'parent/', 'student/', 'homework-submissions/',
    'academics/homework-submissions', 'academics/homework/submit',
)

# Teachers and staff: everything except the office's areas.
OFFICE_ONLY = (
    'finance/', 'invoices', 'payments', 'fee-structures', 'late-fee-rules', 'installment-plans', 'scholarships',
    'student-scholarships', 'finance-settings', 'finance-summary', 'payroll', 'salary', 'ledger', 'account-heads',
    'tenants/', 'integrations/', 'imports/', 'credentials/', 'security/', 'billing/', 'portability/', 'admin/',
    'features/', 'core/audit/', 'analytics/batch-risk-assessment', 'employee/credits', 'employee/summary',
    'academic-years', 'academics/academic-years', 'academics/terms', 'academics/classes', 'academics/sections',
    'academics/subjects', 'academics/class-subjects', 'academics/teacher-assignments', 'academics/grade-scales',
    'academics/assessment-types', 'academics/assessment-weightages', 'academics/teachers', 'academics/leave-balances',
    'classes', 'sections', 'subjects', 'class-subjects', 'teachers', 'students/', 'admissions/applications',
    'inventory/', 'insights/',
)
# Staff jobs that live under office areas (bus duty, the cafeteria till, their own leave and tasks).
STAFF_EXCEPTIONS = ('finance/payments/session', 'academics/teacher-leaves', 'security/me/')


def api_path(path: str) -> str:
    """'/api/v1/auth/education/library/loans/' -> 'library/loans/'."""
    p = path.split('/api/', 1)[-1]
    for prefix in ('v1/', 'v2/'):
        if p.startswith(prefix):
            p = p[len(prefix):]
    for prefix in ('auth/', 'education/'):
        if p.startswith(prefix):
            p = p[len(prefix):]
    return p


def _starts(path, prefixes):
    return any(path == p.rstrip('/') or path.startswith(p) for p in prefixes)


REFUSED = 'Your account can’t make this change. If you think it should, ask the school office.'


def _refuse(request, user):
    """Record the refused attempt in the school's activity log, then refuse. (When the sign-in check refuses, the
    request never gets a user, so the log middleware can't see who it was.)"""
    try:
        from services.core.audit.models import AuditLog

        school = getattr(getattr(request, '_request', request), 'tenant', None)
        AuditLog.objects.create(user=user, school=school if getattr(school, 'pk', None) else None, action='PERMISSION_DENIED',
                                resource_type=request.path.replace('/api/', '', 1)[:128],
                                new_data={'status_code': 403, 'method': request.method, 'rule': 'role'})
    except Exception:
        pass
    raise PermissionDenied(REFUSED)


def check(request, user, role):
    if request.method in SAFE or getattr(user, 'is_superuser', False) or role == 'admin':
        return
    path = api_path(request.path)
    if role in ('parent', 'student'):
        if not _starts(path, FAMILY):
            _refuse(request, user)
        return
    if role in ('teacher', 'staff', 'accountant') or role is None:
        if _starts(path, OFFICE_ONLY) and not _starts(path, STAFF_EXCEPTIONS) and not _starts(path, PERSONAL):
            _refuse(request, user)
