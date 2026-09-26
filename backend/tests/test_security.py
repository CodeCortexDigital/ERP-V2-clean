"""Privacy & security (Phase 21): closed public endpoints, sign-in protection, sign out everywhere, the school's
activity log, who has access, the school's rules, retention, and everyone's own data."""
import datetime
import re
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import URLPattern, URLResolver, get_resolver
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.audit.models import AuditLog
from services.core.security.models import SignInEvent
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import SchoolClass, Subject, Teacher
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

LOGIN = '/api/v1/auth/login/'
S = '/api/v1/security'
User = get_user_model()


def _client(user=None, token=None):
    c = APIClient()
    if user is not None or token is not None:
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {token or RefreshToken.for_user(user).access_token}')
    return c


def _user(email, **kw):
    return User.objects.filter(email=email).first() or UserFactory(email=email, **kw)


@pytest.fixture
def sec(db):
    s = SchoolFactory(name='Hillside School')
    admin = _user('office@hillside.test', password='Office-pass-1')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    admin2 = _user('head@hillside.test')
    TenantMembership.objects.create(user=admin2, school=s, role='admin')
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    with use_tenant(s):
        g6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        maths = Subject.objects.create(tenant=s, name='Maths', code='M')
        from services.education.exams.models import Exam
        exam = Exam.objects.create(tenant=s, title='Midterm', exam_type='midterm', class_ref=g6, subject=maths,
                                   total_marks=50, passing_marks=20, exam_date=datetime.date(2026, 10, 10))
    amy = StudentFactory(tenant=s, current_class=g6, full_name='Amy Pupil', email='amy@hillside.test', **kw)
    student_user = _user('amy@hillside.test')
    student_user.set_password('Amy-pass-123')  # the student record already created her login
    student_user.save()
    # A teacher whose Django "is_staff" flag is set (the demo seed did this): it must not make them an admin.
    teacher_user = _user('tess@hillside.test', password='Tess-pass-123')
    with use_tenant(s):
        Teacher.objects.create(tenant=s, full_name='Tess Teacher', email='tess@hillside.test', employee_id='T1',
                               joining_date='2020-01-01', monthly_salary=Decimal('50000'))
    teacher_user.is_staff = True
    teacher_user.save(update_fields=['is_staff'])
    other = SchoolFactory(name='Other School')
    other_admin = _user('office@other.test')
    TenantMembership.objects.create(user=other_admin, school=other, role='admin', is_primary=True)
    return dict(s=s, admin=admin, admin2=admin2, office=_client(admin), exam=exam, amy=amy, student_user=student_user,
                teacher_user=teacher_user, other=other, other_admin=other_admin)


# ---- Closed doors ---------------------------------------------------------------------------------------------

PUBLIC = [  # answers without sign-in on purpose
    r'^/api/v1/health/(ready/|live/|version/)?$', r'^/api/v1/auth/logout/$', r'^/api/v1/tenants/signup/config/$',
    r'^/api/v1/communication/whatsapp/webhook/$', r'^/api/v1/billing/plans/$',
]


def _routes(patterns, prefix=''):
    for p in patterns:
        if isinstance(p, URLResolver):
            yield from _routes(p.url_patterns, prefix + str(p.pattern))
        elif isinstance(p, URLPattern):
            yield prefix + str(p.pattern)


@pytest.mark.django_db
def test_nothing_answers_without_signing_in_except_the_public_doors(sec):
    anyone = APIClient()
    seen, open_doors = set(), []
    uid = '00000000-0000-4000-8000-000000000000'
    for route in _routes(get_resolver().url_patterns):
        url = '/' + re.sub(r'<[^>]+>', lambda m: uid if m.group(0).startswith('<uuid') else ('1' if m.group(0).startswith('<int') else 'x'), route)
        if not url.startswith('/api/v1/') or any(c in url for c in '()[]\\^$') or url in seen or 'schema' in url or '/docs' in url or '/redoc' in url:
            continue
        seen.add(url)
        for method in ('get', 'post'):
            r = getattr(anyone, method)(url, {}, format='json') if method == 'post' else anyone.get(url)
            if 200 <= r.status_code < 300 and not any(re.match(p, url) for p in PUBLIC):
                open_doors.append(f'{method.upper()} {url} {r.status_code}')
    assert len(seen) > 400
    assert open_doors == []


@pytest.mark.django_db
def test_demo_login_is_gone(sec):
    r = APIClient().post('/api/v1/auth/demo/', {'email': 'office@hillside.test'}, format='json')
    assert r.status_code == 404 and b'access' not in r.content


