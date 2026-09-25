"""Family billing, credit, refunds, statements and Stripe card payments (Phase 3)."""
import datetime
import json
from decimal import Decimal
from unittest import mock

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.finance.models import AccountCredit, Invoice, Payment, PaymentGatewayConfig, PaymentTransaction
from services.education.finance.payments import stripe_gateway
from services.education.students.models import Guardian, Household, StudentGuardian
from tests.conftest import SchoolFactory, StudentFactory, UserFactory


def _client(user=None):
    c = APIClient()
    if user:
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _admin(school):
    user = UserFactory(email=f'admin@{school.tenant_code.lower()}.test')
    TenantMembership.objects.create(user=user, school=school, role='admin', is_primary=True)
    return user


@pytest.fixture
def family(db):
    school = SchoolFactory(name='Hillview School')
    school.settings_json = {'currency': 'USD'}
    school.save()
    household = Household.objects.create(tenant=school, name='Garcia family')
    kids = [StudentFactory(tenant=school, full_name=n, household=household, father_name='', mother_name='', guardian_name='')
            for n in ('Ana Garcia', 'Luis Garcia')]
    mom = Guardian.objects.create(tenant=school, household=household, first_name='Rosa', last_name='Garcia',
                                  relationship='mother', email='rosa@example.com')
    for k in kids:
        StudentGuardian.objects.create(tenant=school, student=k, guardian=mom, is_primary=True, receives_billing=True)
    today = datetime.date.today()
    with use_tenant(school):
        inv = [Invoice.objects.create(student=kids[0], amount=Decimal('300'), due_date=today - datetime.timedelta(days=10),
                                      description='Ana tuition'),
               Invoice.objects.create(student=kids[1], amount=Decimal('200'), due_date=today, description='Luis tuition')]
    return school, household, kids, inv


@pytest.mark.django_db
def test_family_payment_is_split_oldest_first_and_extra_becomes_credit(family):
    school, household, kids, inv = family
    api = _client(_admin(school))
    base = f'/api/v1/auth/finance/families/household/{household.id}'

    accounts = api.get('/api/v1/auth/finance/families/').json()
    garcia = next(r for r in accounts['results'] if r['id'] == str(household.id))
    assert garcia['outstanding'] == 500.0 and set(garcia['students']) == {'Ana Garcia', 'Luis Garcia'}

    res = api.post(f'{base}/payments/', {'amount': '550', 'method': 'bank_transfer', 'reference': 'TRX-1'}, format='json')
    assert res.status_code == 201, res.content
    body = res.json()
    assert [a['amount'] for a in body['allocated']] == [300.0, 200.0]  # oldest invoice first
    assert body['credit_added'] == 50.0
    assert body['statement']['outstanding'] == 0 and body['statement']['credit_available'] == 50.0
    assert body['statement']['closing_balance'] == -50.0  # the school owes the family 50
    for i in inv:
        i.refresh_from_db()
        assert i.status == 'paid'

    # New invoice, then use the credit on it.
    with use_tenant(school):
        new = Invoice.objects.create(student=kids[1], amount=Decimal('80'), due_date=datetime.date.today(), description='Trip')
    st = api.post(f'{base}/apply-credit/', {}, format='json').json()
    assert st['credit_available'] == 0 and st['outstanding'] == 30.0 and st['closing_balance'] == 30.0
    new.refresh_from_db()
    assert new.status == 'partial' and new.paid_amount == Decimal('50')


