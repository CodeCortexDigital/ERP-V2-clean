"""School calendar: events, closures, combined feed, meeting booking, iCal and reminders (Phase 8)."""
from datetime import date, timedelta

import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import AcademicYear, ClassSubject, SchoolClass, Subject, Teacher, TeacherSubjectAssignment
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

FUTURE = date.today() + timedelta(days=10)
URL = '/api/v1/auth/calendar'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def school(db):
    s = SchoolFactory(name='Riverbend School')
    admin = UserFactory(email='office@riverbend.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    with use_tenant(s):
        c4 = SchoolClass.objects.create(tenant=s, name='Grade 4', code='G4', grade_level=4)
        c5 = SchoolClass.objects.create(tenant=s, name='Grade 5', code='G5', grade_level=5)
        t4 = Teacher.objects.create(tenant=s, full_name='Ms Green', email='green@riverbend.test', employee_id='T1', joining_date='2020-01-01')
        Teacher.objects.create(tenant=s, full_name='Mr Blue', email='blue@riverbend.test', employee_id='T2', joining_date='2020-01-01')
        subj = Subject.objects.create(tenant=s, name='Science', code='SCI')
        year = AcademicYear.objects.create(tenant=s, name='2026-27', start_date='2026-08-01', end_date='2027-06-30',
                                           is_active=True)
        TeacherSubjectAssignment.objects.create(teacher=t4, academic_year=year,
                                                class_subject=ClassSubject.objects.create(class_ref=c4, subject=subj))
    from django.contrib.auth import get_user_model

    from services.core.accounts.models import TeacherProfile

    def teacher_login(email, name, code):
        user = get_user_model().objects.filter(email=email).first() or UserFactory(email=email)
        user.full_name = name
        user.save()
        TeacherProfile.objects.get_or_create(user=user, defaults={'employee_id': code})
        return user

    green = teacher_login('green@riverbend.test', 'Ms Green', 'T1')
    blue = teacher_login('blue@riverbend.test', 'Mr Blue', 'T2')
    kid4 = StudentFactory(tenant=s, current_class=c4, full_name='Kid Four', father_name='', mother_name='', guardian_name='')
    kid5 = StudentFactory(tenant=s, current_class=c5, full_name='Kid Five', father_name='', mother_name='', guardian_name='')
    parent4 = UserFactory(email='p4@example.com', full_name='Parent Four')
    ParentProfile.objects.create(user=parent4).linked_students.add(kid4)
    parent5 = UserFactory(email='p5@example.com', full_name='Parent Five')
    ParentProfile.objects.create(user=parent5).linked_students.add(kid5)
    return dict(s=s, admin=admin, green=green, blue=blue, c4=c4, c5=c5, kid4=kid4, kid5=kid5, p4=parent4, p5=parent5,
                year=year)


@pytest.mark.django_db
def test_events_reach_the_right_people_and_holidays_close_school(school):
    d = school
    admin, green, p4, p5 = (_client(d[k]) for k in ('admin', 'green', 'p4', 'p5'))
    r = admin.post(f'{URL}/events/', {'title': 'Eid holiday', 'kind': 'holiday', 'start_date': str(FUTURE),
                                      'end_date': str(FUTURE + timedelta(days=2))}, format='json')
    assert r.status_code == 201 and r.json()['closes_school'] is True
    admin.post(f'{URL}/events/', {'title': 'Staff training', 'start_date': str(FUTURE), 'audience': 'staff'}, format='json')
    admin.post(f'{URL}/events/', {'title': 'Grade 5 trip', 'kind': 'trip', 'start_date': str(FUTURE),
                                  'audience': 'grade', 'grade_levels': [5]}, format='json')
    # A teacher can add an event for her own class, not the whole school or another class.
    assert green.post(f'{URL}/events/', {'title': 'G4 science fair', 'start_date': str(FUTURE), 'audience': 'class',
                                         'class_ids': [str(d['c4'].id)]}, format='json').status_code == 201
    assert green.post(f'{URL}/events/', {'title': 'Whole school', 'start_date': str(FUTURE)}, format='json').status_code == 403
    assert green.post(f'{URL}/events/', {'title': 'G5', 'start_date': str(FUTURE), 'audience': 'class',
                                         'class_ids': [str(d['c5'].id)]}, format='json').status_code == 403
    assert p4.post(f'{URL}/events/', {'title': 'x', 'start_date': str(FUTURE)}, format='json').status_code == 403
    assert admin.post(f'{URL}/events/', {'title': 'Bad', 'start_date': str(FUTURE),
                                         'end_date': str(FUTURE - timedelta(days=1))}, format='json').status_code == 400

    q = {'from': str(FUTURE - timedelta(days=1)), 'to': str(FUTURE + timedelta(days=5))}

    def titles(c):
        return {i['title'] for i in c.get(f'{URL}/feed/', q).json()}

    assert titles(p4) == {'Eid holiday', 'G4 science fair'}
    assert titles(p5) == {'Eid holiday', 'Grade 5 trip'}
    assert {'Eid holiday', 'Staff training', 'G4 science fair'} <= titles(green) and 'Grade 5 trip' not in titles(green)
    assert len(titles(admin)) == 4

    from services.education.attendance.calendar import is_school_day
    from services.education.schoolcalendar.models import CalendarEvent

    with use_tenant(d['s']):
        day = FUTURE + timedelta(days=(7 - FUTURE.weekday()) % 7)  # a Monday
        CalendarEvent.objects.filter(title='Eid holiday').update(start_date=day, end_date=day)
        assert is_school_day(day) is False
        assert is_school_day(day + timedelta(days=1)) is True

    # Only the author or the office can change an event.
    ev = next(i for i in admin.get(f'{URL}/feed/', q).json() if i['title'] == 'G4 science fair')
    eid = ev['id'].split(':')[1]
    assert p4.patch(f'{URL}/events/{eid}/', {'title': 'Hacked'}, format='json').status_code == 403
    assert green.patch(f'{URL}/events/{eid}/', {'location': 'Hall'}, format='json').json()['location'] == 'Hall'
    assert admin.delete(f'{URL}/events/{eid}/').status_code == 204


@pytest.mark.django_db
def test_feed_includes_exams_assignments_fees_and_terms(school):
    d = school
    from services.education.academics.models import Term
    from services.education.exams.models import Exam
    from services.education.finance.models import Invoice
    from services.education.gradebook.models import Assignment

    with use_tenant(d['s']):
        cs = ClassSubject.objects.get(class_ref=d['c4'])
        Exam.objects.create(title='Science midterm', exam_type='midterm', class_ref=d['c4'], subject=cs.subject,
                            total_marks=50, passing_marks=20, exam_date=FUTURE)
        Assignment.objects.create(class_subject=cs, title='Volcano poster', due_date=FUTURE)
        Assignment.objects.create(class_subject=cs, title='Draft quiz', due_date=FUTURE, is_published=False)
        Invoice.objects.create(student=d['kid4'], due_date=FUTURE, amount=1000, status='issued')
        Term.objects.create(tenant=d['s'], academic_year=d['year'], name='Term 2', start_date=FUTURE,
                            end_date=FUTURE + timedelta(days=90))
    q = {'from': str(FUTURE), 'to': str(FUTURE)}
    p4 = {i['title'] for i in _client(d['p4']).get(f'{URL}/feed/', q).json()}
    assert {'Science midterm (Grade 4)', 'Due: Volcano poster (Science)', 'Term 2 starts'} <= p4
    assert 'Due: Draft quiz (Science)' not in p4
    assert any(t.startswith('Fee due: Kid Four') for t in p4)
    p5 = {i['title'] for i in _client(d['p5']).get(f'{URL}/feed/', q).json()}
    assert p5 == {'Term 2 starts'}
    green = {i['title'] for i in _client(d['green']).get(f'{URL}/feed/', q).json()}
    assert 'Due: Draft quiz (Science)' in green and not any(t.startswith('Fee due') for t in green)


@pytest.mark.django_db
def test_parent_books_a_meeting_with_their_childs_teacher(school):
    d = school
    green, blue, p4, p5 = (_client(d[k]) for k in ('green', 'blue', 'p4', 'p5'))
    r = green.post(f'{URL}/meetings/', {'date': str(FUTURE), 'from': '15:00', 'to': '16:00', 'minutes': 20,
                                        'location': 'Room 4'}, format='json')
    assert r.status_code == 201 and [s['start_time'] for s in r.json()] == ['15:00', '15:20', '15:40']
    # Offering the same hour again makes no duplicates.
    assert green.post(f'{URL}/meetings/', {'date': str(FUTURE), 'from': '15:00', 'to': '16:00', 'minutes': 20},
                      format='json').json() == []
    blue.post(f'{URL}/meetings/', {'date': str(FUTURE), 'from': '09:00', 'to': '09:30', 'minutes': 15}, format='json')
    assert p4.post(f'{URL}/meetings/', {'date': str(FUTURE), 'from': '09:00', 'to': '10:00'}, format='json').status_code == 403

    open4 = p4.get(f'{URL}/meetings/').json()
    assert {s['host']['name'] for s in open4} == {'Ms Green'} and len(open4) == 3
    assert p5.get(f'{URL}/meetings/').json() == []  # Kid Five's class has no teacher offering times
    slot = open4[0]['id']
    blue_slot = blue.get(f'{URL}/meetings/').json()[0]['id']
    assert p4.post(f'{URL}/meetings/{blue_slot}/book/', {}, format='json').status_code == 403

    mail.outbox.clear()
    booked = p4.post(f'{URL}/meetings/{slot}/book/', {'note': 'Reading progress'}, format='json')
    assert booked.status_code == 200 and booked.json()['mine'] and booked.json()['student'] == 'Kid Four'
    assert any('green@riverbend.test' in m.to for m in mail.outbox)
    assert p5.post(f'{URL}/meetings/{slot}/book/', {}, format='json').status_code in (403, 409)
    mine = green.get(f'{URL}/meetings/').json()
    assert next(s for s in mine if s['id'] == slot)['booked_by'] == 'Parent Four'
    q = {'from': str(FUTURE), 'to': str(FUTURE)}
    assert any(i['source'] == 'meeting' for i in p4.get(f'{URL}/feed/', q).json())

    # The reminder the day before goes to both sides, once.
    from services.education.schoolcalendar.api import send_reminders

    with use_tenant(d['s']):
        mail.outbox.clear()
        assert send_reminders(FUTURE - timedelta(days=1)) == 2
        assert send_reminders(FUTURE - timedelta(days=1)) == 0
    assert {tuple(m.to) for m in mail.outbox} == {('green@riverbend.test',), ('p4@example.com',)}

    assert p5.post(f'{URL}/meetings/{slot}/cancel/', {}, format='json').status_code == 403
    assert p4.post(f'{URL}/meetings/{slot}/cancel/', {}, format='json').json()['booked'] is False
    assert p4.delete(f'{URL}/meetings/{slot}/cancel/').status_code == 403
    assert green.delete(f'{URL}/meetings/{slot}/cancel/').status_code == 204


@pytest.mark.django_db
def test_event_reminders_and_ical_feed(school):
    d = school
    admin = _client(d['admin'])
    admin.post(f'{URL}/events/', {'title': 'Sports day', 'start_date': str(FUTURE), 'start_time': '09:00',
                                  'end_time': '12:00', 'location': 'Field', 'audience': 'class',
                                  'class_ids': [str(d['c4'].id)], 'remind_days_before': 3}, format='json')
    from services.education.schoolcalendar.api import send_reminders

    with use_tenant(d['s']):
        mail.outbox.clear()
        assert send_reminders(FUTURE - timedelta(days=4)) == 0
        assert send_reminders(FUTURE - timedelta(days=3)) >= 2
        assert send_reminders(FUTURE - timedelta(days=3)) == 0
    to = {a for m in mail.outbox for a in m.to}
    assert {'p4@example.com', 'green@riverbend.test'} <= to and 'p5@example.com' not in to

    link = _client(d['p4']).get(f'{URL}/feed-link/').json()['url']
    path = link[link.index('/api/v1/'):]
    ics = APIClient().get(path)
    assert ics.status_code == 200 and ics['Content-Type'].startswith('text/calendar')
    text = ics.content.decode()
    assert 'SUMMARY:Sports day' in text and f'DTSTART:{FUTURE:%Y%m%d}T090000' in text and 'LOCATION:Field' in text
    assert APIClient().get(path[:-5] + 'xxxx/').status_code == 404