@pytest.mark.django_db
def test_the_django_staff_flag_does_not_make_a_teacher_an_admin(sec):
    t = _client(sec['teacher_user'])
    # The old admin-only data endpoints (reachable at /api/auth/) trusted that flag.
    assert t.get('/api/auth/teachers/').status_code == 403
    assert t.post('/api/auth/teachers/clear-salaries/').status_code == 403
    assert t.get('/api/v1/core/audit/logs/').status_code == 403
    assert t.get('/api/v1/auth/credentials/student/').status_code == 403
    assert t.get(f'{S}/people/').status_code == 403
    assert t.get('/api/v1/auth/finance/analytics/defaulters/').status_code == 403
    with use_tenant(sec['s']):
        assert Teacher.objects.get(email='tess@hillside.test').monthly_salary == Decimal('50000')
    # Anonymising someone else's account is no longer possible.
    assert t.post(f"/api/v1/core/audit/gdpr/anonymize/{sec['admin'].pk}/").status_code == 404


@pytest.mark.django_db
def test_exam_results_need_the_office_or_the_class_teacher(sec):
    exam, amy = sec['exam'], sec['amy']
    body = {'exam': str(exam.pk), 'student': str(amy.pk), 'obtained_marks': 49}
    assert APIClient().get('/api/v1/auth/exams/results/').status_code == 401
    assert APIClient().post('/api/v1/auth/exams/results/create/', body, format='json').status_code == 401
    assert _client(sec['student_user']).post('/api/v1/auth/exams/results/create/', body, format='json').status_code == 403
    assert _client(sec['teacher_user']).post(f'/api/v1/auth/exams/{exam.pk}/bulk-results/', {'results': []}, format='json').status_code == 403
    r = sec['office'].post('/api/v1/auth/exams/results/create/', body, format='json')
    assert r.status_code == 201, r.content
    rid = r.json()['id']
    # Another school's administrator can't see or touch it.
    assert _client(sec['other_admin']).delete(f'/api/v1/auth/exams/results/{rid}/delete/').status_code == 404
    assert _client(sec['student_user']).delete(f'/api/v1/auth/exams/results/{rid}/delete/').status_code in (403, 404)
    assert sec['office'].delete(f'/api/v1/auth/exams/results/{rid}/delete/').status_code == 200


# ---- Signing in -----------------------------------------------------------------------------------------------

@pytest.mark.django_db
def test_wrong_passwords_block_the_account_for_a_while(sec):
    anyone = APIClient()
    for _ in range(4):
        assert anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'nope'}, format='json').status_code == 401
    r = anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'nope'}, format='json')
    assert r.status_code == 429 and r.json()['locked'] and r.json()['minutes'] == 15
    # Even the right password waits while blocked.
    assert anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'Amy-pass-123'}, format='json').status_code == 429
    events = list(SignInEvent.objects.filter(email='amy@hillside.test').values_list('outcome', flat=True))
    assert events.count('failed') == 5 and events.count('locked') == 1
    assert SignInEvent.objects.filter(email='amy@hillside.test', school=sec['s']).count() == 6
    # The office sees it and unlocks.
    rows = sec['office'].get(f'{S}/people/', {'status': 'locked'}).json()['results']
    assert [p['email'] for p in rows] == ['amy@hillside.test']
    assert sec['office'].post(f"{S}/people/{sec['student_user'].pk}/", {'action': 'unlock'}, format='json').status_code == 200
    ok = anyone.post(LOGIN, {'email': 'AMY@hillside.test', 'password': 'Amy-pass-123'}, format='json')
    assert ok.status_code == 200 and ok.json()['access']
    sec['student_user'].refresh_from_db()
    assert sec['student_user'].last_login and sec['student_user'].failed_login_attempts == 0
    # Unknown names are recorded without a school.
    anyone.post(LOGIN, {'email': 'ghost@nowhere.test', 'password': 'x'}, format='json')
    assert SignInEvent.objects.get(email='ghost@nowhere.test').school is None
    # The school can make the rule stricter.
    assert sec['office'].put(f'{S}/settings/', {'lockout_attempts': 3, 'lockout_minutes': 60}, format='json').status_code == 200
    for _ in range(2):
        anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'nope'}, format='json')
    assert anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'nope'}, format='json').json()['minutes'] == 60


