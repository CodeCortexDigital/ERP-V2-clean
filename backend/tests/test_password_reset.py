"""Forgotten passwords, the password-changed notice, email verification and the email log (P3)."""
import re
import time

import pytest
from django.core import mail, signing
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.security.models import EmailLog
from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory

S = '/api/v1/security'
LOGIN = '/api/v1/auth/login/'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def pr(db, settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    settings.FRONTEND_ORIGINS = 'https://app.example.test'
    cache.clear()
    s = SchoolFactory(name='Hillside School')
    s.settings_json = {'security': {'password_min_length': 10}}
    s.save()
    admin = UserFactory(email='office@hillside.test', password='Office-pass-123')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    amy = UserFactory(email='amy@hillside.test', password='Old-password-1')
    TenantMembership.objects.create(user=amy, school=s, role='staff')
    return dict(s=s, admin=admin, amy=amy, office=_client(admin))


def _link(msg):
    return re.search(r'https://app\.example\.test/reset-password\?uid=([^&\s]+)&token=([^\s]+)', msg.body).groups()


@pytest.mark.django_db
def test_reset_by_email(pr):
    anyone = APIClient()
    assert anyone.post(f'{S}/password-reset/', {'email': ''}, format='json').status_code == 400
    same = anyone.post(f'{S}/password-reset/', {'email': 'nobody@nowhere.test'}, format='json').json()
    real = anyone.post(f'{S}/password-reset/', {'email': 'AMY@hillside.test'}, format='json').json()
    assert same == real  # never says whether the account exists
    assert len(mail.outbox) == 1 and mail.outbox[0].to == ['amy@hillside.test'] and 'Hillside School' in mail.outbox[0].body
    uid, token = _link(mail.outbox[0])
    old_access = str(RefreshToken.for_user(pr['amy']).access_token)  # a session from before the reset
    time.sleep(1.1)
    assert anyone.post(f'{S}/password-reset/confirm/', {'uid': uid, 'token': 'bad', 'password': 'New-password-12'}, format='json').status_code == 400
    short = anyone.post(f'{S}/password-reset/confirm/', {'uid': uid, 'token': token, 'password': 'Short-1x'}, format='json')
    assert short.status_code == 400 and '10 characters' in short.json()['error']  # the school's own rule
    ok = anyone.post(f'{S}/password-reset/confirm/', {'uid': uid, 'token': token, 'password': 'New-password-12'}, format='json')
    assert ok.status_code == 200
    assert anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'New-password-12'}, format='json').status_code == 200
    assert anyone.post(LOGIN, {'email': 'amy@hillside.test', 'password': 'Old-password-1'}, format='json').status_code == 401
    old = APIClient()
    old.credentials(HTTP_AUTHORIZATION=f'Bearer {old_access}')
    assert old.get(f'{S}/me/').status_code == 401  # signed out everywhere
    assert anyone.post(f'{S}/password-reset/confirm/', {'uid': uid, 'token': token, 'password': 'Another-pass-99'}, format='json').status_code == 400
    assert mail.outbox[-1].subject == 'Your password was changed'
    kinds = list(EmailLog.objects.order_by('created_at').values_list('kind', flat=True))
    assert kinds == ['password_reset', 'password_changed']
    assert EmailLog.objects.filter(school=pr['s']).count() == 2


def _client_token(refresh):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return c


@pytest.mark.django_db
def test_reset_requests_are_limited(pr):
    anyone = APIClient()
    for _ in range(8):
        anyone.post(f'{S}/password-reset/', {'email': 'amy@hillside.test'}, format='json')
    assert len(mail.outbox) == 5


@pytest.mark.django_db
def test_changing_password_sends_a_notice(pr):
    amy = _client(pr['amy'])
    r = amy.post('/api/v1/auth/settings/change-password/', {'old_password': 'Old-password-1', 'new_password': 'Brand-new-pass-7'}, format='json')
    assert r.status_code == 200 and mail.outbox[-1].subject == 'Your password was changed'


@pytest.mark.django_db
def test_email_verification_and_the_log(pr, monkeypatch):
    amy = _client(pr['amy'])
    r = amy.post(f'{S}/verify-email/send/', {'origin': 'https://app.example.test'}, format='json')
    assert r.status_code == 200 and 'We sent a link' in r.json()['message']
    token = re.search(r'verify-email\?token=(\S+)', mail.outbox[-1].body).group(1)
    anyone = APIClient()
    assert anyone.post(f'{S}/verify-email/confirm/', {'token': token + 'x'}, format='json').status_code == 400
    assert anyone.post(f'{S}/verify-email/confirm/', {'token': token}, format='json').status_code == 200
    pr['amy'].refresh_from_db()
    assert pr['amy'].email_verified and amy.get(f'{S}/me/').json()['email_verified']
    assert amy.post(f'{S}/verify-email/send/', format='json').json()['verified'] is True
    # An old link for an address that has since changed is refused.
    stale = signing.TimestampSigner(salt='email-verification').sign(f'{pr["amy"].pk}:old@hillside.test')
    assert anyone.post(f'{S}/verify-email/confirm/', {'token': stale}, format='json').status_code == 400
    # A mail server failure is logged, not raised.
    def boom(*a, **k):
        raise ConnectionError('SMTP refused')
    monkeypatch.setattr('django.core.mail.EmailMultiAlternatives.send', boom)
    anyone.post(f'{S}/password-reset/', {'email': 'office@hillside.test'}, format='json')
    failed = EmailLog.objects.filter(status='failed').first()
    assert failed and 'SMTP refused' in failed.error
    log = pr['office'].get(f'{S}/emails/?status=failed').json()
    assert log['total'] == 1 and log['failed_week'] == 1
    assert amy.get(f'{S}/emails/').status_code == 403
