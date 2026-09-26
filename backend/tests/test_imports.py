"""Spreadsheet import and onboarding (P10)."""
import io
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import SchoolClass, Section, Subject, Teacher
from services.education.finance.models import Invoice
from services.education.imports.models import ImportRun
from services.education.students.models import Student
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/imports'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def csv_file(text, name='data.csv'):
    return SimpleUploadedFile(name, text.encode('utf-8'), content_type='text/csv')


def xlsx_file(rows, name='data.xlsx'):
    from openpyxl import Workbook

    wb = Workbook()
    for r in rows:
        wb.active.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return SimpleUploadedFile(name, buf.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@pytest.fixture
def imp(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher')
    other = SchoolFactory(name='Other')
    with use_tenant(other):
        SchoolClass.objects.create(tenant=other, name='Grade 1', code='G1')
    return dict(s=s, admin=admin, office=_client(admin), teacher=_client(teacher))


@pytest.mark.django_db
def test_classes_subjects_and_the_template(imp):
    office = imp['office']
    kinds = office.get(f'{URL}/').json()['kinds']
    assert [k['kind'] for k in kinds] == ['classes', 'subjects', 'staff', 'students', 'balances']
    t = office.get(f'{URL}/students/template/')
    assert t['Content-Type'].startswith('text/csv') and 'Name *' in t.content.decode('utf-8-sig').splitlines()[0]
    # Classes: the other school's "Grade 1" doesn't count as a duplicate here.
    body = 'Class,Sections,Grade level,Capacity,Tuition fee\nGrade 1,"A, B",1,30,"2,500"\nGrade 2,A,2,x,2600\nGrade 1,C,1,,\n'
    p = office.post(f'{URL}/classes/preview/', {'file': csv_file(body)}, format='multipart').json()
    assert p['summary'] == {'ready': 1, 'duplicate': 0, 'error': 2}
    assert any('Capacity' in m for m in p['rows'][1]['messages']) and 'twice' in p['rows'][2]['messages'][0]
    assert SchoolClass.objects.filter(tenant=imp['s']).count() == 0  # a preview saves nothing
    r = office.post(f'{URL}/classes/import/', {'file': csv_file(body)}, format='multipart').json()
    assert r['added'] == 1 and r['failed'] == 2
    with use_tenant(imp['s']):
        g1 = SchoolClass.objects.get(name='Grade 1')
        assert g1.tuition_fee == Decimal('2500') and sorted(Section.objects.filter(class_ref=g1).values_list('name', flat=True)) == ['A', 'B']
    # Importing again: existing class with a new section only adds the section.
    again = office.post(f'{URL}/classes/preview/', {'file': csv_file('Class,Sections\nGrade 1,"A, B, C"\nGrade 1 ,A\n')}, format='multipart').json()
    assert again['rows'][0]['state'] == 'ready' and 'adds section C' in again['rows'][0]['note']
    # Subjects from Excel, with header aliases.
    p = office.post(f'{URL}/subjects/import/', {'file': xlsx_file([['Subject Name', 'Subject Code', 'Optional'], ['Mathematics', 'MATH', 'no'], ['Art', '', 'yes']])},
                    format='multipart').json()
    assert p['added'] == 2
    with use_tenant(imp['s']):
        assert Subject.objects.get(name='Art').is_elective and Subject.objects.get(name='Art').code == 'ART'


@pytest.mark.django_db
def test_staff_students_and_opening_balances(imp):
    office, s = imp['office'], imp['s']
    with use_tenant(s):
        g1 = SchoolClass.objects.create(tenant=s, name='Grade 1', code='G1')
        Section.objects.create(tenant=s, class_ref=g1, name='A')
    staff = 'Name,Email,Employee number,Joining date,Monthly salary,Subjects\nSara Ahmed,SARA@hillside.test,,01/08/2026,"60,000","Physics, Maths"\nNo Mail,,,,,\nBad Date,bd@hillside.test,,32/13/2026,,\n'
    r = office.post(f'{URL}/staff/import/', {'file': csv_file(staff)}, format='multipart').json()
    assert (r['added'], r['failed']) == (1, 2)
    with use_tenant(s):
        sara = Teacher.objects.get(email='sara@hillside.test')
        assert sara.employee_id == 'EMP-001' and sara.monthly_salary == Decimal('60000') and sara.specializations == ['Physics', 'Maths']
    StudentFactory(tenant=s, current_class=g1, student_id='HS-2026009', full_name='Old Pupil', guardian_phone='')
    students = ('Name,Class,Section,Student number,Gender,Date of birth,Father name,Guardian phone\n'
                'Ali Raza,Grade 1,A,,M,2019-04-12,Raza Khan,0300 7654321\n'
                'Zoya,Grade 1,B,,F,,,\n'
                'Nadia,Grade 9,,,F,,,\n'
                'Old Pupil Again,Grade 1,,HS-2026009,,,,\n')
    p = office.post(f'{URL}/students/preview/', {'file': csv_file(students)}, format='multipart').json()
    states = [row['state'] for row in p['rows']]
    assert states == ['ready', 'error', 'error', 'duplicate']
    assert p['rows'][0]['note'] == 'Gets student number HS-2026010'  # continues the school's numbering
    assert 'Section "B"' in p['rows'][1]['messages'][0] and 'Grade 9' in p['rows'][2]['messages'][0]
    r = office.post(f'{URL}/students/import/', {'file': csv_file(students)}, format='multipart').json()
    assert (r['added'], r['skipped'], r['failed']) == (1, 1, 2)
    with use_tenant(s):
        ali = Student.objects.get(student_id='HS-2026010')
        assert ali.gender == 'male' and ali.current_section.name == 'A' and ali.household_id  # a family is made, as on the form
    # Opening balances by student number.
    bal = 'Student number,Amount owed,Note\nHS-2026010,"4,500",Jan–Aug\nNOPE,100,\nHS-2026009,0,\n'
    r = office.post(f'{URL}/balances/import/', {'file': csv_file(bal)}, format='multipart').json()
    assert (r['added'], r['failed']) == (1, 2)
    inv = Invoice.objects.get(student=ali)
    assert inv.amount == Decimal('4500') and inv.description == 'Opening balance: Jan–Aug' and inv.status == 'issued'
    assert office.post(f'{URL}/balances/preview/', {'file': csv_file('Student number,Amount owed\nHS-2026010,50\n')}, format='multipart').json()['rows'][0]['state'] == 'duplicate'
    # History and the skipped-rows report.
    hist = office.get(f'{URL}/history/').json()['results']
    assert [h['kind'] for h in hist][:3] == ['balances', 'students', 'staff']
    report = office.get(f"{URL}/history/{hist[0]['id']}/problems.csv").content.decode('utf-8-sig')
    assert 'No student with number NOPE' in report


@pytest.mark.django_db
def test_bad_files_and_who_may_import(imp):
    office = imp['office']
    r = office.post(f'{URL}/students/preview/', {'file': csv_file('Name,Section\nAli,A\n')}, format='multipart')
    assert r.status_code == 400 and 'Missing column: Class' in r.json()['error']
    assert office.post(f'{URL}/students/preview/', {'file': csv_file('')}, format='multipart').status_code == 400
    assert office.post(f'{URL}/students/preview/', {'file': SimpleUploadedFile('old.xls', b'x')}, format='multipart').json()['error'].startswith('Old .xls')
    assert office.post(f'{URL}/nothing/preview/', {'file': csv_file('a\n1\n')}, format='multipart').status_code == 404
    assert imp['teacher'].get(f'{URL}/').status_code == 403
    assert imp['teacher'].post(f'{URL}/classes/import/', {'file': csv_file('Class\nX\n')}, format='multipart').status_code == 403
    assert APIClient().get(f'{URL}/').status_code == 401
    assert ImportRun.objects.count() == 0


@pytest.mark.django_db
def test_nothing_is_saved_if_a_ready_row_fails(imp, monkeypatch):
    from services.education.imports import specs

    calls = {'n': 0}
    real = specs.create_subject

    def flaky(clean, ctx):
        calls['n'] += 1
        if calls['n'] == 2:
            raise ValueError('disk full')
        return real(clean, ctx)

    monkeypatch.setitem(specs.KINDS['subjects'], 'create', flaky)
    r = imp['office'].post(f'{URL}/subjects/import/', {'file': csv_file('Subject\nA1\nB2\nC3\n')}, format='multipart')
    assert r.status_code == 400 and 'row 3' in r.json()['error']
    with use_tenant(imp['s']):
        assert Subject.objects.count() == 0


@pytest.mark.django_db
def test_onboarding_steps(imp):
    office = imp['office']
    steps = {s['key']: s for s in office.get('/api/v1/tenants/onboarding/').json()['steps']}
    assert list(steps)[:3] == ['profile', 'region', 'year']
    assert steps['students']['import_link'] == '/education/import?kind=students' and steps['fees']['import_link'] is None
    assert not steps['region']['done']
    office.put('/api/v1/tenants/locale/', {'week_start': 1}, format='json')
    assert {s['key']: s for s in office.get('/api/v1/tenants/onboarding/').json()['steps']}['region']['done']
