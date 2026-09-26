"""Web security hardening (P6): CORS, HTTPS settings, headers, client address and the sign-in limit per address."""
import pytest
from django.core.cache import cache
from django.test import RequestFactory, override_settings
from rest_framework.test import APIClient

from erp_core import security_settings as sec
from services.core.security import policy
from services.core.security.headers import API_CSP, PAGE_CSP
from tests.conftest import UserFactory


def test_cors_rules():
    assert sec.cors(True, {})['CORS_ALLOW_ALL_ORIGINS'] is True
    live = sec.cors(False, {'FRONTEND_ORIGINS': 'https://erp.school.pk/, https://app.example.com'})
    assert live['CORS_ALLOW_ALL_ORIGINS'] is False and live['CORS_ALLOWED_ORIGIN_REGEXES'] == []
    assert live['CORS_ALLOWED_ORIGINS'] == ['https://erp.school.pk', 'https://app.example.com'] == live['CSRF_TRUSTED_ORIGINS']
    # Not set yet: only the hosting providers' default addresses, so the live site keeps working.
    unset = sec.cors(False, {})
    assert unset['CORS_ALLOW_ALL_ORIGINS'] is False and unset['CORS_ALLOWED_ORIGIN_REGEXES'] == sec.HOSTED_ORIGIN_PATTERNS


def test_https_settings_in_production():
    live = sec.transport(False, {})
    assert live['SECURE_SSL_REDIRECT'] and live['SESSION_COOKIE_SECURE'] and live['CSRF_COOKIE_SECURE']
    assert live['SECURE_HSTS_SECONDS'] == 31536000 and live['SECURE_PROXY_SSL_HEADER'] == ('HTTP_X_FORWARDED_PROTO', 'https')
    assert live['SECURE_REDIRECT_EXEMPT'] == [r'^api/v1/health/'] and live['X_FRAME_OPTIONS'] == 'DENY'
    assert sec.transport(False, {'SECURE_SSL_REDIRECT': '0', 'SECURE_HSTS_SECONDS': '0'})['SECURE_SSL_REDIRECT'] is False
    dev = sec.transport(True, {})
    assert 'SECURE_SSL_REDIRECT' not in dev and 'SESSION_COOKIE_SECURE' not in dev
    assert sec.trusted_proxies(False, {}) == 1 and sec.trusted_proxies(True, {}) == 0
    assert sec.trusted_proxies(False, {'TRUSTED_PROXIES': '2'}) == 2


@override_settings(TRUSTED_PROXIES=1)
def test_client_address_cannot_be_made_up():
    rf = RequestFactory()
    # The visitor sent "6.6.6.6"; Render's proxy added the real address at the end.
    assert policy.client_ip(rf.get('/', HTTP_X_FORWARDED_FOR='6.6.6.6, 203.0.113.7', REMOTE_ADDR='10.0.0.1')) == '203.0.113.7'
    assert policy.client_ip(rf.get('/', REMOTE_ADDR='10.0.0.1')) == '10.0.0.1'
    with override_settings(TRUSTED_PROXIES=0):
        assert policy.client_ip(rf.get('/', HTTP_X_FORWARDED_FOR='6.6.6.6', REMOTE_ADDR='10.0.0.1')) == '10.0.0.1'


@pytest.mark.django_db
def test_headers_on_api_and_pages():
    r = APIClient().get('/api/v1/health/version/')
    assert r['Content-Security-Policy'] == API_CSP and 'camera=' in r['Permissions-Policy']
    assert r['X-Frame-Options'] == 'DENY' and r['X-Content-Type-Options'] == 'nosniff'
    page = APIClient().get('/admin/login/')
    assert page['Content-Security-Policy'] == PAGE_CSP


@pytest.mark.django_db
@override_settings(CORS_ALLOW_ALL_ORIGINS=False, CORS_ALLOWED_ORIGINS=['https://erp.school.pk'], CORS_ALLOWED_ORIGIN_REGEXES=[])
def test_only_our_web_app_may_call_the_api_from_a_browser():
    c = APIClient()
    good = c.get('/api/v1/health/version/', HTTP_ORIGIN='https://erp.school.pk')
    assert good['Access-Control-Allow-Origin'] == 'https://erp.school.pk'
    evil = c.get('/api/v1/health/version/', HTTP_ORIGIN='https://evil.example')
    assert 'Access-Control-Allow-Origin' not in evil


@pytest.mark.django_db
@override_settings(SIGN_IN_FAILURES_PER_IP=3, TRUSTED_PROXIES=0)
def test_wrong_passwords_are_limited_per_address():
    cache.clear()
    victims = [UserFactory(email=f'v{i}@school.test') for i in range(3)]
    other = UserFactory(email='right@school.test')
    other.set_password('Right#Pass1'); other.save()
    attacker = APIClient(REMOTE_ADDR='198.51.100.9')
    for v in victims:  # one wrong password on each of three accounts: no account is locked, but the address is
        assert attacker.post('/api/v1/auth/login/', {'email': v.email, 'password': 'Summer2026!'}, format='json').status_code == 401
    blocked = attacker.post('/api/v1/auth/login/', {'email': other.email, 'password': 'Right#Pass1'}, format='json')
    assert blocked.status_code == 429 and 'network' in blocked.json()['error']
    # Another address (another school) is not affected.
    ok = APIClient(REMOTE_ADDR='192.0.2.20').post('/api/v1/auth/login/', {'email': other.email, 'password': 'Right#Pass1'}, format='json')
    assert ok.status_code == 200
    # Right passwords never count.
    cache.clear()
    school_net = APIClient(REMOTE_ADDR='192.0.2.30')
    for _ in range(5):
        assert school_net.post('/api/v1/auth/login/', {'email': other.email, 'password': 'Right#Pass1'}, format='json').status_code == 200
