"""Teacher workspace: my day, my classes with the roster, and class reports (Phase 12)."""
from datetime import time, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile, TeacherProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import (
    AcademicYear, Classroom, ClassSubject, Homework, HomeworkSubmission, Period, SchoolClass, Subject, Teacher,
    TeacherSubjectAssignment, Term, TimetableEntry,
)
from services.education.attendance.models import AbsenceReport, AttendanceRecord, PeriodAttendance
from services.education.behaviour.models import BehaviourCategory, BehaviourIncident
from services.education.gradebook.models import Assignment, Score
from services.education.schoolcalendar.models import MeetingSlot
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/workspace'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _school_day(d):
    """Weekends are not school days; move to the Wednesday of the same week."""
    return d + timedelta(days=2 - d.weekday()) if d.weekday() >= 5 else d


@pytest.fixture
def ws(db, monkeypatch):
    real_today = timezone.localdate()
    day = _school_day(real_today)
    if day != real_today:
        monkeypatch.setattr(timezone, 'localdate', lambda *a, **k: day)
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='')
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        c7 = SchoolClass.objects.create(tenant=s, name='Grade 7', code='G7', grade_level=7)
        year = AcademicYear.objects.create(tenant=s, name='This year', start_date=day - timedelta(days=100),
                                           end_date=day + timedelta(days=200), is_active=True)
        term = Term.objects.create(tenant=s, academic_year=year, name='Term 1', order=1,
                                   start_date=day - timedelta(days=60), end_date=day + timedelta(days=60))
        math = Subject.objects.create(tenant=s, name='Maths', code='MAT')
        sci = Subject.objects.create(tenant=s, name='Science', code='SCI')
        cs_math = ClassSubject.objects.create(class_ref=c6, subject=math)
        ClassSubject.objects.create(class_ref=c6, subject=sci)
        cs_other = ClassSubject.objects.create(class_ref=c7, subject=math)
        khan_t = Teacher.objects.create(tenant=s, full_name='Mr Khan', email='khan@hillside.test', employee_id='T1',
                                        joining_date='2020-01-01')
        other_t = Teacher.objects.create(tenant=s, full_name='Ms Other', email='other@hillside.test', employee_id='T2',
                                         joining_date='2020-01-01')
        c6.homeroom_teacher = khan_t
        c6.save()
        TeacherSubjectAssignment.objects.create(teacher=khan_t, academic_year=year, class_subject=cs_math)
        TeacherSubjectAssignment.objects.create(teacher=other_t, academic_year=year, class_subject=cs_other)
        room = Classroom.objects.create(tenant=s, name='Room 12', code='R12', capacity=30)
        p1 = Period.objects.create(academic_year=year, period_number=1, name='Period 1', start_time=time(8, 0),
                                   end_time=time(8, 45), duration_minutes=45)
        p2 = Period.objects.create(academic_year=year, period_number=2, name='Period 2', start_time=time(9, 0),
                                   end_time=time(9, 45), duration_minutes=45)
        weekday = day.strftime('%A').lower()
        TimetableEntry.objects.create(academic_year=year, class_subject=cs_math, teacher=khan_t, classroom=room,
                                      day_of_week=weekday, period=p2)
        TimetableEntry.objects.create(academic_year=year, class_subject=cs_math, teacher=khan_t, classroom=room,
                                      day_of_week=weekday, period=p1)
        TimetableEntry.objects.create(academic_year=year, class_subject=cs_other, teacher=other_t, classroom=room,
                                      day_of_week=weekday, period=p1)
    from django.contrib.auth import get_user_model
    khan = get_user_model().objects.filter(email='khan@hillside.test').first() or UserFactory(email='khan@hillside.test', full_name='Mr Khan')
    TeacherProfile.objects.get_or_create(user=khan, defaults={'employee_id': 'T1'})
    TenantMembership.objects.get_or_create(user=khan, school=s, defaults={'role': 'teacher', 'is_primary': True})
    amy = StudentFactory(tenant=s, current_class=c6, full_name='Amy Bell', **kw)
    ben = StudentFactory(tenant=s, current_class=c6, full_name='Ben Cole', **kw)
    cat = StudentFactory(tenant=s, current_class=c6, full_name='Cat Dunn', **kw)
    zed = StudentFactory(tenant=s, current_class=c7, full_name='Zed Other', **kw)
    return dict(s=s, admin=admin, khan=khan, khan_t=khan_t, c6=c6, c7=c7, term=term, cs_math=cs_math,
                amy=amy, ben=ben, cat=cat, zed=zed, day=day, p1=p1)


