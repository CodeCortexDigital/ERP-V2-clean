"""Retention by record type (P17), extending Phase 21's rules for the activity log and sign-in history.

Each school chooses, per kind of record, how long it is kept and what happens after that. 0 means "keep" (the
default for everything, so nothing is removed until the school decides). Run daily by `apply_retention`.

- Students who left or graduated: **anonymised** (name, contacts, ID numbers, address, birth day, health notes and
  documents removed; their guardians too unless they have another child at the school; the portal login switched off).
  Marks, attendance and invoices stay, so school statistics and accounts still add up.
- Everything else is **deleted**: admission applications that were not enrolled, conversations, announcements, text
  and email delivery logs, attendance alerts and parents' absence notes, and paid or cancelled invoices (at least 5
  years, because accounting law usually asks for 6 to 7).
"""
from __future__ import annotations

from datetime import timedelta

from django.apps import apps
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from services.core.tenants.registry import tenant_paths

# key: (label, action, unit, minimum in days, help)
TYPES = {
    'left_students': ('Students who left or graduated', 'anonymise', 'years', 365,
                      'Counted from the day they left. Marks, attendance and invoices stay; who they were is removed.'),
    'declined_applications': ('Admission applications that did not enrol', 'delete', 'months', 30,
                              'Declined and withdrawn applications, with their documents, counted from the last change.'),
    'messages': ('Conversations between families and staff', 'delete', 'months', 90,
                 'Counted from the last message in the conversation.'),
    'announcements': ('Announcements', 'delete', 'months', 90, 'Counted from when they were sent.'),
    'delivery_logs': ('Text and email delivery logs', 'delete', 'months', 30, 'SMS, WhatsApp and system email records.'),
    'attendance_notices': ('Attendance alerts and absence notes', 'delete', 'months', 90,
                           "Alerts sent to families and parents' absence notes. The attendance itself stays."),
    'paid_invoices': ('Paid or cancelled invoices and their payments', 'delete', 'years', 5 * 365,
                      'Most countries require accounts to be kept 6 to 7 years; at least 5 years is enforced.'),
}
UNIT_DAYS = {'months': 30, 'years': 365}


def settings_for(school) -> dict:
    saved = ((getattr(school, 'settings_json', None) or {}).get('retention') or {}) if school else {}
    out = {}
    for key in TYPES:
        try:
            out[key] = max(0, int(saved.get(key, 0)))
        except (TypeError, ValueError):
            out[key] = 0
    return out


def save(school, patch: dict) -> tuple[dict | None, str | None]:
    """Values are in days (0 = keep). Too short a time is refused."""
    current = settings_for(school)
    for key, value in (patch or {}).items():
        if key not in TYPES:
            continue
        try:
            value = int(value)
        except (TypeError, ValueError):
            return None, f'{TYPES[key][0]}: enter a whole number.'
        if value and value < TYPES[key][3]:
            unit = TYPES[key][2]
            return None, f'{TYPES[key][0]}: keep them at least {TYPES[key][3] // UNIT_DAYS[unit]} {unit}, or choose "keep".'
        current[key] = max(0, value)
    data = dict(school.settings_json or {})
    data['retention'] = current
    school.settings_json = data
    school.save(update_fields=['settings_json'])
    return current, None


def _qs(label, school):
    Model = apps.get_model(label)
    path = tenant_paths().get(label)
    if path:
        return Model._base_manager.filter(**{path: school})
    return Model._base_manager.filter(school=school)


def _due(school, key, days):
    cutoff = timezone.now() - timedelta(days=days)
    day = cutoff.date()
    if key == 'left_students':
        Enrollment = apps.get_model('education_students', 'Enrollment')
        left = (Enrollment._base_manager.filter(student__tenant=school, status__in=('withdrawn', 'graduated'))
                .values('student').annotate(last=Max('end_date')).filter(last__lt=day).values_list('student', flat=True))
        return {'education_students.Student': _qs('education_students.Student', school)
                .filter(pk__in=list(left), is_active=False).exclude(full_name__startswith='Former student')}
    if key == 'declined_applications':
        return {'education_admissions.Application': _qs('education_admissions.Application', school)
                .filter(status__in=('rejected', 'withdrawn'), updated_at__lt=cutoff)}
    if key == 'messages':
        return {'education_communication.Conversation': _qs('education_communication.Conversation', school)
                .filter(last_message_at__lt=cutoff)}
    if key == 'announcements':
        return {'education_communication.Announcement': _qs('education_communication.Announcement', school)
                .filter(Q(sent_at__lt=cutoff) | Q(sent_at__isnull=True, created_at__lt=cutoff))}
    if key == 'delivery_logs':
        return {'education_communication.Message': _qs('education_communication.Message', school).filter(created_at__lt=cutoff),
                'core_security.EmailLog': apps.get_model('core_security', 'EmailLog')._base_manager
                .filter(school=school, created_at__lt=cutoff)}
    if key == 'attendance_notices':
        return {'education_attendance.AttendanceNotice': _qs('education_attendance.AttendanceNotice', school).filter(date__lt=day),
                'education_attendance.AbsenceReport': _qs('education_attendance.AbsenceReport', school)
                .filter(end_date__lt=day).exclude(status='pending')}
    if key == 'paid_invoices':
        return {'education_finance.Invoice': _qs('education_finance.Invoice', school)
                .filter(status__in=('paid', 'cancelled'), due_date__lt=day)}
    return {}


