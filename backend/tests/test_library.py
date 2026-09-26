"""Library: catalogue and copies, members, issue / return / renew, fines, reservations and holds, reminders (Phase 13)."""
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
from services.education.library.api import send_reminders
from services.education.library.models import BookCopy, Loan, Member, Reservation
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/library'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def lib(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='')
    with use_tenant(s):
        c6 = SchoolClass.objects.create(tenant=s, name='Grade 6', code='G6', grade_level=6)
    sara = StudentFactory(tenant=s, current_class=c6, full_name='Sara Ali', email='sara@hillside.test', **kw)
    omar = StudentFactory(tenant=s, current_class=c6, full_name='Omar Ali', **kw)
    from django.contrib.auth import get_user_model
    sara_user = get_user_model().objects.filter(email='sara@hillside.test').first() or UserFactory(email='sara@hillside.test')
    parent = UserFactory(email='ali.parent@example.com', full_name='Mr Ali')
    ParentProfile.objects.create(user=parent).linked_students.add(sara, omar)
    office = _client(admin)
    book = office.post(f'{URL}/books/', {'title': 'The Secret Garden', 'authors': 'F. H. Burnett', 'isbn': '978-0-14-143951-8',
                                         'subject': 'Fiction', 'call_number': 'F BUR', 'copies': 2, 'location': 'Shelf A'},
                       format='json').json()
    return dict(s=s, admin=admin, office=office, sara=sara, omar=omar, sara_user=sara_user, parent=parent, book=book)


def _card(d, student):
    return d['office'].post(f'{URL}/members/', {'kind': 'student', 'ref_id': str(student.id)}, format='json').json()


@pytest.mark.django_db
def test_catalogue_copies_and_search(lib):
    d = lib
    b = d['book']
    assert b['copies'] == 2 and b['available'] == 2 and b['isbn'] == '9780141439518'
    detail = d['office'].get(f"{URL}/books/{b['id']}/").json()
    assert [c['barcode'] for c in detail['copy_list']] == ['LIB-000001', 'LIB-000002']
    assert detail['copy_list'][0]['location'] == 'Shelf A'
    more = d['office'].post(f"{URL}/books/{b['id']}/copies/", {'count': 1, 'price': '850'}, format='json').json()
    assert more['barcodes'] == ['LIB-000003']
    fam = _client(d['parent'])
    # Everyone can search; only the office manages.
    for q in ('secret', 'burnett', '9780141439518', 'LIB-000002', 'F BUR'):
        assert [x['title'] for x in fam.get(f'{URL}/books/', {'q': q}).json()['results']] == ['The Secret Garden'], q
    assert 'copy_list' not in fam.get(f"{URL}/books/{b['id']}/").json()
    assert fam.post(f'{URL}/books/', {'title': 'x'}, format='json').status_code == 403
    assert d['office'].post(f'{URL}/books/', {'title': ''}, format='json').status_code == 400
    labels = d['office'].get(f'{URL}/labels/', {'book': b['id']}).json()
    assert [l['code'] for l in labels['labels']] == ['LIB-000001', 'LIB-000002', 'LIB-000003']
    assert labels['qr'] and labels['labels'][0]['qr'].startswith('<svg')
    # Another school sees none of it.
    other = SchoolFactory(name='Other School')
    boss = UserFactory(email='boss@other.test')
    TenantMembership.objects.create(user=boss, school=other, role='admin', is_primary=True)
    assert _client(boss).get(f'{URL}/books/').json()['results'] == []


