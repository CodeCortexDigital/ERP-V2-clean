"""Two-way messaging, announcements, SMS and communication history (Phase 7)."""
from unittest import mock

import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import ClassSubject, SchoolClass, Subject, Teacher, TeacherSubjectAssignment
from services.education.communication.inbox import normalize_phone
from services.education.communication.models import Announcement, Message
from services.education.students.models import Guardian, StudentGuardian
from tests.conftest import SchoolFactory, StudentFactory, UserFactory


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
        from services.education.academics.models import AcademicYear

        year = AcademicYear.objects.create(tenant=s, name='2026-27', start_date='2026-08-01', end_date='2027-06-30',
                                           is_active=True)
        TeacherSubjectAssignment.objects.create(teacher=t4, academic_year=year,
                                                class_subject=ClassSubject.objects.create(class_ref=c4, subject=subj))
    from django.contrib.auth import get_user_model

    from services.core.accounts.models import TeacherProfile

    def teacher_login(email, name, code):
        # Adding a teacher already creates their portal login; reuse it.
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
    g = Guardian.objects.create(tenant=s, first_name='Gran', last_name='Four', relationship='grandparent',
                                email='gran@example.com', mobile_phone='0300 1234567')
    StudentGuardian.objects.create(tenant=s, student=kid4, guardian=g, receives_messages=True)
    return dict(s=s, admin=admin, green=green, blue=blue, c4=c4, c5=c5, kid4=kid4, kid5=kid5, p4=parent4, p5=parent5)


@pytest.mark.django_db
def test_parents_reach_only_their_childs_teachers_and_the_office(school):
    d = school
    names = {c['name']: c['role'] for c in _client(d['p4']).get('/api/v1/auth/communication/contacts/').json()}
    assert names == {'Office Admin': 'Office', 'Ms Green': 'Teacher'}  # not Mr Blue, not other parents
    teacher_contacts = {c['name'] for c in _client(d['green']).get('/api/v1/auth/communication/contacts/').json()}
    assert 'Parent Four' in teacher_contacts and 'Parent Five' not in teacher_contacts

    blocked = _client(d['p4']).post('/api/v1/auth/communication/conversations/', {
        'participants': [str(d['blue'].id)], 'subject': 'Hi', 'body': 'x'}, format='json')
    assert blocked.status_code == 403


@pytest.mark.django_db
def test_conversation_flow_with_unread_counts_and_notifications(school):
    d = school
    p4 = _client(d['p4'])
    res = p4.post('/api/v1/auth/communication/conversations/', {
        'participants': [str(d['green'].id)], 'subject': 'Science project', 'body': 'Can Kid bring a poster?',
        'student': str(d['kid4'].id)}, format='json')
    assert res.status_code == 201, res.content
    conv = res.json()['id']
    assert any('Science project' in m.subject for m in mail.outbox)

    green = _client(d['green'])
    assert green.get('/api/v1/auth/communication/unread/').json()['messages'] == 1
    thread = green.get(f'/api/v1/auth/communication/conversations/{conv}/').json()
    assert thread['messages'][0]['body'] == 'Can Kid bring a poster?' and thread['student']['full_name'] == 'Kid Four'
    assert green.get('/api/v1/auth/communication/unread/').json()['messages'] == 0
    assert green.post(f'/api/v1/auth/communication/conversations/{conv}/messages/', {'body': 'Yes please!'},
                      format='json').status_code == 201
    assert p4.get('/api/v1/auth/communication/conversations/').json()[0]['unread'] == 1

    # Someone outside the conversation cannot read it.
    assert _client(d['p5']).get(f'/api/v1/auth/communication/conversations/{conv}/').status_code == 404
    history = _client(d['admin']).get(f"/api/v1/auth/communication/history/{d['kid4'].id}/").json()
    assert history[0]['kind'] == 'conversation' and history[0]['title'] == 'Science project'


@pytest.mark.django_db
def test_class_announcement_reaches_the_right_families(school):
    d = school
    admin = _client(d['admin'])
    res = admin.post('/api/v1/auth/communication/announcements/', {
        'title': 'Grade 4 trip', 'body': 'Museum visit on Friday.', 'audience': 'class', 'class_ids': [str(d['c4'].id)],
        'send_email': True}, format='json')
    assert res.status_code == 201, res.content
    assert res.json()['recipient_count'] >= 1  # Grade 4 parent logins only (checked below)
    sent_to = {addr for m in mail.outbox for addr in m.to}
    assert {'p4@example.com', 'gran@example.com'} <= sent_to and 'p5@example.com' not in sent_to
    assert [a['title'] for a in _client(d['p4']).get('/api/v1/auth/communication/announcements/').json()] == ['Grade 4 trip']
    assert _client(d['p5']).get('/api/v1/auth/communication/announcements/').json() == []

    # Teachers may only announce to their own classes; parents can't announce.
    assert _client(d['green']).post('/api/v1/auth/communication/announcements/', {
        'title': 'x', 'body': 'y', 'audience': 'class', 'class_ids': [str(d['c5'].id)]}, format='json').status_code == 403
    assert _client(d['p4']).post('/api/v1/auth/communication/announcements/', {
        'title': 'x', 'body': 'y'}, format='json').status_code == 403

    ann_id = res.json()['id']
    _client(d['p4']).post(f'/api/v1/auth/communication/announcements/{ann_id}/', format='json')
    staff_view = admin.get('/api/v1/auth/communication/announcements/').json()[0]
    assert staff_view['read_count'] == 1


@pytest.mark.django_db
def test_scheduled_announcement_waits(school):
    d = school
    res = _client(d['admin']).post('/api/v1/auth/communication/announcements/', {
        'title': 'Later', 'body': 'Soon', 'audience': 'parents', 'scheduled_for': '2099-01-01T08:00:00Z'}, format='json')
    assert res.json()['sent_at'] is None
    with use_tenant(d['s']):
        assert Announcement.objects.get(title='Later').receipts.count() == 0


@pytest.mark.django_db
def test_sms_through_twilio(school):
    d = school
    admin = _client(d['admin'])
    assert admin.post('/api/v1/auth/communication/sms/send/', {'to': ['+15555550100'], 'message': 'Hi'},
                      format='json').status_code == 400  # not set up yet
    cfg = admin.put('/api/v1/auth/communication/sms/settings/', {
        'account_sid': 'AC123', 'auth_token': 'secret-token', 'from_number': '+15555550000', 'default_country_code': '92'},
        format='json').json()
    assert cfg['ready'] and cfg['has_auth_token'] and 'auth_token' not in cfg
    fake = mock.Mock(status_code=201, content=b'1')
    fake.json.return_value = {'sid': 'SM1', 'status': 'queued'}
    with mock.patch('services.education.communication.inbox.requests.post', return_value=fake) as post:
        res = admin.post('/api/v1/auth/communication/sms/send/', {'to': ['0300 1234567'], 'message': 'School closed today'},
                         format='json').json()
    assert res['sent'] == 1 and post.call_args.kwargs['data']['To'] == '+923001234567'
    with use_tenant(d['s']):
        assert Message.objects.get(channel='sms').external_id == 'SM1'
    assert _client(d['p4']).put('/api/v1/auth/communication/sms/settings/', {}, format='json').status_code == 403


def test_phone_numbers():
    assert normalize_phone('0300-1234567', '92') == '+923001234567'
    assert normalize_phone('+44 20 7946 0958') == '+442079460958'
    assert normalize_phone('0044 20 7946 0958') == '+442079460958'
    assert normalize_phone('12') is None
