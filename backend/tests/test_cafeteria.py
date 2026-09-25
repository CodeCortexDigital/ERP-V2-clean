"""Cafeteria: food and weekly menu, the till (balance, limits, allergies, meal plans), top-ups, families, report (Phase 16)."""
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
from services.education.cafeteria.models import Account, Transaction
from services.education.finance.models import Invoice, Payment
from services.education.students.models import StudentHealth
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/cafeteria'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def caf(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    cashier = UserFactory(email='canteen@hillside.test', full_name='Canteen')
    TenantMembership.objects.create(user=cashier, school=s, role='staff', is_primary=True)
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher', is_primary=True)
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    sara = StudentFactory(tenant=s, full_name='Sara Ali', **kw)
    omar = StudentFactory(tenant=s, full_name='Omar Ali', **kw)
    with use_tenant(s):
        StudentHealth.objects.create(tenant=s, student=sara, allergies='Peanuts and tree nuts', has_severe_allergy=True)
    parent = UserFactory(email='ali.parent@example.com', full_name='Mr Ali')
    ParentProfile.objects.create(user=parent).linked_students.add(sara, omar)
    office = _client(admin)
    office.patch(f'{URL}/settings/', {'low_balance_level': '100'}, format='json')
    biryani = office.post(f'{URL}/items/', {'name': 'Chicken biryani', 'category': 'meal', 'price': '250'}, format='json').json()
    cookie = office.post(f'{URL}/items/', {'name': 'Peanut cookie', 'category': 'snack', 'price': '80', 'allergens': 'nuts, gluten'}, format='json').json()
    juice = office.post(f'{URL}/items/', {'name': 'Orange juice', 'category': 'drink', 'price': '60'}, format='json').json()
    return dict(s=s, admin=admin, cashier=cashier, teacher=teacher, office=office, sara=sara, omar=omar, parent=parent,
                biryani=biryani, cookie=cookie, juice=juice)


def _charge(c, student, *items, **extra):
    return c.post(f'{URL}/till/charge/', {'student_id': str(student.id), 'items': [{'item_id': i['id'], 'quantity': q} for i, q in items], **extra}, format='json')


@pytest.mark.django_db
def test_till_balance_limits_allergies_and_refunds(caf):
    d = caf
    till = _client(d['cashier'])
    assert _client(d['teacher']).get(f'{URL}/till/find/', {'q': 'Sara'}).status_code == 403
    found = till.get(f'{URL}/till/find/', {'q': 'sara'}).json()
    assert found[0]['student']['full_name'] == 'Sara Ali' and found[0]['severe_allergy'] and found[0]['balance'] == 0
    # No money yet.
    assert 'Not enough money' in _charge(till, d['sara'], (d['biryani'], 1)).json()['error']
    till.post(f"{URL}/accounts/{d['sara'].id}/top-up/", {'amount': '500', 'method': 'cash'}, format='json')
    ok = _charge(till, d['sara'], (d['biryani'], 1), (d['juice'], 2))
    assert ok.status_code == 201 and ok.json()['account']['balance'] == 130 and ok.json()['account']['spent_today'] == 370
    # Allergy warning stops the sale unless the cashier overrides it (and that is written down).
    warn = _charge(till, d['sara'], (d['cookie'], 1))
    assert warn.status_code == 409 and warn.json()['allergy'] == ['Peanut cookie: nuts']
    over = _charge(till, d['sara'], (d['cookie'], 1), override_allergy=True).json()
    assert over['transaction']['note'].startswith('Allergy warning overridden')
    # Low balance: the family is told once.
    assert Notification.objects.filter(recipient=d['parent'], title='Cafeteria balance is low').count() == 1
    _charge(till, d['sara'], (d['juice'], 0 + 1))
    assert Notification.objects.filter(recipient=d['parent'], title='Cafeteria balance is low').count() == 1
    # Parents set a daily limit.
    fam = _client(d['parent'])
    fam.post(f"{URL}/mine/{d['sara'].id}/limit/", {'daily_limit': '500'}, format='json')
    till.post(f"{URL}/accounts/{d['sara'].id}/top-up/", {'amount': '1000'}, format='json')
    assert 'daily limit of 500' in _charge(till, d['sara'], (d['biryani'], 1)).json()['error']  # 510 already spent
    # Refund the biryani purchase: money back, once only.
    first = Transaction.objects.filter(kind='purchase').order_by('at').first()
    r = till.post(f'{URL}/transactions/{first.id}/refund/', {}, format='json')
    assert r.status_code == 201 and r.json()['amount'] == 370
    assert till.post(f'{URL}/transactions/{first.id}/refund/', {}, format='json').status_code == 400
    assert Account.objects.get(student=d['sara']).balance == Decimal('1420.00')
    # Paused accounts can't buy; only the office adjusts.
    assert till.post(f"{URL}/accounts/{d['sara'].id}/adjust/", {'amount': '10', 'note': 'x'}, format='json').status_code == 403
    d['office'].post(f"{URL}/accounts/{d['sara'].id}/block/", {'blocked': True}, format='json')
    assert 'paused' in _charge(till, d['sara'], (d['juice'], 1)).json()['error']


