"""School reports & analytics: overview, enrolment, attendance, finance, academics, teachers (Phase 18)."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import (
    AcademicYear, ClassSubject, SchoolClass, Subject, Teacher, TeacherSubjectAssignment, Term,
)
from services.education.admissions.models import Applicant, Application
from services.education.attendance.models import AttendanceRecord
from services.education.finance.models import Invoice, LedgerEntry, Payment, Refund
from services.education.gradebook.models import Assignment, Score
from services.education.students.models import Enrollment
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/insights'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def rep(db):
    today = timezone.localdate()
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        c7 = SchoolClass.objects.create(tenant=s, name='Grade 7', code='G7', grade_level=7)
        year = AcademicYear.objects.create(tenant=s, name='Y', start_date=today - timedelta(days=100), end_date=today + timedelta(days=200), is_active=True)
        term = Term.objects.create(tenant=s, academic_year=year, name='Term 1', order=1, start_date=today - timedelta(days=60), end_date=today + timedelta(days=60))
        maths = ClassSubject.objects.create(class_ref=c6, subject=Subject.objects.create(tenant=s, name='Maths', code='M'))
        khan = Teacher.objects.create(tenant=s, full_name='Mr Khan', email='khan@hillside.test', employee_id='T1', joining_date='2020-01-01')
        TeacherSubjectAssignment.objects.create(teacher=khan, academic_year=year, class_subject=maths)
    amy = StudentFactory(tenant=s, current_class=c6, full_name='Amy', gender='female', admission_date=today - timedelta(days=5), **kw)
    ben = StudentFactory(tenant=s, current_class=c6, full_name='Ben', gender='male', admission_date=today - timedelta(days=400), **kw)
    cat = StudentFactory(tenant=s, current_class=c7, full_name='Cat', gender='female', admission_date=today - timedelta(days=45), **kw)
    gone = StudentFactory(tenant=s, current_class=c7, full_name='Gone', admission_date=today - timedelta(days=400), is_active=False, **kw)
    with use_tenant(s):
        Enrollment.objects.create(tenant=s, student=gone, school_class=c7, start_date=today - timedelta(days=400),
                                  end_date=today - timedelta(days=3), status='withdrawn')
        # Attendance: Amy 8/10 in the last 10 days, Ben 12/12 (one late), Cat absent a lot.
        for n in range(10):
            AttendanceRecord.objects.create(tenant=s, student=amy, date=today - timedelta(days=n + 1), status='absent' if n < 2 else 'present')
        for n in range(12):
            AttendanceRecord.objects.create(tenant=s, student=ben, date=today - timedelta(days=n + 1), status='late' if n == 0 else 'present')
        for n in range(10):
            AttendanceRecord.objects.create(tenant=s, student=cat, date=today - timedelta(days=n + 1), status='absent' if n < 4 else 'present')
        # Earlier period: everyone present.
        for n in range(5):
            AttendanceRecord.objects.create(tenant=s, student=ben, date=today - timedelta(days=40 + n), status='present')
        # Fees: two invoices this period (10,000 billed), 6,000 paid with 1,000 refunded; one old overdue invoice.
        i1 = Invoice.objects.create(student=amy, amount=Decimal('6000'), due_date=today - timedelta(days=45), status='issued', invoice_type='tuition')
        i2 = Invoice.objects.create(student=ben, amount=Decimal('4000'), due_date=today + timedelta(days=10), status='issued', invoice_type='transport')
        p = Payment.objects.create(invoice=i1, amount=Decimal('6000'), payment_method='cash')
        Refund.objects.create(payment=p, amount=Decimal('1000'))
        LedgerEntry.objects.create(tenant=s, date=today - timedelta(days=2), description='Electricity', amount=Decimal('2500'), type='expense')
        # Gradebook.
        a = Assignment.objects.create(tenant=s, class_subject=maths, term=term, title='Quiz', due_date=today - timedelta(days=3), points_possible=10)
        Score.objects.create(assignment=a, student=amy, points=Decimal('4'))
        Score.objects.create(assignment=a, student=ben, points=Decimal('9'))
        ap = Applicant.objects.create(tenant=s, full_name='Zed', email='z@example.com', gender='M', applying_for_class='Grade 6')
        Application.objects.create(applicant=ap, status='enrolled')
        Application.objects.create(applicant=Applicant.objects.create(tenant=s, full_name='Yan', email='y@example.com', gender='F', applying_for_class='Grade 7'))
    # Another school's data never shows up.
    other = SchoolFactory(name='Other')
    StudentFactory(tenant=other, full_name='Elsewhere', admission_date=today - timedelta(days=2), **kw)
    return dict(s=s, admin=admin, office=_client(admin), amy=amy, i1=i1, today=today)


@pytest.mark.django_db
def test_overview_and_enrolment(rep):
    d = rep
    ov = d['office'].get(f'{URL}/overview/').json()
    t = {x['key']: x for x in ov['tiles']}
    assert t['students']['value'] == 3 and t['joined']['value'] == 1  # Amy (Cat joined 45 days ago)
    assert t['collected']['value'] == 5000 and t['collection_rate']['value'] == 50.0
    assert t['overdue']['value'] == 1000  # the 1,000 refunded on Amy's invoice (due 45 days ago) is owed again
    assert t['attendance']['value'] == pytest.approx(81.2, abs=0.1) and t['attendance']['previous'] == 100.0
    assert t['attendance']['change'] < 0
    en = d['office'].get(f'{URL}/enrolment/').json()
    assert en['on_roll'] == 3 and en['joined'] == 1 and en['left'] == 1
    assert en['months'][-1]['on_roll'] == 3 and len(en['months']) == 12
    assert {c['name']: c['students'] for c in en['by_class']} == {'Grade 6': 2, 'Grade 7': 1}
    assert en['gender'] == {'female': 2, 'male': 1}
    assert [f['count'] for f in en['funnel']] == [2, 1, 1] and en['conversion'] == 50.0
    csv = d['office'].get(f'{URL}/enrolment/', {'export': 'csv'})
    assert csv.status_code == 200 and b'On roll' in csv.content
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=d['s'], role='teacher')
    assert _client(teacher).get(f'{URL}/overview/').status_code == 403


@pytest.mark.django_db
def test_attendance_and_finance(rep):
    d = rep
    at = d['office'].get(f'{URL}/attendance/').json()
    assert at['summary']['records'] == 32 and at['summary']['late'] == 1 and at['summary']['absent'] == 6
    assert {c['name']: c['rate'] for c in at['by_class']} == {'Grade 7': 60.0, 'Grade 6': pytest.approx(90.9, abs=0.1)}
    assert [s['name'] for s in at['often_absent']] == ['Cat', 'Amy'] and at['often_absent_count'] == 2
    assert len(at['months']) == 6 and sum(1 for x in at['by_weekday'] if x['rate'] is not None) >= 5
    # A custom range excludes what is outside it.
    only_early = d['office'].get(f'{URL}/attendance/', {'from': (d['today'] - timedelta(days=50)).isoformat(),
                                                        'to': (d['today'] - timedelta(days=35)).isoformat()}).json()
    assert only_early['summary']['records'] == 5 and only_early['summary']['rate'] == 100.0
    fi = d['office'].get(f'{URL}/finance/').json()
    assert fi['billed'] == 10000 and fi['collected'] == 5000 and fi['collection_rate'] == 50.0
    assert fi['owed'] == 5000 and fi['overdue'] == 1000
    assert fi['ageing']['not_due'] == 4000 and fi['ageing']['31_60'] == 1000
    assert {x['type']: x['billed'] for x in fi['by_type']} == {'tuition': 6000, 'transport': 4000}
    assert fi['methods'] == [{'method': 'Cash', 'amount': 6000}]
    assert fi['ledger'] == {'income': 0, 'expenses': 2500, 'fees_collected': 5000, 'net': 2500}
    # Make Amy's invoice overdue and unpaid: it moves into the right bucket and the list of families who owe.
    Payment.objects.all().delete()
    d['i1'].refresh_from_db()
    fi = d['office'].get(f'{URL}/finance/').json()
    assert fi['ageing']['31_60'] == 6000 and fi['top_owed'][0]['name'] == 'Amy'


@pytest.mark.django_db
def test_academics_and_teachers(rep):
    d = rep
    ac = d['office'].get(f'{URL}/academics/').json()
    assert ac['term']['name'] == 'Term 1'
    g6 = next(c for c in ac['by_class'] if c['name'] == 'Grade 6')
    assert g6['average'] == 65.0 and g6['attention'] >= 1
    assert ac['by_subject'] == [{'subject': 'Maths', 'average': 65.0, 'grades': 2}]
    assert 'Amy' in [a['name'] for a in ac['attention']]
    te = d['office'].get(f'{URL}/teachers/').json()['teachers']
    khan = next(t for t in te if t['name'] == 'Mr Khan')
    assert khan['classes'] == 1 and khan['students'] == 2 and khan['assignments'] == 1 and khan['marked_percent'] == 100.0
    assert khan['class_attendance'] == pytest.approx(90.9, abs=0.1)
