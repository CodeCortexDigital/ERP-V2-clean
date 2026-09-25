"""Transport: vehicles and crew, routes and stops, riders and capacity, trips and family notices, billing (Phase 14)."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.core.user_notifications.models import Notification
from services.education.academics.models import SchoolClass
from services.education.attendance.models import AttendanceRecord
from services.education.finance.models import Invoice
from services.education.students.models import Guardian, Household, StudentGuardian
from services.education.transport.models import Rider, Trip
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/transport'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def tr(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='')
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
        home = Household.objects.create(tenant=s, name='Ali family')
    sara = StudentFactory(tenant=s, current_class=c6, full_name='Sara Ali', household=home, **kw)
    omar = StudentFactory(tenant=s, current_class=c6, full_name='Omar Ali', household=home, **kw)
    zed = StudentFactory(tenant=s, current_class=c6, full_name='Zed Khan', **kw)
    parent = UserFactory(email='ali.parent@example.com', full_name='Mr Ali')
    ParentProfile.objects.create(user=parent).linked_students.add(sara, omar)
    with use_tenant(s):
        dad = Guardian.objects.create(tenant=s, household=home, first_name='Imran', last_name='Ali', relationship='father', mobile_phone='0300-1')
        uncle = Guardian.objects.create(tenant=s, household=home, first_name='Asif', last_name='Ali', relationship='aunt_uncle')
        StudentGuardian.objects.create(tenant=s, student=sara, guardian=dad, can_pickup=True)
        StudentGuardian.objects.create(tenant=s, student=sara, guardian=uncle, can_pickup=False, is_emergency_contact=False)
    attendant_user = UserFactory(email='bus.aunty@hillside.test', full_name='Nasreen')
    office = _client(admin)
    bus = office.post(f'{URL}/vehicles/', {'name': 'Bus 3', 'registration_no': 'LEA-1234', 'capacity': 2,
                                           'insurance_expiry': (timezone.localdate() + timedelta(days=10)).isoformat()}, format='json').json()
    driver = office.post(f'{URL}/staff/', {'role': 'driver', 'name': 'Rashid', 'phone': '0301-2222222', 'licence_no': 'DL-9'}, format='json').json()
    att = office.post(f'{URL}/staff/', {'role': 'attendant', 'name': 'Nasreen', 'phone': '0302-3', 'user_email': 'bus.aunty@hillside.test'}, format='json').json()
    route = office.post(f'{URL}/routes/', {'name': 'Route 3 – Gulberg', 'code': 'R3', 'monthly_fee': '4000', 'vehicle_id': bus['id'],
                                           'driver_id': driver['id'], 'attendant_id': att['id']}, format='json').json()
    stops = office.put(f"{URL}/routes/{route['id']}/stops/", {'stops': [
        {'name': 'Main Market', 'morning_time': '07:10', 'afternoon_time': '14:20'},
        {'name': 'Liberty Chowk', 'morning_time': '07:25', 'afternoon_time': '14:05'},
    ]}, format='json').json()
    return dict(s=s, admin=admin, office=office, sara=sara, omar=omar, zed=zed, parent=parent, attendant_user=attendant_user,
                bus=bus, route=route, stops=stops)


def _ride(d, student, stop=0, **extra):
    return d['office'].post(f'{URL}/riders/', {'student_id': str(student.id), 'route_id': d['route']['id'],
                                               'pickup_stop_id': d['stops'][stop]['id'], **extra}, format='json')


@pytest.mark.django_db
def test_setup_riders_and_capacity(tr):
    d = tr
    assert d['bus']['expiring'] == ['Insurance']
    assert [s['name'] for s in d['stops']] == ['Main Market', 'Liberty Chowk'] and d['stops'][0]['morning_time'] == '07:10'
    r = _ride(d, d['sara'])
    assert r.status_code == 201 and r.json()['dropoff_stop']['name'] == 'Main Market' and r.json()['monthly_fee'] == 4000.0
    assert _ride(d, d['omar'], 1, monthly_fee='3000').json()['own_fee']
    full = _ride(d, d['zed'])
    assert full.status_code == 400 and 'full' in full.json()['error']
    # Moving Sara to the other stop replaces her place (it doesn't count twice).
    moved = _ride(d, d['sara'], 1)
    assert moved.status_code == 201 and Rider.objects.filter(student=d['sara']).count() == 1
    # A stop in use can't be removed; renaming keeps riders.
    s0, s1 = d['stops']
    bad = d['office'].put(f"{URL}/routes/{d['route']['id']}/stops/", {'stops': [s0]}, format='json')
    assert bad.status_code == 400 and 'Liberty Chowk' in bad.json()['error']
    ok = d['office'].put(f"{URL}/routes/{d['route']['id']}/stops/", {'stops': [{**s1, 'name': 'Liberty Roundabout'}, s0]}, format='json').json()
    assert [s['name'] for s in ok] == ['Liberty Roundabout', 'Main Market']
    detail = d['office'].get(f"{URL}/routes/{d['route']['id']}/").json()
    assert detail['riders'] == 2 and detail['seats_left'] == 0
    assert {x['pickup_stop']['name'] for x in detail['rider_list']} == {'Liberty Roundabout'}
    # Only the office sets things up; the attendant sees only their own route.
    assert _client(d['parent']).post(f'{URL}/vehicles/', {'name': 'x', 'registration_no': 'y'}, format='json').status_code == 403
    assert [r['name'] for r in _client(d['attendant_user']).get(f'{URL}/routes/').json()] == ['Route 3 – Gulberg']
    assert _client(d['parent']).get(f'{URL}/routes/').json() == []
    assert d['office'].delete(f"{URL}/vehicles/{d['bus']['id']}/").status_code == 400  # on a route


@pytest.mark.django_db
def test_trip_day_manifest_and_family_notices(tr):
    d = tr
    _ride(d, d['sara'])
    _ride(d, d['omar'], 1)
    crew = _client(d['attendant_user'])
    rid = d['route']['id']
    with use_tenant(d['s']):
        AttendanceRecord.objects.create(tenant=d['s'], student=d['omar'], date=timezone.localdate(), status='absent')
    m = crew.get(f'{URL}/routes/{rid}/manifest/', {'kind': 'afternoon'}).json()
    rows = {r['student']['full_name']: r for r in m['students']}
    assert list(rows) == ['Sara Ali', 'Omar Ali']  # stop order
    assert rows['Sara Ali']['may_collect'][0]['name'] == 'Imran Ali' and rows['Sara Ali']['may_not_collect'] == ['Asif Ali']
    assert rows['Omar Ali']['absent'] == 'Marked absent'
    # Start the morning trip: the family of riders who are in today is told.
    start = crew.post(f'{URL}/routes/{rid}/trip/', {'kind': 'morning', 'action': 'start'}, format='json').json()
    assert start['status'] == 'en_route'
    notice = Notification.objects.get(recipient=d['parent'], title='School transport on the way')  # one notice
    print('TOLD', start['people_told'], list(Notification.objects.filter(title='School transport on the way').values_list('recipient__email', flat=True)))
    assert notice.message.endswith('(Sara)')
    # Everyone in Sara's family with a login (her parent, the factory's guardian account, Sara) is told once each.
    assert start['people_told'] == Notification.objects.filter(title='School transport on the way').count() == 3
    assert crew.post(f'{URL}/routes/{rid}/trip/', {'kind': 'morning', 'action': 'start'}, format='json').status_code == 400
    crew.post(f'{URL}/routes/{rid}/trip/', {'kind': 'morning', 'action': 'delay', 'minutes': 15, 'note': 'Traffic'}, format='json')
    assert Notification.objects.filter(recipient=d['parent'], title='School transport delayed', message__contains='15 minutes').exists()
    trip = Trip.objects.get(route_id=rid, kind='morning')
    on = crew.post(f'{URL}/trips/{trip.id}/event/', {'student_id': str(d['sara'].id), 'event': 'boarded'}, format='json')
    assert on.status_code == 201
    assert Notification.objects.filter(recipient=d['parent'], title='Sara Ali got on the bus', message__contains='Main Market').exists()
    assert crew.post(f'{URL}/trips/{trip.id}/event/', {'student_id': str(d['sara'].id), 'event': 'boarded'}, format='json').json()['created'] is False
    crew.post(f'{URL}/trips/{trip.id}/event/', {'student_id': str(d['sara'].id), 'event': 'dropped'}, format='json')
    assert Notification.objects.filter(recipient=d['parent'], title='Sara Ali arrived at school').exists()
    assert crew.post(f'{URL}/trips/{trip.id}/event/', {'student_id': str(d['zed'].id), 'event': 'boarded'}, format='json').status_code == 404
    board = d['office'].get(f'{URL}/today/').json()['routes'][0]['trips']
    assert board[0]['boarded'] == 1 and board[0]['dropped'] == 1 and board[0]['absent'] == 1 and board[0]['delay_minutes'] == 15
    assert crew.post(f'{URL}/routes/{rid}/trip/', {'kind': 'morning', 'action': 'complete'}, format='json').json()['status'] == 'completed'
    # Families see their children's transport and today's events; nobody else can run the trip.
    mine = {c['student']['full_name']: c for c in _client(d['parent']).get(f'{URL}/mine/').json()['children']}
    assert mine['Sara Ali']['route']['name'] == 'Route 3 – Gulberg' and mine['Sara Ali']['driver']['phone'] == '0301-2222222'
    assert mine['Sara Ali']['trips'][0]['events'] == {'boarded': mine['Sara Ali']['trips'][0]['events']['boarded'],
                                                      'dropped': mine['Sara Ali']['trips'][0]['events']['dropped']}
    assert mine['Omar Ali']['absent_today'] == 'Marked absent'
    stranger = UserFactory(email='nobody@example.com')
    assert _client(stranger).post(f'{URL}/routes/{rid}/trip/', {'kind': 'afternoon', 'action': 'start'}, format='json').status_code == 404  # not their school
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=d['s'], role='teacher', is_primary=True)
    assert _client(teacher).post(f'{URL}/routes/{rid}/trip/', {'kind': 'afternoon', 'action': 'start'}, format='json').status_code == 403
    assert _client(d['parent']).get(f'{URL}/routes/{rid}/manifest/').status_code == 404


@pytest.mark.django_db
def test_monthly_transport_invoices_and_report(tr):
    d = tr
    today = timezone.localdate()
    _ride(d, d['sara'], start_date=(today - timedelta(days=40)).isoformat())
    _ride(d, d['omar'], 1, monthly_fee='3000')
    month = today.strftime('%Y-%m')
    r = d['office'].post(f'{URL}/invoices/', {'month': month}, format='json').json()
    assert r['created'] == 2
    amounts = sorted(Invoice.objects.filter(invoice_type='transport').values_list('amount', flat=True))
    assert amounts == [Decimal('3000.00'), Decimal('4000.00')]
    assert d['office'].post(f'{URL}/invoices/', {'month': month}, format='json').json() == {
        'created': 0, 'already_billed': 2, 'no_fee': 0, 'month': month}
    assert _client(d['parent']).post(f'{URL}/invoices/', {'month': month}, format='json').status_code == 403
    rep = d['office'].get(f'{URL}/report/').json()
    assert rep['riders'] == 2 and rep['monthly_fees'] == 7000.0 and rep['routes'][0]['full_percent'] == 100
    assert rep['expiring'] == [{'what': 'Bus 3 (LEA-1234)', 'items': ['Insurance']}]