@pytest.mark.django_db
def test_refunds_reopen_the_invoice_or_become_credit(family):
    school, household, kids, inv = family
    api = _client(_admin(school))
    with use_tenant(school):
        pay = Payment.objects.create(invoice=inv[0], amount=Decimal('300'), payment_method='cash')
    inv[0].refresh_from_db()
    assert inv[0].status == 'paid'

    res = api.post(f'/api/v1/auth/finance/payments/{pay.id}/refund/', {'amount': '100', 'method': 'cash', 'reason': 'Left early'},
                   format='json')
    assert res.status_code == 201, res.content
    inv[0].refresh_from_db()
    assert inv[0].paid_amount == Decimal('200') and inv[0].status in ('overdue', 'partial')

    assert api.post(f'/api/v1/auth/finance/payments/{pay.id}/refund/', {'amount': '250', 'method': 'cash'},
                    format='json').status_code == 400  # more than is left on the payment
    assert api.post(f'/api/v1/auth/finance/payments/{pay.id}/refund/', {'amount': '50', 'method': 'account_credit'},
                    format='json').status_code == 201
    assert AccountCredit.objects.filter(household=household).first().amount == Decimal('50')

    st = api.get(f'/api/v1/auth/finance/families/household/{household.id}/statement/').json()
    kinds = [l['type'] for l in st['lines']]
    assert kinds.count('refund') == 2 and 'credit' in kinds
    # 500 charged - 300 paid + 150 refunded - 50 kept as credit = 300 owed
    assert st['closing_balance'] == 300.0
    assert st['billing_contacts'][0]['email'] == 'rosa@example.com' and st['currency'] == 'USD'


@pytest.mark.django_db
def test_goodwill_credit_needs_a_reason_and_staff(family):
    school, household, kids, inv = family
    api = _client(_admin(school))
    url = f'/api/v1/auth/finance/families/household/{household.id}/credit/'
    assert api.post(url, {'amount': '25'}, format='json').status_code == 400
    assert api.post(url, {'amount': '25', 'note': 'Sibling discount'}, format='json').status_code == 201

    outsider = _client(UserFactory(email='nobody@example.com'))
    assert outsider.post(url, {'amount': '25', 'note': 'x'}, format='json').status_code == 403
    assert outsider.get('/api/v1/auth/finance/families/').status_code == 403
    assert outsider.get('/api/v1/auth/finance/payment-gateways/').status_code == 403


@pytest.mark.django_db
def test_gateway_secrets_are_never_returned(family):
    school, *_ = family
    api = _client(_admin(school))
    res = api.post('/api/v1/auth/finance/payment-gateways/', {'provider': 'stripe', 'name': 'Stripe',
                                                          'api_secret': 'sk_test_123', 'webhook_secret': 'whsec_1'},
                   format='json')
    assert res.status_code == 201, res.content
    body = res.json()
    assert 'api_secret' not in body and body['has_api_secret'] is True
    listed = api.get('/api/v1/auth/finance/payment-gateways/').content.decode()
    assert 'sk_test_123' not in listed and 'whsec_1' not in listed
    # Editing without re-entering the secret keeps it.
    api.patch(f"/api/v1/auth/finance/payment-gateways/{body['id']}/", {'name': 'Cards'}, format='json')
    with use_tenant(None):
        assert PaymentGatewayConfig.objects.get(pk=body['id']).api_secret == 'sk_test_123'
    assert [p['code'] for p in api.get('/api/v1/auth/finance/payments/providers/').json()] == ['stripe']


