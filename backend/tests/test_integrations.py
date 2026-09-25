"""Integrations: the hub, encrypted settings, the school's own email, Microsoft sign-in and Google Classroom (Phase 17).

Outside services are replaced with fakes; what is tested is our side: checks, redirects, encryption and matching."""
import base64
import json
import time
from urllib.parse import parse_qs, urlparse

import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.tenants.context import use_tenant
from services.core.tenants.models import TenantMembership
from services.education.academics.models import SchoolClass
from services.education.integrations import api as integ
from services.education.integrations.email_backend import TenantEmailBackend, school_smtp
from services.education.integrations.models import ClassroomLink, Integration
from tests.conftest import SchoolFactory, StudentFactory, UserFactory

URL = '/api/v1/auth/integrations'
APP = 'https://app.hillside.test'


def _client(user=None):
    c = APIClient()
    if user:
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


def _jwt(claims):
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('=')  # noqa: E731
    return f"{enc({'alg': 'RS256'})}.{enc(claims)}.sig"


@pytest.fixture
def it(db, settings):
    settings.FRONTEND_ORIGINS = APP
    s = SchoolFactory(name='Hillside School')
    admin = UserFactory(email='office@hillside.test', full_name='Office Admin')
    TenantMembership.objects.create(user=admin, school=s, role='admin', is_primary=True)
    teacher = UserFactory(email='khan@hillside.edu.pk', full_name='Mr Khan')
    TenantMembership.objects.create(user=teacher, school=s, role='teacher', is_primary=True)
    return dict(s=s, admin=admin, teacher=teacher, office=_client(admin))


@pytest.mark.django_db
def test_hub_and_settings_keep_secrets_secret(it):
    d = it
    hub = d['office'].get(f'{URL}/').json()
    assert [i['provider'] for i in hub['integrations']] == ['microsoft', 'google_classroom', 'email']
    assert 'payments' in hub['elsewhere'] and hub['elsewhere']['calendar']['enabled']
    assert _client(d['teacher']).get(f'{URL}/').status_code == 403
    # Microsoft needs a client ID, a secret and at least one domain.
    bad = d['office'].patch(f'{URL}/microsoft/', {'enabled': True, 'client_id': 'abc'}, format='json')
    assert bad.status_code == 400
    ok = d['office'].patch(f'{URL}/microsoft/', {'enabled': True, 'client_id': 'app-123', 'client_secret': 'SuperSecret!',
                                                 'allowed_domains': '@Hillside.edu.pk, staff.hillside.edu.pk'}, format='json').json()
    assert ok['ready'] and ok['secrets_set'] == {'client_secret': True} and 'SuperSecret!' not in json.dumps(ok)
    assert ok['config']['allowed_domains'] == ['hillside.edu.pk', 'staff.hillside.edu.pk']
    assert ok['redirect_uri'].endswith('/api/v1/auth/integrations/microsoft/callback/')
    row = Integration.objects.get(provider='microsoft')
    assert row.secret_blob and 'SuperSecret' not in row.secret_blob  # encrypted at rest
    # Saving again with a blank secret keeps it.
    d['office'].patch(f'{URL}/microsoft/', {'client_secret': ''}, format='json')
    assert integ.unseal(Integration.objects.get(provider='microsoft').secret_blob)['client_secret'] == 'SuperSecret!'
    # Two schools can't claim the same email domain.
    other = SchoolFactory(name='Other School')
    boss = UserFactory(email='boss@other.test')
    TenantMembership.objects.create(user=boss, school=other, role='admin', is_primary=True)
    clash = _client(boss).patch(f'{URL}/microsoft/', {'enabled': True, 'client_id': 'x', 'client_secret': 'y',
                                                      'allowed_domains': 'hillside.edu.pk'}, format='json')
    assert clash.status_code == 400 and 'Another school' in clash.json()['error']
    # Disconnect wipes the secrets.
    gone = d['office'].delete(f'{URL}/microsoft/').json()
    assert gone['enabled'] is False and gone['secrets_set'] == {'client_secret': False}


