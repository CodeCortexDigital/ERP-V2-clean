"""Secrets and default passwords (P7)."""
import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.backup import portable
from services.core.security import setup_checks
from services.education.integrations import secrets as int_secrets
from tests.conftest import UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def mailbox(settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    cache.clear()


@pytest.mark.django_db
def test_demo_passwords_cannot_be_chosen(mailbox):
    user = UserFactory(email='t@school.test')
    user.set_password('Mine#Strong2026'); user.save()
    r = _client(user).post('/api/v1/auth/settings/change-password/', {'old_password': 'Mine#Strong2026', 'new_password': 'Admin@123'},
                           format='json')
    assert r.status_code == 400 and 'publicly known' in r.json()['error']
    r = _client(user).post('/api/v1/auth/settings/change-password/', {'old_password': 'Mine#Strong2026', 'new_password': 'teacher123'},
                           format='json')
    assert r.status_code == 400


@pytest.mark.django_db
def test_live_site_refuses_sign_in_with_a_demo_password(settings, mailbox):
    user = UserFactory(email='admin@school.test', is_superuser=True, is_staff=True)
    user.set_password('Admin@123'); user.save()
    body = {'email': 'admin@school.test', 'password': 'Admin@123'}
    settings.APP_ENV = 'production'
    r = APIClient().post('/api/v1/auth/login/', body, format='json')
    assert r.status_code == 403 and r.json()['known_password'] and 'access' not in r.json()
    assert len(mail.outbox) == 1 and 'reset' in mail.outbox[0].body.lower()  # the link to choose their own
    # On a developer's computer the demo works as documented in the README.
    settings.APP_ENV = 'development'
    assert APIClient().post('/api/v1/auth/login/', body, format='json').status_code == 200


@pytest.mark.django_db
def test_demo_tooling_refuses_on_the_live_site(settings, monkeypatch):
    settings.APP_ENV = 'production'
    with pytest.raises(CommandError, match='must not run on the live site'):
        call_command('seed_demo')
    with pytest.raises(CommandError, match='must not run on the live site'):
        call_command('seed_sample_users')
    with pytest.raises(CommandError):
        call_command('sync_student_accounts')  # its default password is a demo one
    monkeypatch.setenv('ADMIN_EMAIL', 'first@school.test')
    monkeypatch.setenv('ADMIN_PASSWORD', 'Admin@123')
    call_command('create_admin')
    assert not get_user_model().objects.filter(email='first@school.test').exists()
    monkeypatch.setenv('ADMIN_PASSWORD', 'A-long-unguessable-9731')
    call_command('create_admin')
    assert get_user_model().objects.filter(email='first@school.test', is_superuser=True).exists()


def test_integration_secrets_survive_a_key_change():
    with override_settings(SECRET_KEY='old-key-' + 'x' * 40, SECRET_KEY_FALLBACKS=[]):
        blob = int_secrets.seal({'smtp_password': 'hunter2'})
    with override_settings(SECRET_KEY='new-key-' + 'y' * 40, SECRET_KEY_FALLBACKS=['old-key-' + 'x' * 40]):
        assert int_secrets.unseal(blob) == {'smtp_password': 'hunter2'}
        fresh = int_secrets.reseal(blob)
    with override_settings(SECRET_KEY='new-key-' + 'y' * 40, SECRET_KEY_FALLBACKS=[]):
        assert int_secrets.unseal(fresh) == {'smtp_password': 'hunter2'}
        assert int_secrets.unseal(blob) == {}  # the old key is gone: the old blob can't be read


@pytest.mark.django_db
def test_backups_made_with_the_old_key_can_still_be_read(settings, tmp_path, monkeypatch):
    settings.MEDIA_ROOT = tmp_path
    monkeypatch.delenv('BACKUP_ENCRYPTION_KEY', raising=False)
    settings.SECRET_KEY, settings.SECRET_KEY_FALLBACKS = 'old-key-' + 'x' * 40, []
    log = portable.create('before the change')
    assert log.status == 'success', log.error_message
    settings.SECRET_KEY, settings.SECRET_KEY_FALLBACKS = 'new-key-' + 'y' * 40, ['old-key-' + 'x' * 40]
    assert portable.read(log)[:1] == b'['
    # A dedicated backup key, with the old derived key still readable.
    from cryptography.fernet import Fernet

    monkeypatch.setenv('BACKUP_ENCRYPTION_KEY', Fernet.generate_key().decode())
    assert portable.read(log)[:1] == b'['


@pytest.mark.django_db
def test_live_site_settings_check(settings, monkeypatch, mailbox):
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    owner.set_password('Admin@123'); owner.save()
    UserFactory(email='teacher@code.com')
    monkeypatch.setenv('ADMIN_PASSWORD', 'something')
    monkeypatch.delenv('FRONTEND_ORIGINS', raising=False)
    assert _client(UserFactory(email='x@school.test')).get('/api/v1/security/setup-checks/').status_code == 403
    data = _client(owner).get('/api/v1/security/setup-checks/').json()
    by = {c['key']: c for c in data['checks']}
    assert not by['demo_accounts']['ok'] and 'teacher@code.com' in by['demo_accounts']['advice']
    assert not by['known_passwords']['ok'] and 'owner@platform.test' in by['known_passwords']['advice']
    assert not by['admin_password_env']['ok'] and not by['frontend_origins']['ok']
    assert data['failing'] >= 4
    monkeypatch.setenv('FRONTEND_ORIGINS', 'https://erp.school.pk')
    assert {c['key']: c for c in setup_checks.checks()}['frontend_origins']['ok']