@pytest.mark.django_db
def test_my_day(ws):
    d = ws
    s, day = d['s'], d['day']
    parent = UserFactory(email='bell.parent@example.com', full_name='Mrs Bell')
    ParentProfile.objects.create(user=parent).linked_students.add(d['amy'])
    with use_tenant(s):
        # Period 1 register done for everyone, period 2 not yet; daily register: 2 of 3 marked.
        for st in (d['amy'], d['ben'], d['cat']):
            PeriodAttendance.objects.create(tenant=s, student=st, date=day, period_number=1, period=d['p1'])
        AttendanceRecord.objects.create(tenant=s, student=d['amy'], date=day, status='present')
        AttendanceRecord.objects.create(tenant=s, student=d['ben'], date=day, status='absent')
        # Quiz due yesterday: 1 of 3 marked. Next week's test. Other teacher's work is not mine.
        quiz = Assignment.objects.create(tenant=s, class_subject=d['cs_math'], term=d['term'], title='Quiz 3',
                                         due_date=day - timedelta(days=1), points_possible=10)
        Score.objects.create(assignment=quiz, student=d['amy'], points=Decimal('8'))
        Assignment.objects.create(tenant=s, class_subject=d['cs_math'], term=d['term'], title='Unit test',
                                  due_date=day + timedelta(days=3), is_published=False)
        hw = Homework.objects.create(tenant=s, class_ref=d['c6'], class_name='Grade 6', subject_name='Maths', teacher=d['khan_t'],
                                     title='Worksheet', homework_date=day - timedelta(days=3), due_date=day - timedelta(days=1))
        HomeworkSubmission.objects.create(homework=hw, student=d['ben'], status='submitted')
        MeetingSlot.objects.create(tenant=s, host=d['khan'], date=day, start_time=time(15, 0), end_time=time(15, 15),
                                   booked_by=parent, student=d['amy'], note='About maths')
        MeetingSlot.objects.create(tenant=s, host=d['khan'], date=day, start_time=time(15, 15), end_time=time(15, 30))
        AbsenceReport.objects.create(tenant=s, student=d['ben'], start_date=day, end_date=day, reason='illness', note='Fever')
        AbsenceReport.objects.create(tenant=s, student=d['zed'], start_date=day, end_date=day, reason='illness')
        cat_ = BehaviourCategory.objects.create(tenant=s, name='Disrespect', kind='negative', points=-2)
        BehaviourIncident.objects.create(tenant=s, student=d['cat'], category=cat_, kind='negative', points=-2, date=day - timedelta(days=2),
                                         follow_up_date=day - timedelta(days=1), reported_by=d['khan'])
    r = _client(d['khan']).get(f'{URL}/today/')
    assert r.status_code == 200
    t = r.json()
    assert [(l['period'], l['register_done']) for l in t['lessons']] == [('Period 1', True), ('Period 2', False)]
    assert t['lessons'][0]['room'] == 'Room 12' and t['lessons'][0]['students'] == 3
    assert [(x['class_name'], x['marked'], x['total'], x['absent'], x['homeroom']) for x in t['registers']] == [('Grade 6', 2, 3, 1, True)]
    assert [(x['title'], x['marked'], x['total']) for x in t['to_mark']] == [('Quiz 3', 1, 3)]
    assert [x['title'] for x in t['homework_to_mark']] == ['Worksheet'] and t['homework_to_mark'][0]['waiting'] == 1
    assert [x['title'] for x in t['due_soon']] == ['Unit test'] and t['due_soon'][0]['published'] is False
    assert [(m['start'], m['with'], m['student']) for m in t['meetings']] == [('15:00', 'Mrs Bell', 'Amy Bell')]
    assert [a['student'] for a in t['absence_notes']] == ['Ben Cole']  # not Zed (not my class)
    assert [f['student'] for f in t['follow_ups']] == ['Cat Dunn'] and t['follow_ups'][0]['overdue']
    # Parents and students have no workspace.
    assert _client(parent).get(f'{URL}/today/').status_code == 403


@pytest.mark.django_db
def test_classes_roster_and_attention(ws):
    d = ws
    s, day = d['s'], d['day']
    with use_tenant(s):
        for n in range(12):
            AttendanceRecord.objects.create(tenant=s, student=d['amy'], date=day - timedelta(days=n + 1),
                                            status='absent' if n < 4 else 'present')
            AttendanceRecord.objects.create(tenant=s, student=d['ben'], date=day - timedelta(days=n + 1), status='present')
        items = [Assignment.objects.create(tenant=s, class_subject=d['cs_math'], term=d['term'], title=f'Task {i}',
                                           due_date=day - timedelta(days=i + 1), points_possible=10) for i in range(3)]
        for a in items:
            Score.objects.create(assignment=a, student=d['amy'], points=Decimal('3'))
            Score.objects.create(assignment=a, student=d['ben'], points=Decimal('9'))
            Score.objects.create(assignment=a, student=d['cat'], status='missing')
    khan = _client(d['khan'])
    cl = khan.get(f'{URL}/classes/').json()
    assert [c['name'] for c in cl['classes']] == ['Grade 6']
    g6 = cl['classes'][0]
    assert g6['homeroom'] and g6['subjects'] == ['Maths'] and g6['students'] == 3 and g6['missing'] == 3
    detail = khan.get(f'{URL}/classes/{d["c6"].id}/').json()
    rows = {r['full_name']: r for r in detail['students']}
    assert rows['Amy Bell']['attendance_rate'] == pytest.approx(66.7) and rows['Amy Bell']['average'] == 30.0
    assert set(rows['Amy Bell']['attention']) == {'Attendance 66.7%', 'Average 30.0%'}
    assert rows['Ben Cole']['attention'] == [] and rows['Ben Cole']['average'] == 90.0
    assert rows['Cat Dunn']['attention'] == ['Average 0.0%', '3 missing']  # missing work counts as zero
    assert detail['class']['attention'] == 2
    # Not his class.
    assert khan.get(f'{URL}/classes/{d["c7"].id}/').status_code == 404
    # The office sees every class.
    office = [c['name'] for c in _client(d['admin']).get(f'{URL}/classes/').json()['classes']]
    assert office == ['Grade 6', 'Grade 7']
    # Report: spread and attention across classes.
    rep = khan.get(f'{URL}/report/').json()
    [maths] = rep['grades']
    assert maths['subject'] == 'Maths' and maths['highest'] == 90.0 and maths['lowest'] == 0.0
    assert [a['full_name'] for a in rep['attention']] == ['Amy Bell', 'Cat Dunn']
    assert rep['attendance'][0]['class_name'] == 'Grade 6' and rep['attendance'][0]['absences'] == 4
