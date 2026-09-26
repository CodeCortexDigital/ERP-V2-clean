"""Privacy documents, consent, privacy requests and incidents (P14)."""
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.privacy.models import ConsentRecord, Incident, PrivacyRequest
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import SchoolClass
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

V = '/api/v1/privacy'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def pv(db, settings):
    settings.FALLBACK_EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    s = SchoolFactory(name='Hillside School', tenant_code='HSS')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher')
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    with use_tenant(s):
        g1 = SchoolClass.objects.create(tenant=s, name='Grade 1', code='G1')
        from services.education.academics.models import Teacher

        Teacher.objects.create(tenant=s, full_name='Tess Teacher', email='t@hillside.test', employee_id='T1', joining_date='2020-01-01')
    amy = StudentFactory(tenant=s, current_class=g1, full_name='Amy Pupil', email='', **kw)
    ben = StudentFactory(tenant=s, current_class=g1, full_name='Ben Other', email='', **kw)
    parent = UserFactory(email='mum@family.test')
    ParentProfile.objects.create(user=parent).linked_students.add(amy)
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    return dict(s=s, office=_client(admin), teacher=_client(teacher), parent=_client(parent), owner=_client(owner), amy=amy, ben=ben)


@pytest.mark.django_db
def test_documents_are_published_and_accepted(pv):
    anyone = APIClient()
    tpl = anyone.get(f'{V}/legal/privacy/').json()['document']
    assert tpl['version'] == 0 and 'reviewed by a lawyer' in tpl['body']  # a template until the platform publishes one
    assert pv['parent'].get(f'{V}/pending/').json()['documents'] == []
    r = pv['owner'].post(f'{V}/platform/documents/', {'kind': 'privacy', 'title': 'Privacy notice', 'body': tpl['body'], 'summary': 'First version'},
                         format='json')
    assert r.status_code == 201 and r.json()['document']['version'] == 1
    assert pv['office'].post(f'{V}/platform/documents/', {'kind': 'terms', 'body': 'x' * 60}, format='json').status_code == 403
    # The school publishes its own notice (starting from the template); everyone is asked to accept both.
    tpl2 = pv['office'].get(f'{V}/documents/').json()['template']
    assert 'Hillside School' in tpl2['title']
    pv['office'].post(f'{V}/documents/', {'title': tpl2['title'], 'body': tpl2['body']}, format='json')
    pending = pv['parent'].get(f'{V}/pending/').json()['documents']
    assert sorted(d['kind'] for d in pending) == ['privacy', 'school_privacy']
    left = pv['parent'].post(f'{V}/accept/', {'documents': [d['id'] for d in pending]}, format='json').json()
    assert left['accepted'] == 2 and left['pending'] == []
    assert anyone.get(f'{V}/legal/school/hss/').json()['document']['title'].startswith('Privacy notice for Hillside')
    docs = pv['office'].get(f'{V}/documents/').json()['documents']
    assert {d['kind']: d['accepted'] for d in docs}['privacy'] >= 1
    # A new version asks again.
    pv['owner'].post(f'{V}/platform/documents/', {'kind': 'privacy', 'body': tpl['body'] + ' Updated.', 'summary': 'Clarified'}, format='json')
    assert [d['version'] for d in pv['parent'].get(f'{V}/pending/').json()['documents']] == [2]
    subs = anyone.get(f'{V}/legal/subprocessors/').json()['subprocessors']
    assert subs[0]['name'] == 'Render' and any(p['name'] == 'Stripe' and p['optional'] for p in subs)


@pytest.mark.django_db
def test_consent_per_child_and_the_report(pv):
    parent, office = pv['parent'], pv['office']
    me = parent.get(f'{V}/me/').json()
    assert [c['name'] for c in me['children']] == ['Amy Pupil']
    photos = me['children'][0]['consents'][0]
    assert photos['key'] == 'photos_media' and photos['current'] is None and [m['key'] for m in me['mine']] == ['usage_analytics']
    assert parent.post(f'{V}/consent/', {'type': photos['type_id'], 'student': str(pv['ben'].pk), 'granted': True}, format='json').status_code == 403
    parent.post(f'{V}/consent/', {'type': photos['type_id'], 'student': str(pv['amy'].pk), 'granted': True}, format='json')
    parent.post(f'{V}/consent/', {'type': photos['type_id'], 'student': str(pv['amy'].pk), 'granted': False}, format='json')
    item = parent.get(f'{V}/me/').json()['children'][0]['consents'][0]
    assert item['current']['granted'] is False and [h['granted'] for h in item['history']] == [False, True]
    # Teachers see the photo flag; parents can't use that address.
    ids = f'{pv["amy"].pk},{pv["ben"].pk}'
    flags = pv['teacher'].get(f'{V}/photo-consent/?ids={ids}').json()['photo_consent']
    assert flags == {str(pv['amy'].pk): False, str(pv['ben'].pk): None}
    assert parent.get(f'{V}/photo-consent/?ids={ids}').status_code == 403
    report = office.get(f'{V}/consent-report/').json()
    assert report['summary'] == {'yes': 0, 'no': 1, 'not_answered': 1}
    assert 'Amy Pupil' in office.get(f'{V}/consent-report/?export=csv').content.decode('utf-8-sig')
    # Changing the wording asks again: older answers are flagged.
    types = office.get(f'{V}/consent-types/').json()['types']
    t = next(x for x in types if x['key'] == 'photos_media')
    office.post(f'{V}/consent-types/', {'id': t['id'], 'label': t['label'], 'description': t['description'] + ' Also the yearbook.'}, format='json')
    row = next(r for r in office.get(f'{V}/consent-report/').json()['rows'] if r['name'] == 'Amy Pupil')
    assert row['outdated']
    new = office.post(f'{V}/consent-types/', {'label': 'School trips', 'description': 'My child may go on local school trips.'}, format='json').json()
    assert any(x['key'] == 'school-trips' for x in new['types'])
    assert pv['teacher'].get(f'{V}/consent-report/').status_code == 403


