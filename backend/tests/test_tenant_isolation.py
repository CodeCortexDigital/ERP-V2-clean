"""Multi-school isolation: one school's data must never reach another school's users."""
import datetime
import re
from decimal import Decimal

import pytest
from django.apps import apps
from django.core.exceptions import PermissionDenied
from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import NO_TENANT, use_tenant
from services.core.tenants.models import TenantMembership
from tests.conftest import ClassFactory, SchoolFactory, SectionFactory, StudentFactory, TeacherFactory, UserFactory

MARK = 'Zqleak'  # appears only in school A's data


def _client_for(user):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return client


def _school_admin(school):
    user = UserFactory(email=f'admin@{school.tenant_code.lower()}.test')
    TenantMembership.objects.create(user=user, school=school, role='admin', is_primary=True)
    return user


def _populate(school, tag):
    cls = ClassFactory(school=school, name=f'{tag} Class', code=f'{tag[:3].upper()}-C1')
    section = SectionFactory(class_obj=cls, tenant=school)
    student = StudentFactory(
        tenant=school, current_class=cls, current_section=section,
        full_name=f'{tag} Student', student_id=f'{tag[:3].upper()}-S1', email=f'{tag.lower()}.student@leak.test',
        father_name=f'{tag} Father',
    )
    teacher = TeacherFactory(school=school, full_name=f'{tag} Teacher', employee_id=f'{tag[:3].upper()}-E1',
                             email=f'{tag.lower()}.teacher@leak.test')
    Subject = apps.get_model('education_academics', 'Subject')
    Subject.objects.create(tenant=school, name=f'{tag} Subject', code='SUB1')
    Invoice = apps.get_model('education_finance', 'Invoice')
    Invoice.objects.create(student=student, amount=Decimal('1234'), due_date=datetime.date.today(),
                           description=f'{tag} fee')
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    Attendance.objects.create(tenant=school, student=student, date=datetime.date.today(), status='present')
    return {'student': student, 'teacher': teacher, 'class': cls}


@pytest.fixture
def two_schools(db):
    a, b = SchoolFactory(name='Alpha School'), SchoolFactory(name='Beta School')
    data_a = _populate(a, MARK)
    data_b = _populate(b, 'Beta')
    return a, b, data_a, data_b


def _list_urls():
    """Every API route without path parameters (list/summary endpoints)."""
    found = set()

    def walk(patterns, prefix=''):
        for p in patterns:
            route = str(p.pattern)
            if isinstance(p, URLResolver):
                walk(p.url_patterns, prefix + route)
            elif isinstance(p, URLPattern):
                full = (prefix + route).lstrip('^').rstrip('$')
                if not full.startswith('api/v1/') or '<' in full or '(?P' in full or '\\' in full:
                    continue
                found.add('/' + full.replace('^', '').replace('$', ''))

    walk(get_resolver().url_patterns)
    return sorted(u for u in found if not re.search(r'(logout|login|refresh|register|signup|webhook|stream|export|download|pdf)', u))


@pytest.mark.django_db
def test_school_b_admin_never_sees_school_a_data(two_schools):
    a, b, data_a, _ = two_schools
    client = _client_for(_school_admin(b))
    leaks, errors, statuses = [], [], {}
    urls = _list_urls()
    assert len(urls) > 40, urls  # the sweep really covers the API
    for url in urls:
        res = client.get(url)
        statuses[res.status_code] = statuses.get(res.status_code, 0) + 1
        if res.status_code >= 500:
            errors.append(f'{res.status_code} {url}')
            continue
        body = res.content.decode('utf-8', 'ignore')
        if MARK in body or str(data_a['student'].pk) in body or str(data_a['teacher'].pk) in body:
            leaks.append(url)
    assert not leaks, f'School A data visible to school B at: {leaks}'
    print(f'\nswept {len(urls)} endpoints, statuses {statuses}; server errors (not leaks): {errors}')
    assert statuses.get(200, 0) > 30  # most endpoints really answered for school B


@pytest.mark.django_db
def test_school_a_admin_sees_own_data(two_schools):
    a, _, data_a, _ = two_schools
    res = _client_for(_school_admin(a)).get('/api/v1/students/')
    assert res.status_code == 200
    body = res.content.decode()
    assert MARK in body and 'Beta Student' not in body


@pytest.mark.django_db
def test_detail_of_other_school_is_not_found(two_schools):
    _, b, data_a, _ = two_schools
    client = _client_for(_school_admin(b))
    for url in (f"/api/v1/students/{data_a['student'].pk}/", f"/api/v1/auth/students/{data_a['student'].pk}/"):
        assert client.get(url).status_code in (403, 404), url


@pytest.mark.django_db
def test_cannot_write_into_another_school(two_schools):
    a, b, data_a, _ = two_schools
    Invoice = apps.get_model('education_finance', 'Invoice')
    with use_tenant(b):
        with pytest.raises(PermissionDenied):
            Invoice.objects.create(student=data_a['student'], amount=Decimal('1'), due_date=datetime.date.today())
    # and through the API: pointing a new invoice at school A's student is refused
    res = _client_for(_school_admin(b)).post('/api/v1/invoices/', {
        'student': str(data_a['student'].pk), 'amount': '10.00', 'due_date': str(datetime.date.today()),
    }, format='json')
    assert res.status_code in (400, 403, 404), res.content
    assert not Invoice._base_manager.filter(student=data_a['student'], amount=Decimal('10.00')).exists()


@pytest.mark.django_db
def test_new_rows_are_stamped_with_the_users_school(two_schools):
    _, b, _, _ = two_schools
    Subject = apps.get_model('education_academics', 'Subject')
    with use_tenant(b):
        s = Subject.objects.create(name='Stamped', code='STAMP')
    assert s.tenant_id == b.pk


@pytest.mark.django_db
def test_same_codes_allowed_in_different_schools(two_schools):
    # both schools created subject code 'SUB1' in the fixture without a clash
    Subject = apps.get_model('education_academics', 'Subject')
    assert Subject._base_manager.filter(code='SUB1').count() == 2


@pytest.mark.django_db
def test_user_without_school_sees_nothing(two_schools):
    lone = UserFactory(is_staff=True)
    res = _client_for(lone).get('/api/v1/students/')
    body = res.content.decode()
    assert MARK not in body and 'Beta Student' not in body
    Student = apps.get_model('education_students', 'Student')
    with use_tenant(NO_TENANT):
        assert Student.objects.count() == 0


@pytest.mark.django_db
def test_header_cannot_switch_to_a_school_you_do_not_belong_to(two_schools):
    a, b, _, _ = two_schools
    client = _client_for(_school_admin(b))
    res = client.get('/api/v1/students/', HTTP_X_TENANT_ID=str(a.pk))
    assert res.status_code == 403
