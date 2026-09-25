"""Student / family portal: overview, assignments, progress and documents (Phase 10)."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile, TeacherProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.core.user_notifications.models import Notification as UserNotification
from services.education.academics.models import (
    AcademicYear, ClassSubject, Homework, HomeworkSubmission, SchoolClass, Subject, Teacher, TeacherSubjectAssignment, Term,
)
from services.education.attendance.models import AttendanceRecord
from services.education.finance.models import Invoice
from services.education.gradebook.models import Assignment, ReportCardRelease, Score
from services.education.students.models import StudentDocument
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/portal'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture(autouse=True)
def media(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)


@pytest.fixture
def school(db):
    today = timezone.localdate()
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        c7 = SchoolClass.objects.create(tenant=s, name='Grade 7', code='G7', grade_level=7)
        year = AcademicYear.objects.create(tenant=s, name='This year', start_date=today - timedelta(days=200),
                                           end_date=today + timedelta(days=160), is_active=True)
        t1 = Term.objects.create(tenant=s, academic_year=year, name='Term 1', order=1,
                                 start_date=today - timedelta(days=200), end_date=today - timedelta(days=60))
        t2 = Term.objects.create(tenant=s, academic_year=year, name='Term 2', order=2,
                                 start_date=today - timedelta(days=59), end_date=today + timedelta(days=60))
        math = Subject.objects.create(tenant=s, name='Maths', code='MAT')
        eng = Subject.objects.create(tenant=s, name='English', code='ENG')
        cs_math = ClassSubject.objects.create(class_ref=c6, subject=math)
        cs_eng = ClassSubject.objects.create(class_ref=c6, subject=eng)
        teacher = Teacher.objects.create(tenant=s, full_name='Mr Khan', email='khan@hillside.test', employee_id='T1',
                                         joining_date='2020-01-01')
        TeacherSubjectAssignment.objects.create(teacher=teacher, academic_year=year, class_subject=cs_math)
    khan = get_user_model().objects.filter(email='khan@hillside.test').first() or UserFactory(email='khan@hillside.test')
    TeacherProfile.objects.get_or_create(user=khan, defaults={'employee_id': 'T1'})
    sara = StudentFactory(tenant=s, current_class=c6, full_name='Sara Ali', email='sara@hillside.test',
                          father_name='', mother_name='', guardian_name='')
    omar = StudentFactory(tenant=s, current_class=c7, full_name='Omar Ali', father_name='', mother_name='', guardian_name='')
    other = StudentFactory(tenant=s, current_class=c7, full_name='Someone Else', father_name='', mother_name='', guardian_name='')
    parent = UserFactory(email='ali.parent@example.com', full_name='Mr Ali')
    ParentProfile.objects.create(user=parent).linked_students.add(sara, omar)
    student_user = get_user_model().objects.filter(email=sara.email).first() or UserFactory(email=sara.email)
    return dict(s=s, admin=admin, khan=khan, c6=c6, t1=t1, t2=t2, cs_math=cs_math, cs_eng=cs_eng, sara=sara,
                omar=omar, other=other, parent=parent, student_user=student_user, today=today)


def _fill(d):
    """Grades in two terms, work due and overdue, homework, attendance and an overdue invoice for Sara."""
    s, sara, today = d['s'], d['sara'], d['today']
    with use_tenant(s):
        a1 = Assignment.objects.create(tenant=s, class_subject=d['cs_math'], term=d['t1'], title='Fractions quiz',
                                       due_date=d['t1'].start_date + timedelta(days=10), points_possible=10)
        Score.objects.create(assignment=a1, student=sara, points=Decimal('6'))
        a2 = Assignment.objects.create(tenant=s, class_subject=d['cs_math'], term=d['t2'], title='Algebra test',
                                       due_date=today - timedelta(days=3), points_possible=20)
        Score.objects.create(assignment=a2, student=sara, points=Decimal('18'), comment='Great work')
        Assignment.objects.create(tenant=s, class_subject=d['cs_eng'], term=d['t2'], title='Book report',
                                  due_date=today + timedelta(days=4), points_possible=10)
        missing = Assignment.objects.create(tenant=s, class_subject=d['cs_eng'], term=d['t2'], title='Poem',
                                            due_date=today - timedelta(days=2), points_possible=10)
        Score.objects.create(assignment=missing, student=sara, status='missing')
        Assignment.objects.create(tenant=s, class_subject=d['cs_math'], term=d['t2'], title='Draft (hidden)',
                                  due_date=today + timedelta(days=1), is_published=False)
        hw = Homework.objects.create(tenant=s, class_ref=d['c6'], class_name='Grade 6', subject_name='Maths',
                                     title='Worksheet 4', homework_date=today - timedelta(days=1),
                                     due_date=today + timedelta(days=2), attachment_name='ws4.pdf',
                                     attachment_data='data:application/pdf;base64,JVBERi0=')
        hw2 = Homework.objects.create(tenant=s, class_ref=d['c6'], class_name='Grade 6', subject_name='English',
                                      title='Spelling list', homework_date=today - timedelta(days=5),
                                      due_date=today - timedelta(days=1), max_marks=10)
        HomeworkSubmission.objects.create(homework=hw2, student=sara, status='graded', obtained_marks=Decimal('9'))
        for n in range(12):
            AttendanceRecord.objects.create(tenant=s, student=sara, date=today - timedelta(days=n + 1),
                                            status='absent' if n < 3 else 'present')
        AttendanceRecord.objects.create(tenant=s, student=sara, date=d['t1'].start_date + timedelta(days=5), status='present')
        Invoice.objects.create(student=sara, amount=Decimal('5000'), due_date=today - timedelta(days=5), status='issued')
    return hw


@pytest.mark.django_db
def test_children_and_access(school):
    d = school
    kids = _client(d['parent']).get(f'{URL}/children/').json()
    assert [k['full_name'] for k in kids] == ['Omar Ali', 'Sara Ali']
    assert [k['full_name'] for k in _client(d['student_user']).get(f'{URL}/children/').json()] == ['Sara Ali']
    assert _client(d['admin']).get(f'{URL}/children/').json() == []
    # Not their child / not their own record.
    assert _client(d['parent']).get(f'{URL}/{d["other"].id}/overview/').status_code == 404
    assert _client(d['student_user']).get(f'{URL}/{d["omar"].id}/assignments/').status_code == 404
    assert _client(d['khan']).get(f'{URL}/{d["omar"].id}/progress/').status_code == 404  # not his class
    assert _client(d['khan']).get(f'{URL}/{d["sara"].id}/progress/').status_code == 200


@pytest.mark.django_db
def test_overview_brings_everything_together(school):
    d = school
    _fill(d)
    o = _client(d['parent']).get(f'{URL}/{d["sara"].id}/overview/').json()
    assert o['student']['class_name'] == 'Grade 6'
    assert o['attendance']['absent'] == 3 and o['attendance']['total'] == 12 and o['attendance']['rate'] == 75.0
    assert len(o['attendance']['recent_absences']) == 3
    g = {x['subject']: x for x in o['grades']['subjects']}
    assert g['Maths']['percent'] == 90.0 and o['grades']['term']['name'] == 'Term 2'
    assert o['grades']['missing'] == 1
    due = [w['title'] for w in o['assignments']['due_soon']]
    assert due == ['Worksheet 4', 'Book report'] and 'Draft (hidden)' not in str(o)
    assert [w['title'] for w in o['assignments']['overdue']] == ['Poem']
    assert {w['title'] for w in o['assignments']['recently_marked']} == {'Algebra test', 'Spelling list'}
    assert o['fees']['balance'] == 5000.0 and o['fees']['overdue_invoices'] == 1
    areas = {a['area'] for a in o['alerts']}
    assert {'attendance', 'grades', 'assignments', 'fees'} <= areas
    assert any(i['source'] == 'assignment' and 'Book report' in i['title'] for i in o['upcoming'])
    # Omar's calendar doesn't include Sara's work.
    om = _client(d['parent']).get(f'{URL}/{d["omar"].id}/overview/').json()
    assert not any('Book report' in i['title'] for i in om['upcoming']) and om['fees']['balance'] == 0


@pytest.mark.django_db
def test_assignments_and_homework_attachment(school):
    d = school
    hw = _fill(d)
    r = _client(d['student_user']).get(f'{URL}/{d["sara"].id}/assignments/').json()
    by = {i['title']: i for i in r['items']}
    assert by['Algebra test']['status'] == 'graded' and by['Algebra test']['points'] == 18.0
    assert by['Algebra test']['comment'] == 'Great work'
    assert by['Poem']['status'] == 'missing' and by['Book report']['status'] == 'upcoming'
    assert by['Spelling list']['status'] == 'graded' and by['Spelling list']['points'] == 9.0
    assert by['Worksheet 4']['has_attachment'] and 'Draft (hidden)' not in by
    assert r['counts']['graded'] == 2 and r['subjects'] == ['English', 'Maths']
    att = _client(d['student_user']).get(f'{URL}/{d["sara"].id}/homework/{hw.id}/attachment/').json()
    assert att['name'] == 'ws4.pdf' and att['data'].startswith('data:application/pdf')
    assert _client(d['parent']).get(f'{URL}/{d["omar"].id}/homework/{hw.id}/attachment/').status_code == 404


@pytest.mark.django_db
def test_progress_by_term(school):
    d = school
    _fill(d)
    r = _client(d['parent']).get(f'{URL}/{d["sara"].id}/progress/').json()
    terms = {t['name']: t for t in r['terms']}
    assert terms['Term 1']['average'] == 60.0 and terms['Term 2']['current']
    assert terms['Term 2']['absences'] == 3
    assert r['trend'] is not None
    maths = next(x for x in r['subjects'] if x['subject'] == 'Maths')
    assert maths['terms'][str(d['t1'].id)] == 60.0 and maths['terms'][str(d['t2'].id)] == 90.0
    assert len(r['months']) == 6
    assert terms['Term 1']['report_card'] is False
    ReportCardRelease.objects.create(tenant=d['s'], term=d['t1'])
    r = _client(d['parent']).get(f'{URL}/{d["sara"].id}/progress/').json()
    assert next(t for t in r['terms'] if t['name'] == 'Term 1')['report_card'] is True


@pytest.mark.django_db
def test_documents_staff_share_and_families_upload(school):
    d = school
    admin, parent, khan = _client(d['admin']), _client(d['parent']), _client(d['khan'])
    sid = d['sara'].id
    pdf = lambda n: SimpleUploadedFile(n, b'%PDF-1.4 test', content_type='application/pdf')  # noqa: E731
    r = admin.post(f'{URL}/{sid}/documents/', {'file': pdf('fee-policy.pdf'), 'title': 'Fee policy',
                                                'category': 'letter'}, format='multipart')
    assert r.status_code == 201 and r.json()['visible_to_family'] and not r.json()['from_family']
    shared = r.json()['id']
    assert UserNotification.objects.filter(recipient=d['parent'], title='New document').exists()
    hidden = admin.post(f'{URL}/{sid}/documents/', {'file': pdf('counsellor.pdf'), 'title': 'Counsellor notes',
                                                    'category': 'other', 'visible_to_family': 'false'},
                        format='multipart').json()['id']
    # A family sees only what was shared, and can download it.
    docs = parent.get(f'{URL}/{sid}/documents/').json()
    assert [x['title'] for x in docs['documents']] == ['Fee policy'] and docs['can_manage'] is False
    got = parent.get(f'{URL}/documents/{shared}/')
    assert got.status_code == 200 and b''.join(got.streaming_content).startswith(b'%PDF')
    assert parent.get(f'{URL}/documents/{hidden}/').status_code == 404
    assert parent.patch(f'{URL}/documents/{shared}/', {'title': 'x'}, format='json').status_code == 403
    assert parent.delete(f'{URL}/documents/{shared}/').status_code == 403
    # A family uploads a medical note: staff are told; the parent can remove their own upload.
    r = parent.post(f'{URL}/{sid}/documents/', {'file': pdf('doctor.pdf'), 'title': 'Doctor note',
                                                 'category': 'medical', 'visible_to_family': 'false'}, format='multipart')
    assert r.status_code == 201 and r.json()['from_family'] and r.json()['visible_to_family']
    assert UserNotification.objects.filter(recipient=d['admin'], title='Document from a family').exists()
    assert khan.get(f'{URL}/{sid}/documents/').json()['can_manage'] is True
    assert len(khan.get(f'{URL}/{sid}/documents/').json()['documents']) == 3
    # Bad file type; another family can't see or upload.
    bad = parent.post(f'{URL}/{sid}/documents/', {'file': SimpleUploadedFile('x.exe', b'MZ', content_type='application/octet-stream')},
                      format='multipart')
    assert bad.status_code == 400
    assert _client(d['student_user']).get(f'{URL}/{d["omar"].id}/documents/').status_code == 404
    # Staff share the hidden one later → the family is told.
    UserNotification.objects.all().delete()
    assert admin.patch(f'{URL}/documents/{hidden}/', {'visible_to_family': True}, format='json').json()['visible_to_family']
    assert UserNotification.objects.filter(recipient=d['parent']).exists()
    assert parent.delete(f'{URL}/documents/{r.json()["id"]}/').status_code == 204
    assert StudentDocument.objects.filter(student=d['sara']).count() == 2
    # Report cards appear once released.
    assert parent.get(f'{URL}/{sid}/documents/').json()['report_cards'] == []
    ReportCardRelease.objects.create(tenant=d['s'], term=d['t1'])
    assert [x['term'] for x in parent.get(f'{URL}/{sid}/documents/').json()['report_cards']] == ['Term 1']