@pytest.mark.django_db
def test_stripe_checkout_and_signed_webhook(family):
    school, household, kids, inv = family
    with use_tenant(school):
        PaymentGatewayConfig.objects.create(tenant=school, provider='stripe', api_secret='sk_test_x',
                                            webhook_secret='whsec_test', is_active=True)
    parent = UserFactory(email='rosa@example.com')
    from services.core.accounts.models import ParentProfile

    ParentProfile.objects.create(user=parent).linked_students.add(*kids)
    api = _client(parent)

    fake = mock.Mock(status_code=200, content=b'1')
    fake.json.return_value = {'id': 'cs_test_1', 'url': 'https://checkout.stripe.com/c/pay/cs_test_1'}
    with mock.patch('services.education.finance.payments.stripe_gateway.requests.post', return_value=fake) as post:
        res = api.post('/api/v1/auth/finance/payments/session/', {'invoice_id': str(inv[0].id), 'provider': 'stripe'},
                       format='json', HTTP_ORIGIN='https://app.example.com')
    assert res.status_code == 200, res.content
    assert res.json()['checkout_url'].startswith('https://checkout.stripe.com/') and res.json()['currency'] == 'USD'
    sent = post.call_args.kwargs['data']
    assert sent['line_items[0][price_data][unit_amount]'] == 30000 and sent['line_items[0][price_data][currency]'] == 'usd'
    ref = res.json()['gateway_reference']

    event = json.dumps({'type': 'checkout.session.completed', 'data': {'object': {
        'id': 'cs_test_1', 'payment_status': 'paid', 'amount_total': 30000, 'payment_intent': 'pi_1',
        'metadata': {'gateway_reference': ref}}}}).encode()
    anon = _client()
    bad = anon.post('/api/v1/auth/finance/payments/webhook/stripe/', event, content_type='application/json',
                    HTTP_STRIPE_SIGNATURE=stripe_gateway.sign(event, 'wrong_secret'))
    assert bad.status_code == 400
    good = anon.post('/api/v1/auth/finance/payments/webhook/stripe/', event, content_type='application/json',
                     HTTP_STRIPE_SIGNATURE=stripe_gateway.sign(event, 'whsec_test'))
    assert good.status_code == 200, good.content
    inv[0].refresh_from_db()
    assert inv[0].status == 'paid'
    # Replaying the same event does not pay twice.
    anon.post('/api/v1/auth/finance/payments/webhook/stripe/', event, content_type='application/json',
              HTTP_STRIPE_SIGNATURE=stripe_gateway.sign(event, 'whsec_test'))
    with use_tenant(school):
        assert Payment.objects.filter(invoice=inv[0]).count() == 1
        assert PaymentTransaction.objects.get(gateway_reference=ref).is_confirmed

    # A parent can see their family statement, but not pay someone else's invoice.
    assert api.get(f'/api/v1/auth/finance/families/household/{household.id}/statement/').status_code == 200
    other = StudentFactory(tenant=school, full_name='Other Kid')
    with use_tenant(school):
        theirs = Invoice.objects.create(student=other, amount=Decimal('10'), due_date=datetime.date.today())
    assert api.post('/api/v1/auth/finance/payments/session/', {'invoice_id': str(theirs.id), 'provider': 'stripe'},
                    format='json').status_code == 404


def test_money_units():
    assert stripe_gateway.to_minor_units(Decimal('12.34'), 'EUR') == 1234
    assert stripe_gateway.to_minor_units(Decimal('5000'), 'KRW') == 5000
    assert stripe_gateway.from_minor_units(1234, 'GBP') == Decimal('12.34')
    body = b'{"x":1}'
    assert stripe_gateway.verify_signature(body, stripe_gateway.sign(body, 's'), 's')
    assert not stripe_gateway.verify_signature(body, stripe_gateway.sign(body, 's', timestamp=1), 's')  # too old


@pytest.mark.django_db
def test_payment_plan_replaces_the_invoice_without_double_billing(family):
    school, household, kids, inv = family
    api = _client(_admin(school))
    res = api.post(f'/api/v1/auth/finance/invoices/{inv[0].id}/payment-plan/',
                   {'installments': 3, 'frequency': 'monthly', 'first_due_date': '2026-10-05'}, format='json')
    assert res.status_code == 201, res.content
    parts = res.json()['installments']
    assert [p['amount'] for p in parts] == [100.0, 100.0, 100.0]
    assert [p['due_date'] for p in parts] == ['2026-10-05', '2026-11-05', '2026-12-05']
    inv[0].refresh_from_db()
    assert inv[0].status == 'cancelled' and inv[0].balance_due == 0
    st = api.get(f'/api/v1/auth/finance/families/household/{household.id}/statement/').json()
    assert st['outstanding'] == 500.0 and st['closing_balance'] == 500.0  # still 300 + 200, not 800
    # Splitting again, or splitting a paid invoice, is refused.
    assert api.post(f'/api/v1/auth/finance/invoices/{inv[0].id}/payment-plan/', {'installments': 2},
                    format='json').status_code == 400