@pytest.mark.django_db
def test_issue_return_renew_and_fines(lib):
    d = lib
    office = d['office']
    office.patch(f'{URL}/settings/', {'max_loans_student': 1, 'fine_per_day': '10', 'max_renewals': 1}, format='json')
    card = _card(d, d['sara'])
    assert card['card_number'] == 'C-000001'
    # Lookup by card or student number.
    assert office.get(f'{URL}/members/', {'q': 'C-000001'}).json()['exact']
    assert office.get(f'{URL}/members/', {'q': d['sara'].student_id}).json()['results'][0]['id'] == card['id']
    r = office.post(f'{URL}/issue/', {'barcode': 'lib-000001', 'member_id': card['id']}, format='json')
    assert r.status_code == 201
    loan = r.json()['loan']
    assert loan['due_date'] == (timezone.localdate() + timedelta(days=14)).isoformat()
    assert office.post(f'{URL}/issue/', {'barcode': 'LIB-000001', 'member_id': card['id']}, format='json').json()['error'].startswith('This copy is already on loan')
    assert 'limit is 1' in office.post(f'{URL}/issue/', {'barcode': 'LIB-000002', 'member_id': card['id']}, format='json').json()['error']
    assert office.post(f'{URL}/issue/', {'barcode': 'NOPE', 'member_id': card['id']}, format='json').status_code == 404
    # Renew once; the student can do it herself.
    me = _client(d['sara_user'])
    ren = me.post(f"{URL}/loans/{loan['id']}/renew/")
    assert ren.status_code == 200 and ren.json()['renewals'] == 1
    assert 'most allowed' in me.post(f"{URL}/loans/{loan['id']}/renew/").json()['error']
    assert _client(d['parent']).post(f"{URL}/loans/{loan['id']}/renew/").status_code == 400  # her parent may, but the limit applies
    # Make it 3 days overdue: no new loans, then return with a fine.
    Loan.objects.filter(pk=loan['id']).update(due_date=timezone.localdate() - timedelta(days=3))
    office.patch(f'{URL}/settings/', {'max_loans_student': 3}, format='json')
    assert 'overdue' in office.post(f'{URL}/issue/', {'barcode': 'LIB-000002', 'member_id': card['id']}, format='json').json()['error']
    back = office.post(f'{URL}/return/', {'barcode': 'LIB-000001', 'condition': 'fair'}, format='json').json()
    assert back['days_late'] == 3 and back['fine'] == 30.0 and back['loan']['fine_status'] == 'due'
    assert BookCopy.objects.get(barcode='LIB-000001').status == 'available'
    assert office.get(f'{URL}/loans/', {'status': 'fines'}).json()['counts']['fines'] == 1
    assert office.post(f"{URL}/loans/{loan['id']}/fine/", {'status': 'waived'}, format='json').json()['fine_status'] == 'waived'
    # Lost: the copy's price becomes the fine.
    BookCopy.objects.filter(barcode='LIB-000002').update(price=Decimal('500'))
    l2 = office.post(f'{URL}/issue/', {'barcode': 'LIB-000002', 'member_id': card['id']}, format='json').json()['loan']
    lost = office.post(f"{URL}/loans/{l2['id']}/lost/").json()
    assert lost['fine_amount'] == 500.0 and BookCopy.objects.get(barcode='LIB-000002').status == 'lost'
    # Blocked members can't borrow; families can't use the desk.
    office.patch(f"{URL}/members/{card['id']}/", {'is_blocked': True, 'blocked_reason': 'Unpaid fine'}, format='json')
    assert 'Unpaid fine' in office.post(f'{URL}/issue/', {'barcode': 'LIB-000001', 'member_id': card['id']}, format='json').json()['error']
    assert _client(d['parent']).post(f'{URL}/issue/', {'barcode': 'LIB-000001', 'member_id': card['id']}, format='json').status_code == 403
    rep = office.get(f'{URL}/report/').json()
    assert rep['titles'] == 1 and rep['loans_90_days'] == 2 and rep['fines_due'] == 500.0
    assert rep['top_books'][0]['title'] == 'The Secret Garden'


