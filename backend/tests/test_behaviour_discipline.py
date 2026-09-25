"""Behaviour management: categories, the behaviour log, actions, family alerts, milestones, history and reports (Phase 9)."""
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

URL = '/api/v1/auth/behaviour'


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
        subj = Subject.objects.create(tenant=s, name='Science', code='SCI')
        year = AcademicYear.objects.create(tenant=s, name='2026-27', start_date='2026-08-01', end_date='2027-06-30', is_active=True)
        TeacherSubjectAssignment.objects.create(teacher=t4, academic_year=year,
                                                class_subject=ClassSubject.objects.create(class_ref=c4, subject=subj))
    from django.contrib.auth import get_user_model

    from services.core.accounts.models import TeacherProfile

    green = get_user_model().objects.filter(email='green@riverbend.test').first() or UserFactory(email='green@riverbend.test')
    green.full_name = 'Ms Green'
    green.save()
    TeacherProfile.objects.get_or_create(user=green, defaults={'employee_id': 'T1'})
    kid4 = StudentFactory(tenant=s, current_class=c4, full_name='Kid Four', father_name='', mother_name='', guardian_name='')
    kid4b = StudentFactory(tenant=s, current_class=c4, full_name='Kid FourB', father_name='', mother_name='', guardian_name='')
    kid5 = StudentFactory(tenant=s, current_class=c5, full_name='Kid Five', father_name='', mother_name='', guardian_name='')
    p4 = UserFactory(email='p4@example.com', full_name='Parent Four')
    ParentProfile.objects.create(user=p4).linked_students.add(kid4)
    p5 = UserFactory(email='p5@example.com', full_name='Parent Five')
    ParentProfile.objects.create(user=p5).linked_students.add(kid5)
    return dict(s=s, admin=admin, green=green, c4=c4, c5=c5, kid4=kid4, kid4b=kid4b, kid5=kid5, p4=p4, p5=p5)


def _cat(client, name):
    return next(c for c in client.get(f'{URL}/categories/').json() if c['name'] == name)


@pytest.mark.django_db
def test_categories_are_seeded_and_only_the_office_changes_them(school):
    d = school
    admin, green = _client(d['admin']), _client(d['green'])
    cats = admin.get(f'{URL}/categories/').json()
    assert len(cats) >= 10 and {'positive', 'negative'} == {c['kind'] for c in cats}
    assert all(c['points'] < 0 for c in cats if c['kind'] == 'negative')
    assert green.post(f'{URL}/categories/', {'name': 'X', 'kind': 'positive'}, format='json').status_code == 403
    r = admin.post(f'{URL}/categories/', {'name': 'Late homework', 'kind': 'negative', 'points': 2}, format='json')
    assert r.status_code == 201 and r.json()['points'] == -2  # an incident always takes points away
    assert admin.post(f'{URL}/categories/', {'name': 'late homework', 'kind': 'negative'}, format='json').status_code == 400
    # A used category is retired, not deleted.
    cat = _cat(admin, 'Kindness')
    green.post(f'{URL}/incidents/', {'category': cat['id'], 'student_ids': [str(d['kid4'].id)]}, format='json')
    assert admin.delete(f'{URL}/categories/{cat["id"]}/').json()['is_active'] is False
    new = r.json()['id']
    assert admin.delete(f'{URL}/categories/{new}/').status_code == 204


@pytest.mark.django_db
def test_teacher_logs_for_her_class_and_families_see_only_their_child(school):
    d = school
    green, p4, p5 = _client(d['green']), _client(d['p4']), _client(d['p5'])
    merit = _cat(green, 'Helping others')
    fight = _cat(green, 'Fighting')
    mail.outbox.clear()
    r = green.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': [str(d['kid4'].id), str(d['kid4b'].id)],
                                         'description': 'Helped tidy the lab'}, format='json')
    assert r.status_code == 201 and len(r.json()['incidents']) == 2
    assert all(i['points'] == 2 and i['status'] == 'resolved' for i in r.json()['incidents'])
    assert mail.outbox == []  # merits don't email by default
    # Not a student she teaches; a parent can't log.
    assert green.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': [str(d['kid5'].id)]}, format='json').status_code == 403
    assert p4.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': [str(d['kid4'].id)]}, format='json').status_code == 403
    assert green.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': [str(d['kid4'].id)],
                                            'date': str(date.today() + timedelta(days=1))}, format='json').status_code == 400

    inc = green.post(f'{URL}/incidents/', {'category': fight['id'], 'student_ids': [str(d['kid4'].id)],
                                           'description': 'Pushing in the queue', 'location': 'Canteen',
                                           'follow_up_date': str(date.today())}, format='json').json()['incidents'][0]
    assert inc['points'] == -5 and inc['status'] == 'open' and inc['family_notified_at']
    assert any('p4@example.com' in m.to and 'Fighting' in m.body for m in mail.outbox)
    hidden = green.post(f'{URL}/incidents/', {'category': fight['id'], 'student_ids': [str(d['kid4'].id)],
                                              'visible_to_family': False, 'description': 'Staff-only note'},
                        format='json').json()['incidents'][0]
    assert hidden['family_notified_at'] is None

    mine = p4.get(f'{URL}/incidents/').json()
    assert {i['student']['full_name'] for i in mine} == {'Kid Four'} and len(mine) == 2  # merit + fight, not the hidden one
    assert 'visible_to_family' not in mine[0] and 'editable' not in mine[0]
    assert p5.get(f'{URL}/incidents/').json() == []
    assert p4.get(f'{URL}/incidents/{hidden["id"]}/').status_code == 404
    assert p5.get(f'{URL}/students/{d["kid4"].id}/summary/').status_code == 403

    s = p4.get(f'{URL}/students/{d["kid4"].id}/summary/').json()
    assert s['points'] == -3 and s['merits'] == 1 and s['incidents'] == 1 and s['open_incidents'] == 1
    staff = _client(d['admin']).get(f'{URL}/students/{d["kid4"].id}/summary/').json()
    assert staff['incidents'] == 2 and staff['points'] == -8
    roster = green.get(f'{URL}/classes/{d["c4"].id}/points/').json()
    assert {r['full_name']: r['points'] for r in roster} == {'Kid Four': -8, 'Kid FourB': 2}
    assert green.get(f'{URL}/classes/{d["c5"].id}/points/').status_code == 403