def preview(school) -> dict:
    """How many records each rule would remove now (a rule that is off shows what it would do at its minimum)."""
    rules = settings_for(school)
    out = {}
    for key, (_label, _action, _unit, minimum, _help) in TYPES.items():
        try:
            out[key] = sum(qs.count() for qs in _due(school, key, rules[key] or minimum).values())
        except LookupError:
            out[key] = 0
    return out


def _anonymise_student(student):
    from services.core.backup.anonymise import fake

    Student = type(student)
    fields = {f.name: f for f in Student._meta.concrete_fields}
    rules = {'email': 'blank', 'phone': 'blank', 'guardian_name': 'blank', 'emergency_contact': 'blank',
             'father_name': 'blank', 'mother_name': 'blank', 'guardian_phone': 'blank', 'address': 'blank',
             'birth_form_id': 'blank', 'father_national_id': 'blank', 'father_mobile': 'blank', 'mother_national_id': 'blank',
             'mother_mobile': 'blank', 'father_occupation': 'blank', 'mother_occupation': 'blank', 'father_income': 'blank',
             'mother_income': 'blank', 'father_education': 'blank', 'mother_education': 'blank',
             'father_profession': 'blank', 'mother_profession': 'blank', 'city': 'blank', 'postal_code': 'blank'}
    changes = {k: fake(kind, getattr(student, k), fields[k]) for k, kind in rules.items() if k in fields}
    if student.date_of_birth:
        changes['date_of_birth'] = student.date_of_birth.replace(month=1, day=1)
    changes['full_name'] = f'Former student {student.student_id or str(student.pk)[:8]}'
    if 'profile_picture' in fields:
        changes['profile_picture'] = ''
    email = student.email
    Student._base_manager.filter(pk=student.pk).update(**changes)
    # Health, documents and guardians who have no other child here.
    for label in ('education_students.StudentHealth', 'education_students.Immunization', 'education_students.StudentDocument'):
        try:
            Model = apps.get_model(label)
        except LookupError:
            continue
        rows = Model._base_manager.filter(student=student)
        for f in [f for f in Model._meta.concrete_fields if f.get_internal_type() == 'FileField']:
            for row in rows:
                getattr(row, f.name).delete(save=False) if getattr(row, f.name) else None
        rows.delete()
    StudentGuardian = apps.get_model('education_students', 'StudentGuardian')
    Guardian = apps.get_model('education_students', 'Guardian')
    for link in StudentGuardian._base_manager.filter(student=student).select_related('guardian'):
        g = link.guardian
        link.delete()
        if not StudentGuardian._base_manager.filter(guardian=g, student__is_active=True).exists():
            Guardian._base_manager.filter(pk=g.pk).update(first_name='Former', last_name='guardian', email='', mobile_phone='',
                                                          home_phone='', work_phone='', national_id='', address='')
    # The student's own portal login.
    if email:
        User = apps.get_model('core_accounts', 'User')
        for u in User._base_manager.filter(email__iexact=email, is_superuser=False):
            u.is_active = False
            u.email = f'former-{u.pk}@deleted.invalid'
            u.first_name, u.last_name, u.full_name, u.phone_number = 'Former', 'student', 'Former student', ''
            u.set_unusable_password()
            u.save()


def apply(school, *, dry_run=False) -> dict:
    """Carry out the school's rules. Returns what was done per rule."""
    rules = settings_for(school)
    done = {}
    for key, days in rules.items():
        if not days:
            continue
        try:
            sets = _due(school, key, days)
        except LookupError:
            continue
        count = sum(qs.count() for qs in sets.values())
        if not count or dry_run:
            done[key] = count
            continue
        with transaction.atomic():
            if TYPES[key][1] == 'anonymise':
                for qs in sets.values():
                    for student in qs:
                        _anonymise_student(student)
            else:
                for qs in sets.values():
                    qs.delete()
        done[key] = count
    if done and not dry_run and any(done.values()):
        from services.core.audit.models import AuditLog

        AuditLog.objects.create(school=school, action='DELETE', resource_type='v1/security/retention/',
                                new_data={'removed': done})
    return done


# ---- API (/api/v1/security/retention/) --------------------------------------------------------------------------
from rest_framework.decorators import api_view, permission_classes  # noqa: E402
from rest_framework.permissions import IsAuthenticated  # noqa: E402
from rest_framework.response import Response  # noqa: E402


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def retention_view(request):
    from .api import _admin_school

    school, error = _admin_school(request)
    if error:
        return error
    if request.method == 'PUT':
        saved, problem = save(school, request.data or {})
        if problem:
            return Response({'error': problem}, status=400)
    rules = settings_for(school)
    counts = preview(school)
    return Response({'rules': [{'key': k, 'label': t[0], 'action': t[1], 'unit': t[2], 'minimum_days': t[3], 'help': t[4],
                                'days': rules[k], 'due_now': counts[k]} for k, t in TYPES.items()]})