@pytest.mark.django_db
def test_school_email_goes_through_its_own_server(it, settings):
    d = it
    assert school_smtp(d['s']) == (None, None)
    d['office'].patch(f'{URL}/email/', {'enabled': True, 'host': 'smtp.hillside.test', 'port': 465, 'use_ssl': True,
                                        'username': 'office@hillside.test', 'password': 'mail-pass', 'from_name': 'Hillside School'}, format='json')
    conn, sender = school_smtp(d['s'])
    assert (conn.host, conn.port, conn.username, conn.password, conn.use_ssl, conn.use_tls) == \
        ('smtp.hillside.test', 465, 'office@hillside.test', 'mail-pass', True, False)
    assert sender == 'Hillside School <office@hillside.test>'
    # Inside the school, mail uses the school's server and sender; elsewhere the server default.
    from django.core.mail.backends.locmem import EmailBackend as LocMem
    sent = []

    class Recorder(LocMem):
        def send_messages(self, msgs):
            sent.extend(msgs)
            return len(msgs)

    import services.education.integrations.email_backend as eb
    orig = eb.school_smtp
    eb.school_smtp = lambda school: (Recorder(), 'Hillside School <office@hillside.test>') if school == d['s'] else (None, None)
    settings.FALLBACK_EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    try:
        from django.core.mail import EmailMessage
        with use_tenant(d['s']):
            TenantEmailBackend().send_messages([EmailMessage('Hi', 'Body', None, ['p@example.com'])])
        assert sent[0].from_email == 'Hillside School <office@hillside.test>'
        mail.outbox = []
        TenantEmailBackend().send_messages([EmailMessage('Hi', 'Body', None, ['p@example.com'])])
        assert len(sent) == 1 and len(mail.outbox) == 1  # no school → the default
    finally:
        eb.school_smtp = orig
    # The test button reports the server's answer.
    r = d['office'].post(f'{URL}/email/test/', {'to': 'me@example.com'}, format='json')
    assert r.status_code == 400 and 'mail server said' in r.json()['error']
    assert Integration.objects.get(provider='email').last_error


@pytest.mark.django_db
def test_sign_in_with_microsoft(it, monkeypatch):
    d = it
    d['office'].patch(f'{URL}/microsoft/', {'enabled': True, 'client_id': 'app-123', 'client_secret': 'shh',
                                            'directory': 'tenant-guid', 'allowed_domains': 'hillside.edu.pk'}, format='json')
    anon = _client()
    assert anon.post(f'{URL}/microsoft/start/', {'email': 'khan@gmail.com'}, format='json', HTTP_ORIGIN=APP).status_code == 404
    assert anon.post(f'{URL}/microsoft/start/', {'email': 'khan@hillside.edu.pk'}, format='json', HTTP_ORIGIN='https://evil.test').status_code == 403
    start = anon.post(f'{URL}/microsoft/start/', {'email': 'khan@hillside.edu.pk'}, format='json', HTTP_ORIGIN=APP).json()
    q = parse_qs(urlparse(start['url']).query)
    assert start['url'].startswith('https://login.microsoftonline.com/tenant-guid/oauth2/v2.0/authorize')
    assert q['client_id'] == ['app-123'] and q['login_hint'] == ['khan@hillside.edu.pk'] and start['school'] == 'Hillside School'
    state, nonce = q['state'][0], q['nonce'][0]

    def token_reply(**claims):
        base = {'aud': 'app-123', 'nonce': nonce, 'exp': time.time() + 300, 'tid': 'tenant-guid', 'preferred_username': 'Khan@Hillside.edu.pk'}
        monkeypatch.setattr(integ, 'http_post_form', lambda url, data: {'id_token': _jwt({**base, **claims})})

    def callback():
        r = anon.get(f'{URL}/microsoft/callback/', {'code': 'abc', 'state': state})
        assert r.status_code == 302 and r['Location'].startswith(f'{APP}/login?')
        return parse_qs(urlparse(r['Location']).query)

    token_reply(nonce='someone-else')
    assert 'reused sign-in' in callback()['sso_error'][0]
    token_reply(tid='another-org')
    assert 'another organisation' in callback()['sso_error'][0]
    token_reply()
    code = callback()['sso'][0]
    login = anon.post(f'{URL}/sso/exchange/', {'code': code}, format='json')
    assert login.status_code == 200 and login.json()['access']
    assert anon.post(f'{URL}/sso/exchange/', {'code': code}, format='json').status_code == 401  # one use only
    # A school address with no account here, or an account from another school, is turned away.
    token_reply(preferred_username='new.person@hillside.edu.pk')
    assert 'No account' in callback()['sso_error'][0]
    outsider = UserFactory(email='visitor@hillside.edu.pk')
    TenantMembership.objects.create(user=outsider, school=SchoolFactory(), role='teacher')
    token_reply(preferred_username='visitor@hillside.edu.pk')
    assert 'No account' in callback()['sso_error'][0]
    # Students of the school can use it too.
    StudentFactory(tenant=d['s'], full_name='Sara Ali', email='sara@hillside.edu.pk', father_name='', mother_name='', guardian_name='', guardian_phone='')
    token_reply(preferred_username='sara@hillside.edu.pk')
    assert callback().get('sso')
    # A tampered state is refused outright.
    assert anon.get(f'{URL}/microsoft/callback/', {'code': 'abc', 'state': state + 'x'}).status_code == 400


