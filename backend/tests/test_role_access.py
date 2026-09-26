"""Each role only reaches what it should (P1): changes by role, and what families and teachers can read."""
import re
from decimal import Decimal

import pytest
from django.urls import URLPattern, URLResolver, get_resolver
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.security import role_policy
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import SchoolClass, Teacher
from services.education.finance.models import Invoice
from tests.conftest import SchoolFactory, StudentFactory, UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def ra(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    with use_tenant(s):
        g1 = SchoolClass.objects.create(tenant=s, name='Grade 1', code='G1')
        Teacher.objects.create(tenant=s, full_name='Tess Teacher', email='tess@hillside.test', employee_id='T1', joining_date='2020-01-01',
                               monthly_salary=Decimal('50000'), national_id='12345-6789', phone='0300 1111111')
    teacher = UserFactory._meta.model.objects.get(email='tess@hillside.test')
    amy = StudentFactory(tenant=s, current_class=g1, full_name='Amy Pupil', email='', **kw)
    ben = StudentFactory(tenant=s, current_class=g1, full_name='Ben Other', email='', **kw)
    Invoice.objects.create(student=amy, amount=Decimal('100'), due_date=timezone.localdate())
    Invoice.objects.create(student=ben, amount=Decimal('900'), due_date=timezone.localdate())
    parent = UserFactory(email='mum@family.test')
    ParentProfile.objects.create(user=parent).linked_students.add(amy)
    return dict(s=s, office=_client(admin), parent=_client(parent), teacher=_client(teacher))


OFFICE_WRITES = ['/api/v1/auth/finance/admin/run-monthly-invoices/', '/api/v1/auth/finance/admin/apply-late-fees/',
                 '/api/v1/auth/finance/invoices/bulk-delete/', '/api/v1/auth/finance/payslips/', '/api/v1/students/',
                 '/api/v1/teachers/', '/api/v1/academic-years/', '/api/v1/fee-structures/', '/api/v1/auth/finance/ledger-entries/']


@pytest.mark.django_db
def test_families_and_teachers_cannot_make_office_changes(ra):
    for url in OFFICE_WRITES:
        assert ra['parent'].post(url, {}, format='json').status_code == 403, url
        assert ra['teacher'].post(url, {}, format='json').status_code == 403, url
    # Their own things still work.
    assert ra['parent'].post('/api/v1/security/me/sign-out-everywhere/').status_code == 200
    assert ra['teacher'].post('/api/v1/auth/academics/teacher-leaves/', {}, format='json').status_code != 403
    # The office is not limited by this rule.
    assert ra['office'].post('/api/v1/academic-years/', {}, format='json').status_code != 403


@pytest.mark.django_db
def test_families_see_only_their_own_records(ra):
    parent = ra['parent']
    inv = parent.get('/api/v1/auth/finance/invoices/').json()
    rows = inv.get('results', inv) if isinstance(inv, dict) else inv
    assert [r['student_name'] for r in rows] == ['Amy Pupil']
    assert [s['full_name'] for s in parent.get('/api/v1/auth/students/').json()] == ['Amy Pupil']
    assert parent.get('/api/v1/auth/students/count/').json()['count'] == 1
    old = parent.get('/api/v1/invoices/').json()['results']
    assert {r['student'] for r in old} == {str(Invoice.objects.get(student__full_name='Amy Pupil').student_id)}
    for url in ('/api/v1/auth/finance/summary/', '/api/v1/auth/finance/export/invoices/csv/', '/api/v1/auth/analytics/executive-dashboard/',
                '/api/v1/auth/employee/summary/', '/api/v1/students/last-registration/', '/api/v1/attendance/dashboard-stats/'):
        assert parent.get(url).status_code == 403, url
        assert ra['office'].get(url).status_code == 200, url
    # Staff records: a short public profile for others, the whole record for the office and for the teacher herself.
    public = parent.get('/api/v1/teachers/').json()
    public = public.get('results', public) if isinstance(public, dict) else public
    assert public[0]['full_name'] == 'Tess Teacher' and 'monthly_salary' not in public[0] and 'national_id' not in public[0]
    own = ra['teacher'].get('/api/v1/teachers/').json()
    own = own.get('results', own) if isinstance(own, dict) else own
    assert own[0]['national_id'] == '12345-6789'
    office = ra['office'].get('/api/v1/teachers/').json()
    office = office.get('results', office) if isinstance(office, dict) else office
    assert 'monthly_salary' in office[0]


def _routes(patterns, prefix=''):
    for p in patterns:
        if isinstance(p, URLResolver):
            yield from _routes(p.url_patterns, prefix + str(p.pattern))
        elif isinstance(p, URLPattern):
            yield prefix + str(p.pattern)


def _public(url):
    from django.urls import resolve
    from rest_framework.permissions import AllowAny

    try:
        view = getattr(resolve(url).func, 'cls', None)
    except Exception:
        return False
    if view is None:
        return False
    return list(getattr(view, 'authentication_classes', [None])) == [] or any(p is AllowAny for p in getattr(view, 'permission_classes', []))


@pytest.mark.django_db
def test_no_office_change_gets_past_the_rule(ra):
    """Every API address, posted to as a parent and as a teacher: nothing outside their allowed areas passes the rule."""
    uid = '00000000-0000-4000-8000-000000000000'
    seen, leaks = set(), []
    for route in _routes(get_resolver().url_patterns):
        url = '/' + re.sub(r'<[^>]+>', lambda m: uid if m.group(0).startswith('<uuid') else ('1' if m.group(0).startswith('<int') else 'x'), route)
        if not url.startswith('/api/v1/') or any(c in url for c in '()[]\\^$') or url in seen or 'schema' in url:
            continue
        seen.add(url)
        if _public(url):
            continue  # webhooks, signup, the start of SSO: no signed-in user, so no role to check
        path = role_policy.api_path(url)
        family_ok = role_policy._starts(path, role_policy.FAMILY)
        office_area = role_policy._starts(path, role_policy.OFFICE_ONLY) and not role_policy._starts(path, role_policy.STAFF_EXCEPTIONS + role_policy.PERSONAL)
        if not family_ok:
            code = ra['parent'].post(url, {}, format='json').status_code
            if code in (200, 201, 202, 204, 400):
                leaks.append(f'parent {url} {code}')
        if office_area:
            code = ra['teacher'].post(url, {}, format='json').status_code
            if code in (200, 201, 202, 204, 400):
                leaks.append(f'teacher {url} {code}')
    assert len(seen) > 400
    assert leaks == []
