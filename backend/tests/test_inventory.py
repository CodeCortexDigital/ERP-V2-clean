"""Inventory: items and stock movements, average cost, low-stock alerts, sales billed to families, purchase orders (Phase 15)."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.models import TenantMembership
from services.core.user_notifications.models import Notification
from services.education.finance.models import Invoice
from services.education.inventory.models import Item, Movement
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/inventory'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def inv(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher', is_primary=True)
    office = _client(admin)
    cat = office.post(f'{URL}/categories/', {'name': 'Stationery'}, format='json').json()
    paper = office.post(f'{URL}/items/', {'name': 'A4 paper', 'unit': 'ream', 'category_id': cat['id'], 'reorder_level': '10',
                                          'reorder_quantity': '50', 'unit_cost': '1000', 'opening_quantity': '20'}, format='json').json()
    return dict(s=s, admin=admin, teacher=teacher, office=office, cat=cat, paper=paper)


def _move(d, item, **body):
    return d['office'].post(f"{URL}/items/{item['id']}/move/", body, format='json')


@pytest.mark.django_db
def test_items_movements_average_cost_and_low_stock(inv):
    d = inv
    p = d['paper']
    assert p['sku'] == 'ITM-0001' and p['quantity'] == 20 and p['value'] == 20000 and not p['low']
    # Receiving at a new price moves the average cost.
    r = _move(d, p, kind='received', quantity='20', unit_cost='1200', reference='Bill 55').json()
    assert r['item']['quantity'] == 40 and r['item']['unit_cost'] == 1100
    # Issuing needs to know to whom; you can't issue more than is there.
    assert 'who' in _move(d, p, kind='issued', quantity='5').json()['error']
    assert 'Only 40' in _move(d, p, kind='issued', quantity='41', issued_to='Science dept').json()['error']
    assert _move(d, p, kind='issued', quantity='25', issued_to='Science dept').status_code == 201
    assert not Notification.objects.filter(title='Low stock').exists()
    # Crossing the reorder level tells the office once.
    _move(d, p, kind='issued', quantity='6', issued_to='Grade 6')
    assert Notification.objects.filter(recipient=d['admin'], title='Low stock', message__contains='A4 paper is down to 9').count() == 1
    _move(d, p, kind='damaged', quantity='1', note='Water damage')
    assert Notification.objects.filter(title='Low stock').count() == 1
    low = d['office'].get(f'{URL}/items/', {'low': 1}).json()
    assert [x['name'] for x in low['results']] == ['A4 paper'] and low['low_count'] == 1
    detail = d['office'].get(f"{URL}/items/{p['id']}/").json()
    assert [m['kind'] for m in detail['movements']] == ['damaged', 'issued', 'issued', 'received', 'count_up']
    assert detail['movements'][0]['balance_after'] == 8
    # Back above the level resets the alert; a stock count down works too.
    _move(d, p, kind='received', quantity='10', unit_cost='1100')
    assert Item.objects.get(pk=p['id']).low_alert_sent is False
    assert _move(d, p, kind='count_down', quantity='2', note='Stock count').json()['item']['quantity'] == 16
    # Duplicate codes are refused; an item with history can't be deleted; others see nothing.
    assert d['office'].post(f'{URL}/items/', {'name': 'x', 'sku': 'itm-0001'}, format='json').status_code == 400
    assert d['office'].delete(f"{URL}/items/{p['id']}/").status_code == 400
    assert _client(d['teacher']).get(f'{URL}/items/').status_code == 403
    other = SchoolFactory(name='Other School')
    boss = UserFactory(email='boss@other.test')
    TenantMembership.objects.create(user=boss, school=other, role='admin', is_primary=True)
    assert _client(boss).get(f'{URL}/items/').json()['results'] == []
    csv = d['office'].get(f'{URL}/items/export/')
    assert csv.status_code == 200 and b'A4 paper' in csv.content


@pytest.mark.django_db
def test_selling_to_a_student_bills_the_family(inv):
    d = inv
    sara = StudentFactory(tenant=d['s'], full_name='Sara Ali', father_name='', mother_name='', guardian_name='')
    shirt = d['office'].post(f'{URL}/items/', {'name': 'Shirt size 10', 'unit': 'pcs', 'unit_cost': '900', 'opening_quantity': '5'}, format='json').json()
    assert 'no sale price' in _move(d, shirt, kind='sold', quantity='2', student_id=str(sara.id)).json()['error']
    d['office'].patch(f"{URL}/items/{shirt['id']}/", {'sale_price': '1500'}, format='json')
    r = _move(d, shirt, kind='sold', quantity='2', student_id=str(sara.id)).json()
    assert r['item']['quantity'] == 3 and r['movement']['invoice_number']
    inv_ = Invoice.objects.get(student=sara, invoice_type='miscellaneous')
    assert inv_.amount == Decimal('3000.00') and 'Shirt size 10' in inv_.description
    assert _move(d, shirt, kind='sold', quantity='1').status_code == 400  # no student
    assert [x['name'] for x in d['office'].get(f'{URL}/items/', {'sellable': 1}).json()['results']] == ['Shirt size 10']


@pytest.mark.django_db
def test_purchase_orders_receive_and_reorder(inv):
    d = inv
    office = d['office']
    sup = office.post(f'{URL}/suppliers/', {'name': 'City Stationers', 'phone': '042-1', 'tax_number': 'NTN-9'}, format='json').json()
    office.patch(f"{URL}/items/{d['paper']['id']}/", {'preferred_supplier_id': sup['id']}, format='json')
    pens = office.post(f'{URL}/items/', {'name': 'Board markers', 'unit': 'box', 'unit_cost': '300'}, format='json').json()
    po = office.post(f'{URL}/orders/', {'supplier_id': sup['id'], 'lines': [
        {'item_id': d['paper']['id'], 'quantity': '30', 'unit_cost': '1000'},
        {'item_id': pens['id'], 'quantity': '10'}]}, format='json').json()
    assert po['number'].startswith('PO-') and po['number'].endswith('-0001') and po['status'] == 'draft' and po['total'] == 33000
    assert office.post(f"{URL}/orders/{po['id']}/receive/", {}, format='json').status_code == 400  # not sent yet
    assert office.post(f"{URL}/orders/{po['id']}/order/").json()['status'] == 'ordered'
    assert office.patch(f"{URL}/orders/{po['id']}/", {'lines': []}, format='json').status_code == 400
    lines = {l['item']['name']: l for l in po['lines']}
    part = office.post(f"{URL}/orders/{po['id']}/receive/", {'lines': [{'line_id': lines['A4 paper']['id'], 'quantity': '20'}],
                                                              'supplier_invoice': 'INV-77'}, format='json').json()
    assert part['status'] == 'partial' and part['supplier_invoice'] == 'INV-77'
    assert Item.objects.get(pk=d['paper']['id']).quantity == Decimal('40')
    too_many = office.post(f"{URL}/orders/{po['id']}/receive/", {'lines': [{'line_id': lines['A4 paper']['id'], 'quantity': '11'}]}, format='json')
    assert too_many.status_code == 400 and 'Only 10 more' in too_many.json()['error']
    assert office.post(f"{URL}/orders/{po['id']}/cancel/").status_code == 400  # goods already in
    done = office.post(f"{URL}/orders/{po['id']}/receive/", {}, format='json').json()  # everything outstanding
    assert done['status'] == 'received' and Item.objects.get(pk=pens['id']).quantity == Decimal('10')
    assert Movement.objects.filter(purchase_line__order_id=po['id']).count() == 3
    assert Movement.objects.filter(kind='received').first().reference.startswith(po['number'])
    # Reorder list: low items grouped by supplier with a suggestion, minus what is already on order.
    office.post(f"{URL}/items/{d['paper']['id']}/move/", {'kind': 'issued', 'quantity': '45', 'issued_to': 'Exams'}, format='json')
    groups = office.get(f'{URL}/reorder/').json()
    assert groups[0]['supplier']['name'] == 'City Stationers' and groups[0]['items'][0]['suggested'] == 50
    rep = office.get(f'{URL}/report/').json()
    assert rep['items'] == 2 and rep['low'][0]['name'] == 'A4 paper'
    assert rep['by_department'][0]['issued_to'] == 'Exams' and rep['purchases_by_supplier'][0]['value'] == 33000
    assert office.delete(f"{URL}/suppliers/{sup['id']}/").status_code == 400