@pytest.mark.django_db
def test_switched_off_accounts_and_sign_out_everywhere(sec):
    amy = sec['student_user']
    old_refresh = RefreshToken.for_user(amy)
    old = _client(token=str(old_refresh.access_token))
    assert old.get(f'{S}/me/').status_code == 200
    # Sign out everywhere: tokens issued before stop working, and can't be refreshed.
    RefreshToken.for_user(amy)
    import time
    time.sleep(1.1)
    assert old.post(f'{S}/me/sign-out-everywhere/').status_code == 200
    assert old.get(f'{S}/me/').status_code == 401
    assert APIClient().post('/api/v1/auth/token/refresh/', {'refresh': str(old_refresh)}, format='json').status_code == 401
    fresh = APIClient().post(LOGIN, {'email': 'amy@hillside.test', 'password': 'Amy-pass-123'}, format='json').json()
    assert _client(token=fresh['access']).get(f'{S}/me/').status_code == 200
    # Signing out ends the refresh token too.
    assert APIClient().post('/api/v1/auth/logout/', {'refresh': fresh['refresh']}, format='json').status_code == 200
    assert APIClient().post('/api/v1/auth/token/refresh/', {'refresh': fresh['refresh']}, format='json').status_code == 401
    # Switched off by the office: can't sign in, and is told why only with the right password.
    assert sec['office'].post(f'{S}/people/{amy.pk}/', {'action': 'disable'}, format='json').status_code == 200
    r = APIClient().post(LOGIN, {'email': 'amy@hillside.test', 'password': 'Amy-pass-123'}, format='json')
    assert r.status_code == 401 and r.json().get('disabled')
    assert 'disabled' not in APIClient().post(LOGIN, {'email': 'amy@hillside.test', 'password': 'bad'}, format='json').json()
    assert sec['office'].post(f'{S}/people/{amy.pk}/', {'action': 'enable'}, format='json').status_code == 200
    assert APIClient().post(LOGIN, {'email': 'amy@hillside.test', 'password': 'Amy-pass-123'}, format='json').status_code == 200


@pytest.mark.django_db
def test_people_and_their_limits(sec):
    office = sec['office']
    data = office.get(f'{S}/people/').json()
    roles = {p['email']: p['role'] for p in data['results']}
    assert roles['office@hillside.test'] == 'admin' and roles['amy@hillside.test'] == 'student' and roles['tess@hillside.test'] == 'teacher'
    assert 'office@other.test' not in roles
    # Can't switch yourself off, can't reach another school's people.
    assert office.post(f"{S}/people/{sec['admin'].pk}/", {'action': 'disable'}, format='json').status_code == 400
    assert office.post(f"{S}/people/{sec['other_admin'].pk}/", {'action': 'sign_out'}, format='json').status_code == 404
    # Switching off another administrator ends their sessions at once; switching back on lets them sign in again.
    head = _client(sec['admin2'])
    assert office.post(f"{S}/people/{sec['admin2'].pk}/", {'action': 'disable'}, format='json').status_code == 200
    assert head.get(f'{S}/me/').status_code == 401
    assert office.post(f"{S}/people/{sec['admin2'].pk}/", {'action': 'enable'}, format='json').status_code == 200
    # Filters.
    assert [p['email'] for p in office.get(f'{S}/people/', {'role': 'teacher'}).json()['results']] == ['tess@hillside.test']
    assert office.get(f'{S}/people/', {'q': 'amy'}).json()['total'] == 1
    assert _client(sec['teacher_user']).post(f"{S}/people/{sec['student_user'].pk}/", {'action': 'unlock'}, format='json').status_code == 403


@pytest.mark.django_db
def test_roles_overview_and_rules(sec):
    office = sec['office']
    roles = office.get(f'{S}/roles/').json()
    assert [r['code'] for r in roles['roles']] == ['admin', 'teacher', 'staff', 'parent', 'student']
    assert any(a['area'] == 'Fees & payments' and a['access']['parent'].startswith("Their family") for a in roles['areas'])
    ov = office.get(f'{S}/overview/').json()
    assert ov['people'] >= 4 and ov['admins'] == 2 and ov['rules']['lockout_attempts'] == 5
    # Rules: validated, admins only, the password length applies to password changes.
    assert office.put(f'{S}/settings/', {'password_min_length': 4}, format='json').status_code == 400
    assert office.put(f'{S}/settings/', {'idle_minutes': 30, 'password_min_length': 12}, format='json').json()['settings']['idle_minutes'] == 30
    assert _client(sec['teacher_user']).put(f'{S}/settings/', {'idle_minutes': 0}, format='json').status_code == 403
    amy = _client(sec['student_user'])
    assert amy.get(f'{S}/rules/').json() == {'idle_minutes': 30, 'password_min_length': 12}
    r = amy.post('/api/v1/auth/settings/change-password/', {'old_password': 'Amy-pass-123', 'new_password': 'Short-pass1'}, format='json')
    assert r.status_code == 400 and '12 characters' in r.json()['error']
    assert amy.post('/api/v1/auth/settings/change-password/', {'old_password': 'Amy-pass-123', 'new_password': 'A-much-longer-pass-9'},
                    format='json').status_code == 200


# ---- Activity log ---------------------------------------------------------------------------------------------

