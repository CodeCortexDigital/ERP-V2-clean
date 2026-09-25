"""Parent portal: the family page, contact update requests the office approves, and the family's applications (Phase 11)."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.core.user_notifications.models import Notification
from services.education.academics.models import SchoolClass
from services.education.admissions.models import (
    Applicant, Application, ApplicationEvent, ReEnrollmentCampaign, ReEnrollmentResponse,
)
from services.education.attendance.models import AttendanceRecord
from services.education.finance.models import Invoice
from services.education.students.models import ContactChangeRequest, Guardian, Household, StudentGuardian
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/portal'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def fam(db):
    today = timezone.localdate()
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        c8 = SchoolClass.objects.create(tenant=s, name='Grade 8', code='G8', grade_level=8)
        home = Household.objects.create(tenant=s, name='Ali family', address='1 Mall Road', city='Lahore', phone='042-111')
        other_home = Household.objects.create(tenant=s, name='Other family', address='9 Canal View')
    kw = dict(father_name='', mother_name='', guardian_name='')
    sara = StudentFactory(tenant=s, current_class=c6, full_name='Sara Ali', household=home, **kw)
    omar = StudentFactory(tenant=s, current_class=c8, full_name='Omar Ali', household=home, **kw)
    stranger = StudentFactory(tenant=s, current_class=c8, full_name='Someone Else', household=other_home, **kw)
    parent = UserFactory(email='ali.parent@example.com', full_name='Imran Ali')
    ParentProfile.objects.create(user=parent).linked_students.add(sara, omar)
    with use_tenant(s):
        dad = Guardian.objects.create(tenant=s, household=home, first_name='Imran', last_name='Ali', relationship='father',
                                      email='ali.parent@example.com', mobile_phone='0300-1111111')
        mum = Guardian.objects.create(tenant=s, household=home, first_name='Hina', last_name='Ali', relationship='mother')
        for st in (sara, omar):
            StudentGuardian.objects.create(tenant=s, student=st, guardian=dad, is_primary=True, receives_billing=True)
        StudentGuardian.objects.create(tenant=s, student=sara, guardian=mum, can_pickup=False)
        outsider = Guardian.objects.create(tenant=s, household=other_home, first_name='Not', last_name='Mine')
        for n in range(10):
            AttendanceRecord.objects.create(tenant=s, student=sara, date=today - timedelta(days=n + 1),
                                            status='absent' if n < 2 else 'present')
        Invoice.objects.create(student=sara, amount=Decimal('3000'), due_date=today - timedelta(days=3), status='issued')
        Invoice.objects.create(student=omar, amount=Decimal('2000'), due_date=today + timedelta(days=10), status='issued')
    return dict(s=s, admin=admin, parent=parent, sara=sara, omar=omar, stranger=stranger, home=home,
                other_home=other_home, dad=dad, mum=mum, outsider=outsider, today=today)


@pytest.mark.django_db
def test_family_page_shows_every_child_and_the_household(fam):
    d = fam
    r = _client(d['parent']).get(f'{URL}/family/').json()
    kids = {c['full_name']: c for c in r['children']}
    assert set(kids) == {'Sara Ali', 'Omar Ali'}
    assert kids['Sara Ali']['attendance_rate'] == 80.0 and kids['Sara Ali']['absences'] == 2
    assert kids['Sara Ali']['balance'] == 3000.0 and kids['Sara Ali']['overdue_fees'] == 3000.0
    assert 'Fees overdue' in kids['Sara Ali']['alerts'] and kids['Omar Ali']['alerts'] == []
    assert r['totals']['balance'] == 5000.0 and r['totals']['overdue_fees'] == 3000.0
    [h] = r['households']
    assert h['name'] == 'Ali family' and h['city'] == 'Lahore' and sorted(h['children']) == ['Omar Ali', 'Sara Ali']
    g = {x['name']: x for x in h['guardians']}
    assert g['Imran Ali']['is_me'] and not g['Hina Ali']['is_me']
    assert {c['name'] for c in g['Imran Ali']['children']} == {'Sara Ali', 'Omar Ali'}
    assert g['Hina Ali']['children'] == [{'name': 'Sara Ali', 'primary': False, 'pickup': False, 'emergency': True, 'billing': False}]
    assert 'Someone Else' not in str(r) and 'Not Mine' not in str(r)
    # Staff don't have a family page.
    assert _client(d['admin']).get(f'{URL}/family/').json()['children'] == []


@pytest.mark.django_db
def test_contact_changes_go_to_the_office_for_approval(fam):
    d = fam
    par, office = _client(d['parent']), _client(d['admin'])
    r = par.post(f'{URL}/family/changes/', {'household_id': str(d['home'].id), 'note': 'We moved',
                                            'changes': {'address': '22 Gulberg', 'city': 'Lahore', 'notes': 'hack'}},
                 format='json')
    assert r.status_code == 201
    assert r.json()['changes'] == {'address': {'from': '1 Mall Road', 'to': '22 Gulberg'}}  # unchanged + unknown fields dropped
    assert r.json()['status'] == 'pending'
    d['home'].refresh_from_db()
    assert d['home'].address == '1 Mall Road'  # nothing changes until the office approves
    assert Notification.objects.filter(recipient=d['admin'], title='Family details update').exists()
    # Guardian phone, then the refusals.
    g = par.post(f'{URL}/family/changes/', {'guardian_id': str(d['mum'].id), 'changes': {'mobile_phone': '0321-2222222'}}, format='json')
    assert g.status_code == 201
    assert par.post(f'{URL}/family/changes/', {'guardian_id': str(d['outsider'].id), 'changes': {'mobile_phone': '1'}},
                    format='json').status_code == 404
    assert par.post(f'{URL}/family/changes/', {'household_id': str(d['other_home'].id), 'changes': {'city': 'x'}},
                    format='json').status_code == 404
    assert par.post(f'{URL}/family/changes/', {'household_id': str(d['home'].id), 'changes': {'address': '1 Mall Road'}},
                    format='json').status_code == 400
    assert par.post(f'{URL}/family/changes/', {'guardian_id': str(d['dad'].id), 'changes': {'email': 'not-an-email'}},
                    format='json').status_code == 400
    assert office.post(f'{URL}/family/changes/', {'household_id': str(d['home'].id), 'changes': {'city': 'x'}},
                       format='json').status_code == 403
    # Only the office reviews.
    assert par.get(f'{URL}/family-updates/').status_code == 403
    assert par.post(f'{URL}/family-updates/{r.json()["id"]}/review/', {'approve': True}, format='json').status_code == 403
    listing = office.get(f'{URL}/family-updates/', {'status': 'pending'}).json()
    assert listing['pending'] == 2 and len(listing['results']) == 2
    ok = office.post(f'{URL}/family-updates/{r.json()["id"]}/review/', {'approve': True}, format='json').json()
    assert ok['status'] == 'approved'
    d['home'].refresh_from_db()
    assert d['home'].address == '22 Gulberg'
    assert Notification.objects.filter(recipient=d['parent'], message__contains='were updated').exists()
    no = office.post(f'{URL}/family-updates/{g.json()["id"]}/review/', {'approve': False, 'note': 'Please call us.'}, format='json').json()
    assert no['status'] == 'declined' and no['review_note'] == 'Please call us.'
    d['mum'].refresh_from_db()
    assert d['mum'].mobile_phone == ''
    assert office.post(f'{URL}/family-updates/{g.json()["id"]}/review/', {'approve': True}, format='json').status_code == 400
    # The parent sees what happened to their requests.
    mine = {x['id']: x['status'] for x in par.get(f'{URL}/family/').json()['requests']}
    assert mine == {r.json()['id']: 'approved', g.json()['id']: 'declined'}
    assert ContactChangeRequest.objects.count() == 2


@pytest.mark.django_db
def test_family_applications_and_reenrolment(fam):
    d = fam
    s = d['s']
    s.settings_json = {'admissions': {'online_open': True}}
    s.save()
    with use_tenant(s):
        sib = Applicant.objects.create(tenant=s, full_name='Zara Ali', email='ali.parent@example.com', gender='F',
                                       applying_for_class='Grade 1')
        app = Application.objects.create(applicant=sib, status='reviewing', academic_year='2027-2028')
        ApplicationEvent.objects.create(application=app, from_status='pending', to_status='reviewing')
        ApplicationEvent.objects.create(application=app, from_status='reviewing', to_status='reviewing', note='Internal: nice family')
        by_guardian = Applicant.objects.create(tenant=s, full_name='Bilal Ali', email='grandma@example.com', gender='M',
                                               applying_for_class='Grade 3',
                                               guardians=[{'name': 'Imran Ali', 'email': 'ALI.PARENT@example.com'}])
        Application.objects.create(applicant=by_guardian, status='rejected', status_notes='No places in Grade 3.')
        other = Applicant.objects.create(tenant=s, full_name='Other Child', email='someone@example.com', gender='M',
                                         applying_for_class='Grade 2')
        Application.objects.create(applicant=other)
        camp = ReEnrollmentCampaign.objects.create(tenant=s, title='Returning for 2027-28?', academic_year='2027-2028')
        ReEnrollmentResponse.objects.create(campaign=camp, student=d['sara'], intent='returning')
        ReEnrollmentResponse.objects.create(campaign=camp, student=d['stranger'])
    r = _client(d['parent']).get(f'{URL}/family/applications/').json()
    apps = {a['student']: a for a in r['applications']}
    assert set(apps) == {'Zara Ali', 'Bilal Ali'}
    assert apps['Zara Ali']['status_label'] == 'Under Review' and apps['Zara Ali']['decision_note'] == ''
    assert [x['status'] for x in apps['Zara Ali']['steps']] == ['reviewing'] and 'Internal' not in str(r)
    assert apps['Bilal Ali']['decision_note'] == 'No places in Grade 3.'
    assert [x['student'] for x in r['reenrollment']] == ['Sara Ali'] and r['reenrollment'][0]['intent'] == 'returning'
    assert r['apply_url'] == f'/apply/{s.subdomain}'
    s.settings_json = {'admissions': {'online_open': False}}
    s.save()
    assert _client(d['parent']).get(f'{URL}/family/applications/').json()['apply_url'] is None
