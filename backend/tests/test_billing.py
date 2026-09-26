"""SaaS plans and subscriptions (P11)."""
import io
from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.billing import service
from services.core.billing.models import Plan, Subscription
from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import SchoolClass
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

B = '/api/v1/billing'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def bill(db):
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    teacher = UserFactory(email='t@hillside.test')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher')
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    with use_tenant(s):
        g1 = SchoolClass.objects.create(tenant=s, name='Grade 1', code='G1')
    return dict(s=s, admin=admin, office=_client(admin), teacher=_client(teacher), owner=_client(owner), g1=g1)


def _subscribe(school, code, **kw):
    sub = Subscription.objects.create(school=school, plan=Plan.objects.get(code=code), **kw)
    school._subscription_cache = 'unset'
    return sub


@pytest.mark.django_db
def test_plans_and_new_schools_get_a_trial(bill):
    plans = APIClient().get(f'{B}/plans/').json()['plans']
    assert [p['code'] for p in plans] == ['starter', 'standard', 'premium', 'enterprise']
    assert plans[3]['contact_sales'] and plans[0]['student_limit'] == 150
    # Schools from before plans existed: unlimited, every module, nothing blocked.
    me = bill['office'].get(f'{B}/subscription/').json()
    assert me['status'] == 'legacy' and 'library' in me['modules'] and me['can_write']
    from services.core.tenants.signup import create_school_with_admin

    school, user = create_school_with_admin(school_name='New Academy', admin_email='a@new.test', admin_name='A', password='Secret-123x', currency='USD')
    sub = Subscription.objects.get(school=school)
    assert sub.plan.code == 'premium' and sub.effective_status() == 'trialing'
    data = _client(user).get(f'{B}/subscription/').json()
    assert data['trial_days_left'] == 30 and data['plan']['name'] == 'Premium' and data['events'][0]['summary'].startswith('Free trial')
    assert [p['code'] for p in data['plans'] if p['fits']] == ['starter', 'standard', 'premium', 'enterprise']
    # Non-admins only see which areas are open.
    assert set(bill['teacher'].get(f'{B}/subscription/').json()) == {'status', 'modules', 'can_write'}


@pytest.mark.django_db
def test_modules_outside_the_plan_are_closed(bill):
    _subscribe(bill['s'], 'starter', status='active', current_period_end=timezone.now() + timedelta(days=10))
    r = bill['teacher'].get('/api/v1/auth/library/books/')
    assert r.status_code == 402 and 'Library is not included in your Starter plan' in r.json()['detail']
    assert bill['office'].get('/api/v1/auth/insights/overview/').status_code == 402
    assert bill['office'].get('/api/v1/auth/students/').status_code == 200  # core areas are in every plan
    Subscription.objects.filter(school=bill['s']).update(plan=Plan.objects.get(code='standard'))
    assert bill['teacher'].get('/api/v1/auth/library/books/').status_code != 402
    assert bill['office'].get('/api/v1/auth/inventory/items/').status_code == 402


@pytest.mark.django_db
def test_read_only_after_the_trial_and_renewal(bill):
    sub = _subscribe(bill['s'], 'standard', status='trialing', trial_ends_at=timezone.now() - timedelta(hours=1))
    office = bill['office']
    r = office.put('/api/v1/tenants/locale/', {'week_start': 0}, format='json')
    assert r.status_code == 402 and 'free trial has ended' in r.json()['detail']
    assert office.get('/api/v1/tenants/locale/').status_code == 200  # viewing still works
    assert office.post('/api/v1/security/me/sign-out-everywhere/').status_code == 200  # personal safety still works
    me = office.get(f'{B}/subscription/').json()
    assert me['status'] == 'read_only' and not me['can_write']
    # Choosing a plan is allowed while read-only; paying (renew) opens the school again.
    assert office.post(f'{B}/subscription/change/', {'plan': 'premium', 'cycle': 'yearly'}, format='json').status_code == 200
    sub.refresh_from_db()
    service.renew(sub)
    assert sub.effective_status() == 'active' and (sub.current_period_end - timezone.now()).days >= 364
    fresh = _client(bill['admin'])
    assert fresh.put('/api/v1/tenants/locale/', {'week_start': 0}, format='json').status_code == 200
    # A missed renewal: a week of grace, then read-only.
    now = timezone.now()
    sub.current_period_end = now - timedelta(days=3)
    assert sub.effective_status(now) == 'past_due' and sub.can_write(now)
    sub.current_period_end = now - timedelta(days=8)
    assert sub.effective_status(now) == 'read_only'