@pytest.mark.django_db
def test_the_activity_log_records_changes_for_the_school(sec):
    office = sec['office']
    before = AuditLog.objects.filter(school=sec['s']).count()
    office.get('/api/v1/tenants/locale/')  # reading is not recorded
    assert AuditLog.objects.filter(school=sec['s']).count() == before
    assert office.put('/api/v1/tenants/locale/', {'week_start': 0}, format='json').status_code == 200
    _client(sec['student_user']).put('/api/v1/tenants/locale/', {'week_start': 1}, format='json')  # refused
    rows = office.get(f'{S}/activity/').json()
    assert rows['total'] == 2
    changed = next(r for r in rows['results'] if r['action'] == 'UPDATE')
    assert changed['who'] and changed['email'] == 'office@hillside.test' and changed['area'] == 'School settings'
    refused = next(r for r in rows['results'] if r['action'] == 'PERMISSION_DENIED')
    assert refused['email'] == 'amy@hillside.test' and refused['action_label'] == 'Refused'
    assert office.get(f'{S}/activity/', {'action': 'UPDATE'}).json()['total'] == 1
    assert office.get(f'{S}/activity/', {'area': 'School settings', 'q': 'amy@'}).json()['total'] == 1
    csv = office.get(f'{S}/activity/', {'export': 'csv'})
    assert csv['Content-Type'].startswith('text/csv') and b'office@hillside.test' in csv.content
    assert AuditLog.objects.filter(school=sec['s'], action='EXPORT').exists()
    # Another school sees none of it; the old log is limited to the school too.
    assert _client(sec['other_admin']).get(f'{S}/activity/').json()['total'] == 0
    old_log = _client(sec['other_admin']).get('/api/v1/core/audit/logs/').json()
    assert all('tenants/locale' not in (r['resource_type'] or '') for r in old_log['results'])
    # Unlocking someone is recorded with their name.
    office.post(f"{S}/people/{sec['student_user'].pk}/", {'action': 'unlock'}, format='json')
    sec_row = office.get(f'{S}/activity/', {'action': 'SECURITY'}).json()['results'][0]
    assert sec_row['area'] == 'Security'


@pytest.mark.django_db
def test_retention_and_my_own_data(sec):
    s = sec['s']
    old = timezone.now() - timedelta(days=400)
    a = AuditLog.objects.create(school=s, user=sec['admin'], action='UPDATE', resource_type='v1/x/')
    b = SignInEvent.objects.create(school=s, email='amy@hillside.test', outcome='failed')
    AuditLog.objects.filter(pk=a.pk).update(timestamp=old)
    SignInEvent.objects.filter(pk=b.pk).update(created_at=timezone.now() - timedelta(days=200))
    keep = SignInEvent.objects.create(school=s, email='amy@hillside.test', outcome='success')
    call_command('apply_retention', '--dry-run')
    assert AuditLog.objects.filter(pk=a.pk).exists()
    call_command('apply_retention')
    assert not AuditLog.objects.filter(pk=a.pk).exists() and not SignInEvent.objects.filter(pk=b.pk).exists()
    assert SignInEvent.objects.filter(pk=keep.pk).exists()
    # My data: my sign-ins and my account, as a download; my recent sign-ins on screen.
    APIClient().post(LOGIN, {'email': 'amy@hillside.test', 'password': 'Amy-pass-123'}, format='json')
    amy = _client(sec['student_user'])
    me = amy.get(f'{S}/me/').json()
    assert me['sign_ins'][0]['outcome'] == 'success'
    r = amy.get(f'{S}/me/data/')
    assert r['Content-Disposition'].startswith('attachment') and b'amy@hillside.test' in r.content
    body = r.json()
    assert body['account']['email'] == 'amy@hillside.test' and body['sign_ins'] and body['students'][0]['name'] == 'Amy Pupil'


@pytest.mark.django_db
def test_asking_the_office_to_delete_my_account(sec):
    amy, office = _client(sec['student_user']), sec['office']
    assert amy.post(f'{S}/me/deletion-request/').json()['deletion_requested'] is True
    amy.post(f'{S}/me/deletion-request/')  # asking twice keeps one request
    assert amy.get(f'{S}/me/').json()['deletion_requested'] is True
    assert office.get(f'{S}/overview/').json()['deletion_requests'] == 1
    rows = office.get(f'{S}/people/', {'status': 'deletion'}).json()['results']
    assert [p['email'] for p in rows] == ['amy@hillside.test'] and rows[0]['deletion_requested']
    # Withdrawing, asking again, then the office switches the account off: the request is done.
    assert amy.delete(f'{S}/me/deletion-request/').json()['deletion_requested'] is False
    assert office.get(f'{S}/overview/').json()['deletion_requests'] == 0
    amy.post(f'{S}/me/deletion-request/')
    office.post(f"{S}/people/{sec['student_user'].pk}/", {'action': 'disable'}, format='json')
    from services.core.accounts.models import AccountDeletionRequest
    assert list(AccountDeletionRequest.objects.filter(user=sec['student_user']).values_list('status', flat=True).order_by('requested_at')) == ['cancelled', 'completed']