@pytest.mark.django_db
def test_actions_follow_ups_and_suspensions(school):
    d = school
    admin, green, p4 = _client(d['admin']), _client(d['green']), _client(d['p4'])
    fight = _cat(green, 'Fighting')
    inc = green.post(f'{URL}/incidents/', {'category': fight['id'], 'student_ids': [str(d['kid4'].id)],
                                           'follow_up_date': str(date.today()), 'notify_family': False},
                     format='json').json()['incidents'][0]
    iid = inc['id']
    a = green.post(f'{URL}/incidents/{iid}/actions/', {'action_type': 'detention', 'start_date': str(date.today()),
                                                      'notes': 'Lunch detention'}, format='json')
    assert a.status_code == 201 and a.json()['label'] == 'Detention'
    assert green.get(f'{URL}/incidents/{iid}/').json()['status'] == 'in_review'
    assert green.post(f'{URL}/incidents/{iid}/actions/', {'action_type': 'suspension'}, format='json').status_code == 403
    mail.outbox.clear()
    s = admin.post(f'{URL}/incidents/{iid}/actions/', {'action_type': 'suspension', 'start_date': str(date.today()),
                                                      'end_date': str(date.today() + timedelta(days=2)), 'notify_family': True},
                   format='json')
    assert s.status_code == 201 and any('Suspension' in m.body for m in mail.outbox)
    green.post(f'{URL}/incidents/{iid}/actions/', {'action_type': 'follow_up', 'notes': 'Spoke to both boys'}, format='json')
    # Families don't see internal follow-up notes.
    fam = p4.get(f'{URL}/incidents/{iid}/').json()
    assert [x['action_type'] for x in fam['actions']] == ['detention', 'suspension']

    report = admin.get(f'{URL}/report/').json()
    assert report['totals']['incidents'] == 1 and report['totals']['open'] == 1
    assert [f['id'] for f in report['follow_ups_due']] == [iid]
    assert report['suspended_today'][0]['student'] == 'Kid Four'
    assert report['by_category'][0]['name'] == 'Fighting' and report['most_incidents'][0]['name'] == 'Kid Four'
    assert p4.get(f'{URL}/report/').status_code == 403

    assert p4.patch(f'{URL}/incidents/{iid}/', {'status': 'resolved'}, format='json').status_code == 403
    done = green.patch(f'{URL}/incidents/{iid}/', {'status': 'resolved'}, format='json').json()
    assert done['status'] == 'resolved'
    assert admin.get(f'{URL}/incidents/', {'follow_up': 1}).json() == []


@pytest.mark.django_db
def test_points_milestones_are_awarded_once(school):
    d = school
    admin, green = _client(d['admin']), _client(d['green'])
    assert admin.put(f'{URL}/settings/', {'milestones': [{'points': 4, 'name': 'Star pupil'}, {'points': 0, 'name': 'bad'}],
                                          'notify_milestones': True}, format='json').json()['milestones'] == [{'points': 4, 'name': 'Star pupil'}]
    assert green.put(f'{URL}/settings/', {'milestones': []}, format='json').status_code == 403
    merit = _cat(green, 'Helping others')  # +2 each
    kid = [str(d['kid4'].id)]
    assert green.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': kid}, format='json').json()['awards'] == []
    mail.outbox.clear()
    assert green.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': kid}, format='json').json()['awards'] == ['Kid Four: Star pupil']
    assert any('Star pupil' in m.body for m in mail.outbox)
    assert green.post(f'{URL}/incidents/', {'category': merit['id'], 'student_ids': kid}, format='json').json()['awards'] == []
    summary = _client(d['p4']).get(f'{URL}/students/{d["kid4"].id}/summary/').json()
    assert [a['name'] for a in summary['awards']] == ['Star pupil'] and summary['next_milestone'] is None


@pytest.mark.django_db
def test_legacy_behaviour_endpoints_are_read_only_for_families(school):
    d = school
    from services.education.behaviour.models import BehaviourRating

    with use_tenant(d['s']):
        BehaviourRating.objects.create(student=d['kid4'], class_ref=d['c4'], comments='Kind')
        BehaviourRating.objects.create(student=d['kid5'], class_ref=d['c5'], comments='Other child')
    p4 = _client(d['p4'])
    rows = p4.get('/api/v1/education/behaviour/ratings/').json()
    rows = rows.get('results', rows) if isinstance(rows, dict) else rows
    assert [r['comments'] for r in rows] == ['Kind']
    assert p4.post('/api/v1/education/behaviour/skills/', {'name': 'Hack'}, format='json').status_code == 403
    assert _client(d['green']).post('/api/v1/education/behaviour/skills/', {'name': 'Teamwork'}, format='json').status_code == 201