@pytest.mark.django_db
def test_privacy_requests(pv):
    parent, office = pv['parent'], pv['office']
    assert parent.post(f'{V}/requests/new/', {'kind': 'hack', 'details': 'x'}, format='json').status_code == 400
    assert parent.post(f'{V}/requests/new/', {'kind': 'correction', 'details': 'Wrong', 'student': str(pv['ben'].pk)},
                       format='json').status_code == 403
    r = parent.post(f'{V}/requests/new/', {'kind': 'correction', 'details': 'Amy\'s date of birth is wrong', 'student': str(pv['amy'].pk)},
                    format='json').json()
    assert 'will reply by' in r['message']
    req = PrivacyRequest.objects.get()
    assert req.due_date == timezone.localdate() + timedelta(days=30)
    listed = office.get(f'{V}/requests/').json()['results']
    assert listed[0]['student'] == 'Amy Pupil' and not listed[0]['overdue']
    assert office.post(f'{V}/requests/{req.pk}/', {'status': 'refused'}, format='json').status_code == 400
    office.post(f'{V}/requests/{req.pk}/', {'status': 'done', 'response': 'Corrected to 12 April 2019.'}, format='json')
    mine = parent.get(f'{V}/me/').json()['requests'][0]
    assert mine['status'] == 'done' and mine['response'].startswith('Corrected')
    PrivacyRequest.objects.filter(pk=req.pk).update(status='open', due_date=timezone.localdate() - timedelta(days=1))
    assert office.get(f'{V}/requests/').json()['results'][0]['overdue']


@pytest.mark.django_db
def test_incidents(pv):
    r = pv['office'].post(f'{V}/incidents/report/', {'title': 'Lost laptop', 'description': 'A staff laptop with exports was lost.'}, format='json')
    assert r.status_code == 201 and r.json()['reference'].startswith('INC-')
    owner = pv['owner']
    listed = owner.get(f'{V}/platform/incidents/').json()
    assert listed['incidents'][0]['schools'] == ['Hillside School'] and listed['incidents'][0]['status'] == 'reported'
    assert pv['office'].get(f'{V}/platform/incidents/').status_code == 403
    inc = Incident.objects.get()
    detail = owner.post(f'{V}/platform/incidents/{inc.pk}/', {'action': 'update', 'status': 'investigating', 'severity': 'high',
                                                               'data_affected': 'Names and classes', 'people_affected': '120'}, format='json').json()['incident']
    assert detail['status'] == 'investigating' and any('Status: Reported' in u['note'] for u in detail['updates'])
    step = owner.post(f'{V}/platform/incidents/{inc.pk}/', {'action': 'step', 'step': 'contain'}, format='json').json()['incident']
    assert step['checklist'][0]['done_at']
    owner.post(f'{V}/platform/incidents/{inc.pk}/', {'action': 'notify_schools', 'message': 'We are investigating a lost laptop.'}, format='json')
    assert len(mail.outbox) == 1 and 'office@hillside.test' in mail.outbox[0].to and inc.reference in mail.outbox[0].subject
    Incident.objects.filter(pk=inc.pk).update(discovered_at=timezone.now() - timedelta(hours=73))
    assert owner.get(f'{V}/platform/incidents/').json()['incidents'][0]['regulator_overdue']
    owner.post(f'{V}/platform/incidents/{inc.pk}/', {'action': 'update', 'regulator_notified_at': 'now'}, format='json')
    assert not owner.get(f'{V}/platform/incidents/').json()['incidents'][0]['regulator_overdue']
    new = owner.post(f'{V}/platform/incidents/', {'title': 'Test', 'description': 'Suspicious sign-ins seen'}, format='json').json()['incident']
    assert new['status'] == 'investigating' and new['reference'].endswith('002')


@pytest.mark.django_db
def test_export_and_deletion_cover_consent(pv):
    from services.core.portability import data

    parent = pv['parent']
    t = parent.get(f'{V}/me/').json()['children'][0]['consents'][0]
    parent.post(f'{V}/consent/', {'type': t['type_id'], 'student': str(pv['amy'].pk), 'granted': True}, format='json')
    tables, _people, _files = data.collect(pv['s'])
    assert 'core_privacy.ConsentRecord' in tables and 'core_privacy.ConsentType' in tables
    from services.core.portability.models import SchoolDeletion

    d = SchoolDeletion.objects.create(school=pv['s'], school_name='Hillside School', school_code='HSS', scheduled_for=timezone.now())
    data.purge(pv['s'], d, by='test')
    assert not ConsentRecord.objects.filter(school=pv['s']).exists()