@pytest.mark.django_db
def test_menu_and_meal_plans(caf):
    d = caf
    office = d['office']
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    office.put(f'{URL}/menu/', {'date': monday.isoformat(), 'meal': 'lunch', 'item_ids': [d['biryani']['id'], d['juice']['id']]}, format='json')
    week = _client(d['parent']).get(f'{URL}/menu/').json()
    assert week['week'] == monday.isoformat() and {i['name'] for i in week['days'][0]['items']} == {'Chicken biryani', 'Orange juice'}
    assert _client(d['parent']).put(f'{URL}/menu/', {'date': monday.isoformat(), 'item_ids': []}, format='json').status_code == 403
    copied = office.post(f'{URL}/menu/copy/', {'from_week': monday.isoformat(), 'to_week': (monday + timedelta(days=7)).isoformat()}, format='json').json()
    assert copied['copied'] == 1
    plan = office.post(f'{URL}/plans/', {'name': 'Lunch every day', 'meal': 'lunch', 'monthly_fee': '4000'}, format='json').json()
    pid = plan[0]['id']
    office.post(f'{URL}/plans/{pid}/members/', {'student_id': str(d['omar'].id)}, format='json')
    assert office.post(f'{URL}/plans/{pid}/members/', {'student_id': str(d['omar'].id)}, format='json').status_code == 400
    till = _client(d['cashier'])
    meal = _charge(till, d['omar'], (d['biryani'], 1), meal_plan=True)
    assert meal.status_code == 201 and meal.json()['transaction']['amount'] == 0
    assert meal.json()['account']['meal_plans'][0]['served_today'] is True
    assert 'already had' in _charge(till, d['omar'], (d['biryani'], 1), meal_plan=True).json()['error']
    assert 'not on a meal plan' in _charge(till, d['sara'], (d['biryani'], 1), meal_plan=True).json()['error']
    month = today.strftime('%Y-%m')
    assert office.post(f'{URL}/plans/invoices/', {'month': month}, format='json').json()['created'] == 1
    assert office.post(f'{URL}/plans/invoices/', {'month': month}, format='json').json()['already_billed'] == 1
    assert Invoice.objects.get(student=d['omar'], description__startswith='Meal plan').amount == Decimal('4000.00')
    rep = office.get(f'{URL}/report/').json()
    assert rep['meal_plan_meals'] == 1 and rep['meal_plan_members'] == 1


@pytest.mark.django_db
def test_family_top_up_is_credited_when_the_invoice_is_paid(caf):
    d = caf
    fam = _client(d['parent'])
    mine = fam.get(f'{URL}/mine/').json()
    assert {c['student']['full_name'] for c in mine['children']} == {'Sara Ali', 'Omar Ali'} and mine['can_set_limit']
    r = fam.post(f"{URL}/mine/{d['omar'].id}/top-up/", {'amount': '1500'}, format='json').json()
    assert r['balance'] == 0 and r['pending_top_ups'][0]['amount'] == 1500
    inv = Invoice.objects.get(student=d['omar'], description__startswith='Cafeteria top-up')
    with use_tenant(d['s']):
        Payment.objects.create(invoice=inv, amount=Decimal('1500'), payment_method='cash')
    acc = Account.objects.get(student=d['omar'])
    assert acc.balance == Decimal('1500.00')
    assert Notification.objects.filter(recipient=d['parent'], title='Cafeteria topped up').exists()
    inv.refresh_from_db()
    inv.save()  # saving again never credits twice
    acc.refresh_from_db()
    assert acc.balance == Decimal('1500.00')
    # Families only see and act for their own children.
    stranger = StudentFactory(tenant=d['s'], full_name='Not Mine', father_name='', mother_name='', guardian_name='', guardian_phone='')
    assert fam.get(f'{URL}/accounts/{stranger.id}/').status_code == 404
    assert fam.post(f'{URL}/mine/{stranger.id}/top-up/', {'amount': '10'}, format='json').status_code == 403
    assert fam.post(f'{URL}/till/charge/', {'student_id': str(d['omar'].id), 'items': []}, format='json').status_code == 403
    history = fam.get(f"{URL}/accounts/{d['omar'].id}/").json()['transactions']
    assert history[0]['kind'] == 'top_up' and history[0]['method'] == 'invoice'
