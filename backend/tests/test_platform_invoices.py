"""Platform invoices, payments, reminders and tax (P12)."""
import json
from datetime import timedelta
from decimal import Decimal

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.billing import invoicing, service
from services.core.billing.models import Plan, PlatformInvoice, Subscription, TaxRule
from services.core.tenants.models import TenantMembership
from services.education.finance.payments.stripe_gateway import sign
from tests.conftest import SchoolFactory, UserFactory

B = '/api/v1/billing'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def pi(db, settings):
    settings.FALLBACK_EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    settings.FRONTEND_ORIGINS = 'http://localhost:5179'
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    other = SchoolFactory(name='Other School')
    other_admin = UserFactory(email='office@other.test')
    TenantMembership.objects.create(user=other_admin, school=other, role='admin', is_primary=True)
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    return dict(s=s, admin=admin, office=_client(admin), other=other, other_office=_client(other_admin), owner=_client(owner))


def _sub(school, code='standard', **kw):
    sub = Subscription.objects.create(school=school, plan=Plan.objects.get(code=code), **kw)
    school._subscription_cache = 'unset'
    return sub


@pytest.mark.django_db
def test_billing_details_and_tax(pi):
    office = pi['office']
    assert office.put(f'{B}/details/', {'country': 'Germany'}, format='json').status_code == 400
    assert office.put(f'{B}/details/', {'email': 'nope'}, format='json').status_code == 400
    d = office.put(f'{B}/details/', {'legal_name': 'Hillside School Ltd', 'country': 'gb', 'address': '1 High St', 'email': 'bills@hillside.test'},
                   format='json').json()['details']
    assert d['country'] == 'GB' and d['legal_name'] == 'Hillside School Ltd'
    owner = pi['owner']
    assert owner.put(f'{B}/platform/tax/', {'country': 'GB', 'label': 'VAT', 'rate': 20}, format='json').status_code == 200
    owner.put(f'{B}/platform/tax/', {'country': 'DE', 'label': 'MwSt', 'rate': 19, 'exempt_with_tax_id': True}, format='json')
    assert owner.put(f'{B}/platform/tax/', {'country': 'GB', 'rate': 80}, format='json').status_code == 400
    assert pi['office'].get(f'{B}/platform/tax/').status_code == 403
    pi['s'].refresh_from_db()
    inv = invoicing.issue(pi['s'], Plan.objects.get(code='standard'), 'monthly', timezone.localdate())
    assert (inv.subtotal, inv.tax_label, inv.tax_amount, inv.total) == (Decimal('99.00'), 'VAT', Decimal('19.80'), Decimal('118.80'))
    assert inv.bill_to['legal_name'] == 'Hillside School Ltd' and inv.number.startswith(f'PI-{timezone.localdate():%Y}-')
    # A business in Germany with a tax ID: reverse charge.
    office.put(f'{B}/details/', {'country': 'DE', 'tax_id': 'DE123456789'}, format='json')
    pi['s'].refresh_from_db()
    inv2 = invoicing.issue(pi['s'], Plan.objects.get(code='standard'), 'monthly', timezone.localdate() + timedelta(days=40))
    assert inv2.tax_amount == 0 and 'Reverse charge' in inv2.tax_note
    assert invoicing.issue(pi['s'], Plan.objects.get(code='standard'), 'monthly', timezone.localdate()) == inv  # one per period
    assert invoicing.issue(pi['s'], Plan.objects.get(code='enterprise'), 'monthly', timezone.localdate()) is None
    owner.delete(f'{B}/platform/tax/?country=DE')
    assert list(TaxRule.objects.values_list('country', flat=True)) == ['GB']


@pytest.mark.django_db
def test_choosing_a_plan_bills_and_paying_opens_the_period(pi):
    s, office = pi['s'], pi['office']
    trial_end = timezone.now() + timedelta(days=10)
    sub = _sub(s, 'premium', status='trialing', trial_ends_at=trial_end)
    r = office.post(f'{B}/subscription/change/', {'plan': 'standard', 'cycle': 'yearly'}, format='json').json()
    assert 'Invoice PI-' in r['message']
    inv = PlatformInvoice.objects.get(school=s)
    assert inv.total == Decimal('990.00') and inv.due_date == timezone.localtime(trial_end).date() and inv.billing_cycle == 'yearly'
    listed = office.get(f'{B}/invoices/').json()
    assert listed['results'][0]['number'] == inv.number and listed['payment'] == {'card': False, 'bank_details': ''}
    # Paying early keeps the rest of the trial: the paid year starts when the trial ends.
    invoicing.mark_paid(inv, via='bank_transfer', reference='TRF-1')
    sub.refresh_from_db()
    assert sub.status == 'active' and sub.plan.code == 'standard'
    assert abs((sub.current_period_start - trial_end).total_seconds()) < 86400 and (sub.current_period_end - sub.current_period_start).days == 365
    # Other schools can't see it; the platform owner can.
    assert pi['other_office'].get(f'{B}/invoices/{inv.id}/').status_code == 404
    assert pi['owner'].get(f'{B}/invoices/{inv.id}/').json()['invoice']['status'] == 'paid'


