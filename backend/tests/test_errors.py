"""Error tracking and the version check (P4)."""
import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.errors import capture
from services.core.errors.models import ErrorGroup
from tests.conftest import UserFactory


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def er(db, settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    cache.clear()
    owner = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    someone = UserFactory(email='someone@school.test')
    return dict(owner=_client(owner), someone=_client(someone))


@pytest.mark.django_db
def test_server_errors_are_grouped_and_alerted(er, rf):
    def crash(n):
        try:
            raise KeyError(f'student {n} missing')
        except KeyError:
            capture.on_request_exception(None, request=rf.get(f'/api/v1/students/{n}/'))

    crash(1)
    crash(2)  # same error, different id: one group
    g = ErrorGroup.objects.get()
    assert g.source == 'backend' and g.kind == 'KeyError' and g.count == 2 and 'test_errors.py' in g.location
    assert 'Traceback' in g.samples[0]['stack'] and g.samples[0]['path'] == '/api/v1/students/2/'
    assert len(mail.outbox) == 1 and 'KeyError' in mail.outbox[0].subject and mail.outbox[0].to == ['owner@platform.test']
    # Resolved, then back: open again and alerted again (at most hourly).
    er['owner'].post(f'/api/v1/errors/{g.id}/', {'status': 'resolved'}, format='json')
    from django.utils import timezone
    ErrorGroup.objects.filter(pk=g.pk).update(alerted_at=timezone.now() - timezone.timedelta(hours=2))
    crash(3)
    g.refresh_from_db()
    assert g.status == 'open' and g.count == 3 and len(mail.outbox) == 2 and 'came back' in mail.outbox[1].body


@pytest.mark.django_db
def test_browser_errors_and_who_sees_them(er):
    anyone = APIClient()
    assert anyone.post('/api/v1/errors/client/', {}, format='json').status_code == 400
    body = {'message': "Cannot read properties of undefined (reading 'name')", 'stack': 'TypeError: x\n    at StudentCard (app.js:10:5)',
            'url': '/education/students', 'kind': 'TypeError'}
    assert anyone.post('/api/v1/errors/client/', body, format='json').status_code == 204
    er['someone'].post('/api/v1/errors/client/', body, format='json')
    g = ErrorGroup.objects.get()
    assert g.source == 'frontend' and g.count == 2 and g.location.startswith('at StudentCard') and g.last_user == 'someone@school.test'
    # Limited per address.
    for _ in range(70):
        anyone.post('/api/v1/errors/client/', {'message': 'spam', 'kind': 'Error'}, format='json')
    assert ErrorGroup.objects.get(message='spam').count < 60
    assert er['someone'].get('/api/v1/errors/').status_code == 403
    listed = er['owner'].get('/api/v1/errors/').json()
    assert listed['open'] == 2 and {x['source'] for x in listed['groups']} == {'frontend'}
    detail = er['owner'].get(f'/api/v1/errors/{g.id}/').json()['group']
    assert detail['samples'][0]['path'] == '/education/students'
    assert er['owner'].post(f'/api/v1/errors/{g.id}/', {'status': 'nope'}, format='json').status_code == 400


@pytest.mark.django_db
def test_version_says_which_commit_runs(er, monkeypatch):
    monkeypatch.setenv('RENDER_GIT_COMMIT', 'abc123def4567890')
    r = APIClient().get('/api/v1/health/version/').json()
    assert r['commit'] == 'abc123def4567890' and r['short'] == 'abc123def456' and r['started_at']