@pytest.mark.django_db
def test_limits_and_plan_changes(bill):
    s, office = bill['s'], bill['office']
    sub = _subscribe(s, 'starter', status='active', current_period_end=timezone.now() + timedelta(days=20))
    Plan.objects.filter(code='starter').update(student_limit=2)
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    StudentFactory(tenant=s, current_class=bill['g1'], **kw)
    StudentFactory(tenant=s, current_class=bill['g1'], **kw)
    s._subscription_cache = 'unset'
    with pytest.raises(service.BillingBlocked):
        StudentFactory(tenant=s, current_class=bill['g1'], **kw)
    # The import preview marks rows over the limit.
    csv = SimpleUploadedFile('s.csv', b'Name,Class\nNew One,Grade 1\n', content_type='text/csv')
    row = office.post('/api/v1/auth/imports/students/preview/', {'file': csv}, format='multipart').json()['rows'][0]
    assert row['state'] == 'error' and 'plan limit' in row['messages'][0]
    # Upgrade: at once. Downgrade: at the end of the period, and only if the school fits.
    r = office.post(f'{B}/subscription/change/', {'plan': 'standard'}, format='json').json()
    assert r['message'].startswith('Now on Standard') and r['subscription']['plan']['code'] == 'standard'
    Plan.objects.filter(code='starter').update(student_limit=1)
    r = office.post(f'{B}/subscription/change/', {'plan': 'starter'}, format='json')
    assert r.status_code == 402 and 'too small' in r.json()['detail']
    Plan.objects.filter(code='starter').update(student_limit=150)
    r = office.post(f'{B}/subscription/change/', {'plan': 'starter'}, format='json').json()
    assert 'starts on' in r['message'] and r['subscription']['pending_plan']['code'] == 'starter'
    sub.refresh_from_db()
    service.renew(sub)
    assert sub.plan.code == 'starter' and sub.pending_plan is None
    assert office.post(f'{B}/subscription/change/', {'plan': 'enterprise'}, format='json').status_code == 402
    assert bill['teacher'].post(f'{B}/subscription/change/', {'plan': 'premium'}, format='json').status_code == 403
    # Cancel: works until the period ends, then read-only; can be resumed before that.
    r = office.post(f'{B}/subscription/cancel/').json()
    assert 'read-only' in r['message'] and r['subscription']['cancel_at_period_end']
    office.post(f'{B}/subscription/cancel/', {'resume': True}, format='json')
    sub.refresh_from_db()
    assert not sub.cancel_at_period_end
    sub.cancel_at_period_end = True
    sub.save()
    service.renew(sub)
    assert sub.status == 'cancelled'


@pytest.mark.django_db
def test_platform_owner_manages_plans_and_schools(bill):
    owner, s = bill['owner'], bill['s']
    assert bill['office'].get(f'{B}/platform/').status_code == 403
    rows = {r['name']: r for r in owner.get(f'{B}/platform/').json()['schools']}
    assert rows['Hillside School']['status'] == 'legacy'
    d = owner.post(f'{B}/platform/schools/{s.pk}/', {'plan': 'premium', 'renew': True, 'note': 'bank transfer'}, format='json').json()
    assert d['subscription']['status'] == 'active' and d['subscription']['plan']['code'] == 'premium'
    assert any('bank transfer' in e['summary'] for e in d['events'])
    d = owner.post(f'{B}/platform/schools/{s.pk}/', {'status': 'suspended'}, format='json').json()
    assert d['subscription']['status'] == 'suspended' and not d['subscription']['can_write']
    r = owner.put(f'{B}/platform/plans/starter/', {'price_monthly': 39, 'student_limit': '', 'modules': ['library', 'bogus']}, format='json').json()
    assert r['price_monthly'] == 39 and r['student_limit'] is None
    assert [m['key'] for m in r['modules'] if m['included']] == ['library']
    assert owner.put(f'{B}/platform/plans/starter/', {'price_monthly': -1}, format='json').status_code == 400