@pytest.mark.django_db
def test_read_only_school_pays_and_opens_again(pi, monkeypatch):
    s, office = pi['s'], pi['office']
    sub = _sub(s, 'premium', status='trialing', trial_ends_at=timezone.now() - timedelta(days=2))
    assert office.put('/api/v1/tenants/locale/', {'week_start': 0}, format='json').status_code == 402
    office.post(f'{B}/subscription/change/', {'plan': 'starter'}, format='json')
    inv = PlatformInvoice.objects.get(school=s)
    assert inv.due_date == timezone.localdate() and inv.total == Decimal('49.00')
    # Card payment isn't set up: the school is told to use bank transfer, with the details.
    monkeypatch.setenv('PLATFORM_BANK_DETAILS', 'Bank: Example Bank\nIBAN: GB00 TEST 0000')
    r = office.post(f'{B}/invoices/{inv.id}/pay/', {'origin': 'http://localhost:5179'}, format='json')
    assert r.status_code == 400 and 'bank transfer' in r.json()['error'] and 'IBAN' in r.json()['bank_details']
    # Stripe confirms the card payment (signed webhook) -> paid, and the school is active again.
    monkeypatch.setenv('PLATFORM_STRIPE_WEBHOOK_SECRET', 'whsec_test')
    body = json.dumps({'type': 'checkout.session.completed', 'data': {'object': {
        'metadata': {'platform_invoice': str(inv.id)}, 'payment_status': 'paid', 'payment_intent': 'pi_123'}}}).encode()
    assert APIClient().post(f'{B}/stripe/webhook/', body, content_type='application/json', HTTP_STRIPE_SIGNATURE='t=1,v1=bad').status_code == 400
    ok = APIClient().post(f'{B}/stripe/webhook/', body, content_type='application/json', HTTP_STRIPE_SIGNATURE=sign(body, 'whsec_test'))
    assert ok.status_code == 200
    inv.refresh_from_db()
    sub.refresh_from_db()
    assert inv.status == 'paid' and inv.paid_via == 'card' and inv.payment_reference == 'pi_123'
    assert sub.effective_status() == 'active' and sub.plan.code == 'starter'
    assert _client(pi['admin']).put('/api/v1/tenants/locale/', {'week_start': 0}, format='json').status_code == 200


@pytest.mark.django_db
def test_upgrade_difference_renewals_and_reminders(pi):
    s = pi['s']
    now = timezone.now()
    sub = _sub(s, 'starter', status='active', current_period_start=now - timedelta(days=15), current_period_end=now + timedelta(days=15))
    pi['office'].post(f'{B}/subscription/change/', {'plan': 'standard'}, format='json')
    pro = PlatformInvoice.objects.get(school=s, kind='proration')
    assert Decimal('24') <= pro.total <= Decimal('26')  # (99 - 49) x 15/30
    # Paying the difference doesn't move the renewal date.
    end_before = Subscription.objects.get(pk=sub.pk).current_period_end
    invoicing.mark_paid(pro, via='card')
    assert Subscription.objects.get(pk=sub.pk).current_period_end == end_before
    # Daily run: nothing yet (renewal is 15 days away); 6 days before, the renewal invoice appears once.
    today = timezone.localdate()
    assert invoicing.run(today)['issued'] == 0
    assert invoicing.run(today + timedelta(days=9))['issued'] == 1
    assert invoicing.run(today + timedelta(days=9))['issued'] == 0
    renewal = PlatformInvoice.objects.get(school=s, kind='period')
    assert renewal.plan_name == 'Standard' and renewal.due_date == timezone.localtime(end_before).date()
    # Reminders: 3 days before, on the day, 3 and 7 days late, each once.
    due = renewal.due_date
    stages = [invoicing.remind(renewal, due + timedelta(days=d)) for d in (-5, -3, -3, 0, 3, 7, 8)]
    assert stages == [None, 'soon', None, 'due', 'late3', 'late7', None]
    assert len(mail.outbox) == 4 and 'read-only' in mail.outbox[-1].body and mail.outbox[0].to == ['office@hillside.test']


@pytest.mark.django_db
def test_platform_owner_invoices(pi):
    s, owner = pi['s'], pi['owner']
    _sub(s, 'standard', status='active', current_period_end=timezone.now() + timedelta(days=3))
    inv = invoicing.issue(s, Plan.objects.get(code='standard'), 'monthly', timezone.localdate() - timedelta(days=5), due=timezone.localdate() - timedelta(days=5))
    listed = owner.get(f'{B}/platform/invoices/?status=overdue').json()['results']
    assert [i['number'] for i in listed] == [inv.number] and listed[0]['status'] == 'overdue'
    assert pi['office'].get(f'{B}/platform/invoices/').status_code == 403
    r = owner.post(f'{B}/platform/invoices/{inv.id}/', {'action': 'mark_paid', 'via': 'bank_transfer', 'reference': 'TRF-77'}, format='json').json()
    assert r['invoice']['status'] == 'paid' and r['invoice']['payment_reference'] == 'TRF-77'
    assert owner.post(f'{B}/platform/invoices/{inv.id}/', {'action': 'void'}, format='json').status_code == 400
    other = invoicing.issue(s, Plan.objects.get(code='standard'), 'monthly', timezone.localdate() + timedelta(days=60))
    assert owner.post(f'{B}/platform/invoices/{other.id}/', {'action': 'void'}, format='json').json()['invoice']['status'] == 'void'
    assert set(owner.post(f'{B}/platform/run/').json()) == {'issued', 'reminded'}
    assert any('TRF-77' in e['summary'] for e in owner.get(f'{B}/platform/schools/{s.pk}/').json()['events'])