@pytest.mark.django_db
def test_google_classroom_connect_list_link_and_compare(it, monkeypatch):
    d = it
    office = d['office']
    assert 'client ID' in office.post(f'{URL}/google-classroom/connect/', {}, format='json', HTTP_ORIGIN=APP).json()['error']
    office.patch(f'{URL}/google-classroom/', {'client_id': 'gid.apps.googleusercontent.com', 'client_secret': 'gsecret'}, format='json')
    url = office.post(f'{URL}/google-classroom/connect/', {}, format='json', HTTP_ORIGIN=APP).json()['url']
    q = parse_qs(urlparse(url).query)
    assert 'classroom.rosters.readonly' in q['scope'][0] and q['access_type'] == ['offline']
    monkeypatch.setattr(integ, 'http_post_form', lambda url, data: {'refresh_token': 'r-1', 'access_token': 'a-1',
                                                                     'id_token': _jwt({'email': 'office@hillside.test'})})
    back = _client().get(f'{URL}/google-classroom/callback/', {'code': 'c', 'state': q['state'][0]})
    assert back.status_code == 302 and 'connected=google_classroom' in back['Location']
    row = Integration.objects.get(provider='google_classroom')
    assert row.enabled and integ.unseal(row.secret_blob)['refresh_token'] == 'r-1' and row.config['google_account'] == 'office@hillside.test'

    with use_tenant(d['s']):
        c6 = SchoolClass.objects.create(tenant=d['s'], name='Grade 6', code='G6', grade_level=6)
        c7 = SchoolClass.objects.create(tenant=d['s'], name='Grade 7', code='G7', grade_level=7)
    kw = dict(father_name='', mother_name='', guardian_name='', guardian_phone='')
    StudentFactory(tenant=d['s'], current_class=c6, full_name='Sara Ali', email='sara@hillside.edu.pk', **kw)
    StudentFactory(tenant=d['s'], current_class=c6, full_name='No Email', email='', **kw)
    StudentFactory(tenant=d['s'], current_class=c7, full_name='Omar Ali', email='omar@hillside.edu.pk', **kw)
    pages = {
        '/courses': [{'courses': [{'id': 'C1', 'name': 'Maths 6', 'section': 'A'}], 'nextPageToken': 'p2'},
                     {'courses': [{'id': 'C2', 'name': 'Science 6'}]}],
        '/courses/C1/students': [{'students': [
            {'userId': '1', 'profile': {'emailAddress': 'Sara@hillside.edu.pk', 'name': {'fullName': 'Sara Ali'}}},
            {'userId': '2', 'profile': {'emailAddress': 'omar@hillside.edu.pk', 'name': {'fullName': 'Omar Ali'}}},
            {'userId': '3', 'profile': {'emailAddress': 'guest@gmail.com', 'name': {'fullName': 'A Guest'}}}]}],
        '/courses/C1/teachers': [{'teachers': [{'profile': {'name': {'fullName': 'Mr Khan'}}}]}],
    }
    calls = {}

    def fake_get(url, token, params=None):
        key = url.split('/v1', 1)[1]
        n = calls.get(key, 0)
        calls[key] = n + 1
        assert token == 'a-1'
        return pages[key][n]

    monkeypatch.setattr(integ, 'http_get_json', fake_get)
    courses = office.get(f'{URL}/google-classroom/courses/').json()
    assert [c['name'] for c in courses] == ['Maths 6', 'Science 6']  # both pages
    assert office.post(f'{URL}/google-classroom/courses/C1/compare/', {}, format='json').status_code == 400  # not linked yet
    office.post(f'{URL}/google-classroom/courses/C1/link/', {'class_id': str(c6.id), 'course_name': 'Maths 6'}, format='json')
    rep = office.post(f'{URL}/google-classroom/courses/C1/compare/', {}, format='json').json()
    assert rep['in_both'] == ['Sara Ali']
    assert {r['name']: r['note'] for r in rep['only_in_classroom']} == {'A Guest': 'not a student here', 'Omar Ali': 'in Grade 7'}
    assert rep['only_in_class'] == [{'name': 'No Email', 'email': '', 'note': 'no email on record'}]
    assert rep['teachers'] == ['Mr Khan']
    assert ClassroomLink.objects.get(course_id='C1').last_report['in_both'] == ['Sara Ali']
    assert _client(d['teacher']).get(f'{URL}/google-classroom/courses/').status_code == 403
