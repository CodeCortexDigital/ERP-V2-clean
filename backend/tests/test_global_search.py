"""Global search: every kind of record for the office, and only what each person may see (Phase 19)."""
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile, TeacherProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import AcademicYear, ClassSubject, SchoolClass, Subject, Teacher, TeacherSubjectAssignment
from services.education.admissions.models import Applicant, Application
from services.education.finance.models import Invoice
from services.education.inventory.models import Item, Supplier
from services.education.library.models import Book, BookCopy
from services.education.students.models import Guardian, StudentGuardian
from services.education.transport.models import Route, Vehicle
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/search/'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _find(client, q, **extra):
    r = client.get(URL, {'q': q, **extra})
    assert r.status_code == 200
    return {g['type']: [x['title'] for x in g['results']] for g in r.json()['groups']}, r.json()


@pytest.fixture
def sx(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6 Khan', code='G6K', grade_level=6)
        c7 = SchoolClass.objects.create(tenant=s, name='Grade 7', code='G7', grade_level=7)
        year = AcademicYear.objects.create(tenant=s, name='Y', start_date='2026-01-01', end_date='2026-12-31', is_active=True)
        t = Teacher.objects.create(tenant=s, full_name='Imran Khan', email='imran@hillside.test', employee_id='EMP-7', joining_date='2020-01-01')
        TeacherSubjectAssignment.objects.create(teacher=t, academic_year=year,
                                                class_subject=ClassSubject.objects.create(class_ref=c6, subject=Subject.objects.create(tenant=s, name='Maths', code='M')))
    teacher = get_user_model().objects.filter(email='imran@hillside.test').first() or UserFactory(email='imran@hillside.test')
    TeacherProfile.objects.get_or_create(user=teacher, defaults={'employee_id': 'EMP-7'})
    sara = StudentFactory(tenant=s, current_class=c6, full_name='Sara Khan', student_id='HS-001', **kw)
    khanum = StudentFactory(tenant=s, current_class=c7, full_name='Khanum Ali', student_id='HS-002', **kw)
    parent = UserFactory(email='khan.family@example.com')
    ParentProfile.objects.create(user=parent).linked_students.add(sara)
    with use_tenant(s):
        g = Guardian.objects.create(tenant=s, first_name='Asif', last_name='Khan', relationship='father', mobile_phone='0300-5550001')
        StudentGuardian.objects.create(tenant=s, student=sara, guardian=g)
        Invoice.objects.create(student=sara, amount=Decimal('5000'), due_date='2026-10-10', status='issued')
        Application.objects.create(applicant=Applicant.objects.create(tenant=s, full_name='Bilal Khan', email='b@example.com', gender='M', applying_for_class='Grade 1'))
        b = Book.objects.create(tenant=s, title='Khan Academy Maths', authors='S. Khan', isbn='9780000000001')
        BookCopy.objects.create(tenant=s, book=b, barcode='LIB-000777')
        Route.objects.create(tenant=s, name='Khan Colony route', code='R9')
        Vehicle.objects.create(tenant=s, name='Bus 9', registration_no='KHAN-99')
        Item.objects.create(tenant=s, sku='ITM-0042', name='Khan House tie')
        Supplier.objects.create(tenant=s, name='Khan Traders')
    # Another school with a matching name must never appear.
    other = SchoolFactory(name='Other School')
    StudentFactory(tenant=other, full_name='Zara Khan', **kw)
    return dict(s=s, admin=admin, teacher=teacher, parent=parent, sara=sara)


@pytest.mark.django_db
def test_office_finds_everything_ranked(sx):
    d = sx
    groups, body = _find(_client(d['admin']), 'khan')
    assert set(groups) == {'students', 'guardians', 'staff', 'classes', 'invoices', 'applications', 'books', 'transport', 'inventory'}
    assert groups['students'] == ['Khanum Ali', 'Sara Khan'] and 'Zara Khan' not in str(body)  # other school never
    assert groups['guardians'] == ['Asif Khan'] and groups['staff'] == ['Imran Khan']
    assert set(groups['transport']) == {'Khan Colony route', 'Bus 9'} and set(groups['inventory']) == {'Khan House tie', 'Khan Traders'}
    first = body['groups'][0]['results'][0]
    assert first['url'] and first['title']
    # Exact codes jump to the top: a student number, an invoice, a barcode, an item code.
    g, _ = _find(_client(d['admin']), 'HS-001')
    assert g['students'] == ['Sara Khan']
    inv = Invoice.objects.get(student=d['sara']).invoice_number
    g, b = _find(_client(d['admin']), inv)
    assert g['invoices'] == [inv] and b['groups'][0]['type'] == 'invoices' and inv in b['groups'][0]['results'][0]['url']
    assert _find(_client(d['admin']), 'LIB-000777')[0]['books'] == ['Khan Academy Maths']
    assert _find(_client(d['admin']), 'ITM-0042')[0]['inventory'] == ['Khan House tie']
    assert _find(_client(d['admin']), '0300-555')[0]['guardians'] == ['Asif Khan']
    # One group, more results; short queries return nothing.
    _, one = _find(_client(d['admin']), 'khan', type='students')
    assert [g['type'] for g in one['groups']] == ['students']
    assert _find(_client(d['admin']), 'k')[1]['groups'] == []


@pytest.mark.django_db
def test_each_person_sees_only_what_they_may(sx):
    d = sx
    # A teacher: only their own class's students and classes, and books; no money, parents or staff.
    g, _ = _find(_client(d['teacher']), 'khan')
    assert set(g) == {'students', 'classes', 'books'}
    assert g['students'] == ['Sara Khan'] and g['classes'] == ['Grade 6 Khan']
    # A parent: only their own child, and books (their library page).
    g, body = _find(_client(d['parent']), 'khan')
    assert g == {'students': ['Sara Khan'], 'books': ['Khan Academy Maths']}
    urls = {r['type']: r['url'] for grp in body['groups'] for r in grp['results']}
    assert urls['student'] == '/parent/children' and urls['book'].startswith('/parent/library?q=')
    assert 'Khanum' not in str(body) and '0300' not in str(body)
    # Someone with no role here finds nothing.
    assert _find(_client(UserFactory(email='nobody@example.com')), 'khan')[1]['groups'] == []
