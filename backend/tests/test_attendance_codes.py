"""Attendance codes, lesson attendance, absence reports and family alerts (Phase 4)."""
import datetime

import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.attendance.models import AttendanceNotice, AttendanceRecord, PeriodAttendance
from services.education.students.models import Guardian, StudentGuardian
from tests.conftest import ClassFactory, SchoolFactory, StudentFactory, UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _last_weekday(before=None):
    d = (before or datetime.date.today()) - datetime.timedelta(days=1)
    while d.weekday() >= 5:
        d -= datetime.timedelta(days=1)
    return d


@pytest.fixture
def setup(db):
    school = SchoolFactory(name='Oakwood School')
    admin = UserFactory(email='office@oakwood.test')
    TenantMembership.objects.create(user=admin, school=school, role='admin', is_primary=True)
    cls = ClassFactory(school=school, name='Grade 4')
    kid = StudentFactory(tenant=school, current_class=cls, full_name='Noah Smith', father_name='', mother_name='', guardian_name='')
    mom = Guardian.objects.create(tenant=school, first_name='Emma', last_name='Smith', relationship='mother',
                                  email='emma@example.com')
    StudentGuardian.objects.create(tenant=school, student=kid, guardian=mom, is_primary=True, receives_messages=True)
    parent = UserFactory(email='emma@example.com')
    ParentProfile.objects.create(user=parent).linked_students.add(kid)
    return school, admin, cls, kid, parent


@pytest.mark.django_db(transaction=True)
def test_unexcused_absence_alerts_family_once_and_excused_does_not(setup):
    school, admin, cls, kid, parent = setup
    api = _client(admin)
    day = _last_weekday()
    res = api.patch(f'/api/v1/auth/attendance/student/{kid.id}/day/{day}/', {'status': 'absent'}, format='json')
    assert res.status_code == 200, res.content
    assert res.json()['code'] == 'Absent (unexcused)'
    assert len(mail.outbox) == 1 and 'emma@example.com' in mail.outbox[0].to
    with use_tenant(school):
        assert AttendanceNotice.objects.filter(student=kid, kind='absent').count() == 1

    # Saving the same day again does not send a second alert.
    api.patch(f'/api/v1/auth/attendance/student/{kid.id}/day/{day}/', {'status': 'absent', 'remarks': 'x'}, format='json')
    assert len(mail.outbox) == 1

    # An excused absence recorded by the office sends nothing.
    other = _last_weekday(day)
    res = api.patch(f'/api/v1/auth/attendance/student/{kid.id}/day/{other}/',
                    {'status': 'absent', 'is_excused': True, 'reason': 'medical'}, format='json')
    assert res.json()['code'] == 'Absent (excused)' and len(mail.outbox) == 1

    # A tardy with minutes late.
    third = _last_weekday(other)
    res = api.patch(f'/api/v1/auth/attendance/student/{kid.id}/day/{third}/', {'status': 'late', 'minutes_late': 12},
                    format='json')
    assert res.json()['code'] == 'Tardy (unexcused)' and '12 minutes late' in mail.outbox[-1].body


@pytest.mark.django_db(transaction=True)
def test_chronic_absence_warning(setup):
    school, admin, cls, kid, parent = setup
    api = _client(admin)
    api.put('/api/v1/auth/attendance/settings/', {'chronic_threshold': 2, 'alert_absent': False}, format='json')
    d1 = _last_weekday()
    d2 = _last_weekday(d1)
    for d in (d2, d1):
        api.patch(f'/api/v1/auth/attendance/student/{kid.id}/day/{d}/', {'status': 'absent'}, format='json')
    with use_tenant(school):
        kinds = list(AttendanceNotice.objects.filter(student=kid).values_list('kind', flat=True))
    assert kinds == ['chronic']  # per-day alerts switched off, warning still sent
    assert 'missed 2 school days' in mail.outbox[-1].body


@pytest.mark.django_db(transaction=True)
def test_parent_reports_absence_and_office_approves(setup):
    school, admin, cls, kid, parent = setup
    day = _last_weekday()
    res = _client(parent).post('/api/v1/auth/attendance/absence-reports/', {
        'student_id': str(kid.id), 'start_date': str(day), 'end_date': str(day), 'reason': 'illness',
        'note': 'Fever',
    }, format='json')
    assert res.status_code == 201, res.content
    rid = res.json()['id']
    assert res.json()['status'] == 'pending'
    # A stranger cannot report for this child.
    stranger = UserFactory(email='x@example.com')
    ParentProfile.objects.create(user=stranger)
    assert _client(stranger).post('/api/v1/auth/attendance/absence-reports/', {
        'student_id': str(kid.id), 'start_date': str(day), 'end_date': str(day)}, format='json').status_code in (403, 404)

    pending = _client(admin).get('/api/v1/auth/attendance/absence-reports/?status=pending').json()
    assert [r['id'] for r in pending] == [rid]
    res = _client(admin).post(f'/api/v1/auth/attendance/absence-reports/{rid}/review/', {'decision': 'approve'}, format='json')
    assert res.status_code == 200 and res.json()['status'] == 'approved'
    with use_tenant(school):
        rec = AttendanceRecord.objects.get(student=kid, date=day)
    assert rec.status == 'absent' and rec.is_excused and rec.reason == 'illness'
    assert not AttendanceNotice.objects.filter(kind='absent').exists()  # excused: no alert

    cal = _client(parent).get(f'/api/v1/auth/attendance/student/{kid.id}/calendar/?year={day.year}&month={day.month}').json()
    entry = next(d for d in cal['days'] if d['date'] == str(day))
    assert entry['code'] == 'Absent (excused)' and entry['reason_label'] == 'Illness'
    assert cal['year_summary']['absent_excused'] == 1 and cal['can_edit'] is False


@pytest.mark.django_db(transaction=True)
def test_lesson_attendance_rolls_up_to_the_day(setup):
    school, admin, cls, kid, parent = setup
    api = _client(admin)
    api.put('/api/v1/auth/attendance/settings/', {'mode': 'period', 'alert_tardy': True}, format='json')
    day = _last_weekday()
    roster = api.get(f'/api/v1/auth/attendance/periods/?class_id={cls.id}&date={day}').json()
    assert roster['mode'] == 'period' and roster['students'][0]['full_name'] == 'Noah Smith'

    def mark(n, status, **extra):
        return api.post('/api/v1/auth/attendance/periods/save/', {
            'date': str(day), 'class_id': str(cls.id), 'period_number': n, 'subject': f'Subject {n}',
            'records': [{'student_id': str(kid.id), 'status': status, **extra}]}, format='json')

    assert mark(1, 'late', minutes_late=7).status_code == 200
    assert mark(2, 'present').status_code == 200
    with use_tenant(school):
        rec = AttendanceRecord.objects.get(student=kid, date=day)
        assert rec.status == 'late' and rec.minutes_late == 7
        assert PeriodAttendance.objects.filter(student=kid, date=day).count() == 2
    assert 'arrived late' in mail.outbox[-1].body

    # Another teacher's class is off limits for a teacher; future dates are refused.
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    assert api.post('/api/v1/auth/attendance/periods/save/', {'date': str(tomorrow), 'class_id': str(cls.id),
                    'period_number': 1, 'records': []}, format='json').status_code == 400
    outsider = UserFactory(email='nobody@example.com')
    assert _client(outsider).get(f'/api/v1/auth/attendance/periods/?class_id={cls.id}').status_code == 403
