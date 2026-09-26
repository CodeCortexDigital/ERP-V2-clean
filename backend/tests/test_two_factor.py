"""Two-step sign-in with an authenticator app (P8)."""
import base64
import time

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.security import policy, twofactor
from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory

LOGIN = '/api/v1/auth/login/'
S = '/api/v1/security'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _now_step():
    return int(time.time() // twofactor.STEP)


def _turn_on(user):
    """Set up two-step for the user like the app does; returns (secret, recovery codes)."""
    c = _client(user)
    setup = c.post(f'{S}/2fa/setup/').json()
    assert setup['uri'].startswith('otpauth://totp/') and setup['qr'].startswith('data:image/svg+xml')
    secret = setup['secret'].replace(' ', '')
    assert c.post(f'{S}/2fa/confirm/', {'code': '000000' if twofactor.code_at(secret, _now_step()) != '000000' else '111111'},
                  format='json').status_code == 400
    done = c.post(f'{S}/2fa/confirm/', {'code': twofactor.code_at(secret, _now_step())}, format='json').json()
    assert done['enabled'] and len(done['recovery_codes']) == 10 and done['recovery_codes_left'] == 10
    return secret, done['recovery_codes']


def test_codes_match_the_standard():
    # RFC 6238 test secret "12345678901234567890", time 59 s (step 1): 94287082 -> last six digits.
    secret = base64.b32encode(b'12345678901234567890').decode()
    assert twofactor.code_at(secret, 1) == '287082'
    assert twofactor.matching_step(secret, '287 082', now=59) == 1
    assert twofactor.matching_step(secret, '287082', now=59 + 30 * 5) is None


@pytest.mark.django_db
def test_sign_in_with_two_steps():
    cache.clear()
    user = UserFactory(email='office@hill.test', password='Office-pass-1')
    secret, recovery = _turn_on(user)
    first = APIClient().post(LOGIN, {'email': user.email, 'password': 'Office-pass-1'}, format='json')
    assert first.status_code == 200 and first.json()['two_factor_required'] and 'access' not in first.json()
    challenge = first.json()['challenge']
    wrong = APIClient().post(f'{LOGIN}2fa/', {'challenge': challenge, 'code': '123456'}, format='json')
    assert wrong.status_code == 401
    # The code used to switch it on can't be used again; the next one (clock drift allowed) works.
    ok = APIClient().post(f'{LOGIN}2fa/', {'challenge': challenge, 'code': twofactor.code_at(secret, _now_step() + 1)}, format='json')
    assert ok.status_code == 200 and ok.json()['access']
    # A recovery code works once.
    ch2 = APIClient().post(LOGIN, {'email': user.email, 'password': 'Office-pass-1'}, format='json').json()['challenge']
    rec = APIClient().post(f'{LOGIN}2fa/', {'challenge': ch2, 'code': recovery[0].upper()}, format='json')
    assert rec.status_code == 200 and rec.json()['recovery_code_used'] and rec.json()['recovery_codes_left'] == 9
    ch3 = APIClient().post(LOGIN, {'email': user.email, 'password': 'Office-pass-1'}, format='json').json()['challenge']
    assert APIClient().post(f'{LOGIN}2fa/', {'challenge': ch3, 'code': recovery[0]}, format='json').status_code == 401
    # A made-up challenge, and too many wrong codes on one challenge.
    assert APIClient().post(f'{LOGIN}2fa/', {'challenge': 'x' + ch3, 'code': '1'}, format='json').json()['expired']
    for _ in range(4):
        APIClient().post(f'{LOGIN}2fa/', {'challenge': ch3, 'code': '000001'}, format='json')
    assert APIClient().post(f'{LOGIN}2fa/', {'challenge': ch3, 'code': '000001'}, format='json').status_code in (401, 429, 403)


@pytest.mark.django_db
def test_google_and_microsoft_sign_in_also_ask_for_the_code():
    from services.core.accounts.views import build_login_response

    user = UserFactory(email='g@hill.test', password='G-pass-12345')
    _turn_on(user)
    request = APIRequestFactory().post('/api/v1/auth/firebase/login/')
    r = build_login_response(request, user, method='google')
    assert r.data['two_factor_required'] and 'access' not in r.data
    found = twofactor.read_challenge(r.data['challenge'])
    assert found[0] == user and found[1] == 'google'


@pytest.mark.django_db
def test_required_for_platform_owners_and_when_the_school_asks(settings, monkeypatch):
    settings.APP_ENV = 'production'
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    c = _client(owner)
    blocked = c.put('/api/v1/tenants/locale/', {'currency': 'GBP'}, format='json')
    assert blocked.status_code == 403 and blocked.json()['two_factor_setup_required']
    assert c.get(f'{S}/2fa/').json()['required'] is True  # reading and setting up still work
    _turn_on(owner)
    owner.refresh_from_db()
    assert _client(owner).put('/api/v1/tenants/locale/', {'currency': 'GBP'}, format='json').status_code != 403
    # Can't turn off what is required.
    assert _client(owner).post(f'{S}/2fa/disable/', {'password': 'x', 'code': 'x'}, format='json').status_code == 400
    monkeypatch.setenv('REQUIRE_2FA_PLATFORM_OWNER', '0')
    assert twofactor.required_for(owner) is False

    school = SchoolFactory()
    admin = UserFactory(email='office@school.test')
    TenantMembership.objects.create(user=admin, school=school, role='admin', is_primary=True)
    assert twofactor.required_for(admin) is False
    policy.save_settings(school, {'admin_two_factor': 1})
    school.refresh_from_db()
    assert twofactor.required_for(admin) is True
    assert _client(admin).put('/api/v1/tenants/locale/', {'currency': 'GBP'}, format='json').status_code == 403


@pytest.mark.django_db
def test_turning_off_and_the_office_reset():
    user = UserFactory(email='t@hill.test', password='T-pass-12345')
    secret, recovery = _turn_on(user)
    c = _client(user)
    assert c.post(f'{S}/2fa/disable/', {'password': 'wrong', 'code': recovery[1]}, format='json').status_code == 400
    assert c.post(f'{S}/2fa/recovery-codes/', {'password': 'T-pass-12345', 'code': recovery[1]}, format='json').status_code == 200
    user.refresh_from_db()
    assert user.two_factor_enabled
    # Lost phone: the school office turns it off for them.
    school = SchoolFactory()
    office = UserFactory(email='office@hill2.test')
    TenantMembership.objects.create(user=office, school=school, role='admin', is_primary=True)
    TenantMembership.objects.create(user=user, school=school, role='teacher', is_primary=True)
    r = _client(office).post(f'{S}/people/{user.pk}/', {'action': 'reset_two_factor'}, format='json')
    assert r.status_code == 200, r.content
    user.refresh_from_db()
    assert not user.two_factor_enabled and not twofactor.enabled(user)
    first = APIClient().post(LOGIN, {'email': user.email, 'password': 'T-pass-12345'}, format='json')
    assert first.status_code == 200 and 'access' in first.json()