@pytest.mark.django_db
def test_reservations_holds_and_portal(lib):
    d = lib
    office, fam = d['office'], _client(d['parent'])
    omar_card = _card(d, d['omar'])
    for code in ('LIB-000001', 'LIB-000002'):
        office.post(f'{URL}/issue/', {'barcode': code, 'member_id': omar_card['id']}, format='json')
    # The parent reserves for Sara (both copies are out); a stranger's child is refused.
    r = fam.post(f'{URL}/reservations/', {'book_id': d['book']['id'], 'student_id': str(d['sara'].id)}, format='json')
    assert r.status_code == 201 and r.json()['status'] == 'waiting' and r.json()['position'] == 1
    assert fam.post(f'{URL}/reservations/', {'book_id': d['book']['id'], 'student_id': str(d['sara'].id)}, format='json').status_code == 400
    stranger = StudentFactory(tenant=d['s'], full_name='Not Mine', father_name='', mother_name='', guardian_name='')
    assert fam.post(f'{URL}/reservations/', {'book_id': d['book']['id'], 'student_id': str(stranger.id)}, format='json').status_code == 403
    # Omar returns a copy → it is held for Sara, and the family is told.
    back = office.post(f'{URL}/return/', {'barcode': 'LIB-000001'}, format='json').json()
    assert back['hold_for']['name'] == 'Sara Ali'
    assert BookCopy.objects.get(barcode='LIB-000001').status == 'on_hold'
    assert Notification.objects.filter(recipient=d['parent'], title='Library book ready').exists()
    # Nobody else can take the held copy; Sara can.
    third = _card(d, StudentFactory(tenant=d['s'], full_name='Third Kid', father_name='', mother_name='', guardian_name=''))
    assert 'held for Sara Ali' in office.post(f'{URL}/issue/', {'barcode': 'LIB-000001', 'member_id': third['id']}, format='json').json()['error']
    # The portal shows both children's cards.
    mine = fam.get(f'{URL}/mine/').json()
    cards = {m['name']: m for m in mine['members']}
    assert set(cards) == {'Sara Ali', 'Omar Ali'} and cards['Sara Ali']['reservations'][0]['status'] == 'ready'
    assert len(cards['Omar Ali']['current']) == 1
    sara_card = Member.objects.get(student=d['sara'])
    assert office.post(f'{URL}/issue/', {'barcode': 'LIB-000001', 'member_id': str(sara_card.id)}, format='json').status_code == 201
    assert Reservation.objects.get(pk=r.json()['id']).status == 'collected'
    # A hold nobody collects is released after the hold days.
    r2 = fam.post(f'{URL}/reservations/', {'book_id': d['book']['id'], 'student_id': str(d['omar'].id)}, format='json')
    assert r2.status_code == 400  # Omar already has a copy
    r3 = office.post(f'{URL}/reservations/', {'book_id': d['book']['id'], 'member_id': third['id']}, format='json').json()
    office.post(f'{URL}/return/', {'barcode': 'LIB-000002'}, format='json')
    assert Reservation.objects.get(pk=r3['id']).status == 'ready'
    with use_tenant(d['s']):
        sent = send_reminders(timezone.localdate() + timedelta(days=5))
    assert sent['holds_expired'] == 1 and Reservation.objects.get(pk=r3['id']).status == 'expired'
    assert BookCopy.objects.get(barcode='LIB-000002').status == 'available'
    # The student herself sees her card and can cancel her own reservation only.
    me = _client(d['sara_user'])
    assert [m['name'] for m in me.get(f'{URL}/mine/').json()['members']] == ['Sara Ali']
    r4 = me.post(f'{URL}/reservations/', {'book_id': d['book']['id']}, format='json')
    assert r4.status_code == 400  # she already has it
    assert me.post(f"{URL}/reservations/{r3['id']}/cancel/").status_code == 403


@pytest.mark.django_db
def test_reminders_due_tomorrow_and_overdue(lib):
    d = lib
    card = _card(d, d['sara'])
    loan = d['office'].post(f'{URL}/issue/', {'barcode': 'LIB-000001', 'member_id': card['id']}, format='json').json()['loan']
    today = timezone.localdate()
    Loan.objects.filter(pk=loan['id']).update(due_date=today + timedelta(days=1))
    with use_tenant(d['s']):
        assert send_reminders(today)['due_tomorrow'] == 1
        assert send_reminders(today)['due_tomorrow'] == 0  # once a day
    assert Notification.objects.filter(recipient=d['parent'], title='Library book due tomorrow').exists()
    Loan.objects.filter(pk=loan['id']).update(due_date=today - timedelta(days=2), last_reminded_at=None)
    with use_tenant(d['s']):
        assert send_reminders(today)['overdue'] == 1
        assert send_reminders(today + timedelta(days=1))['overdue'] == 0  # every 3 days
        assert send_reminders(today + timedelta(days=3))['overdue'] == 1
    assert Notification.objects.filter(recipient=d['sara_user'], title='Library book overdue').exists()


@pytest.mark.django_db
def test_add_members_for_a_class_and_list_card_holders(lib):
    office = lib['office']
    from services.education.library.models import Member

    Member.all_objects.all().delete()
    assert office.get(f'{URL}/members/').json()['results'] == []  # nobody has a card yet
    c6 = lib['sara'].current_class_id
    r = office.post(f'{URL}/members/', {'group': 'class', 'class_id': str(c6)}, format='json').json()
    assert r['made'] == 2
    again = office.post(f'{URL}/members/', {'group': 'students'}, format='json').json()
    assert again['made'] == 0 and 'already' in again['message']
    names = {m['name'] for m in office.get(f'{URL}/members/').json()['results']}
    assert names == {'Sara Ali', 'Omar Ali'}
    assert office.get(f'{URL}/members/', {'show': 'loans'}).json()['results'] == []
    assert office.post(f'{URL}/members/', {'group': 'nobody'}, format='json').status_code == 400
