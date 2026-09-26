"""Integrations API (mounted at ``/api/v1/auth/integrations/``).

- ``/``                                   office: every integration and whether it is working
- ``<provider>/``                         office: PATCH settings (secrets are write-only), DELETE to disconnect
- ``email/test/``                         office: send a test email through the school's own mail server
- ``microsoft/start/``                    anyone: {email} → the Microsoft sign-in address for that person's school
- ``microsoft/callback/``                 Microsoft sends the user back here; we sign them in and return to the app
- ``sso/exchange/``                       the app swaps the one-time code for its usual sign-in tokens
- ``google-classroom/connect/``           office: the Google consent address
- ``google-classroom/callback/``          Google sends the office user back here
- ``google-classroom/courses/``           office: the school's active Classroom courses and which class each is linked to
- ``google-classroom/courses/<id>/link/`` office: {class_id} link a course to a class ('' to unlink)
- ``google-classroom/courses/<id>/compare/`` office: who is in the Classroom course vs. the class
"""
from __future__ import annotations

import base64
import json
import os
import secrets as pysecrets
import time
from urllib.parse import urlencode, urlparse

import requests
from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin

from .models import ClassroomLink, Integration
from .secrets import seal, unseal

MS_AUTHORITY = 'https://login.microsoftonline.com'
GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
CLASSROOM_API = 'https://classroom.googleapis.com/v1'
CLASSROOM_SCOPES = ('https://www.googleapis.com/auth/classroom.courses.readonly '
                    'https://www.googleapis.com/auth/classroom.rosters.readonly '
                    'https://www.googleapis.com/auth/classroom.profile.emails')
PUBLIC = {  # settings shown to the office; everything else in config stays on the server
    'microsoft': ('directory', 'client_id', 'allowed_domains'),
    'google_classroom': ('client_id', 'google_account'),
    'email': ('host', 'port', 'use_tls', 'use_ssl', 'username', 'from_email', 'from_name'),
}
SECRET_FIELDS = {'microsoft': ('client_secret',), 'google_classroom': ('client_secret',), 'email': ('password',)}


def _err(msg, code=400):
    return Response({'error': msg}, status=code)


def _school(request):
    return getattr(request, 'tenant', None)


def _row(school, provider, create=False):
    row = Integration.all_objects.filter(tenant=school, provider=provider).first()
    if row is None and create:
        row = Integration.all_objects.create(tenant=school, provider=provider)
    return row


# ---------------------------------------------------------------------------
# Outside calls (one place, easy to replace in tests)
# ---------------------------------------------------------------------------

class OutsideError(Exception):
    pass


def http_post_form(url: str, data: dict) -> dict:
    try:
        r = requests.post(url, data=data, timeout=20)
        body = r.json()
    except (requests.RequestException, ValueError) as exc:
        raise OutsideError(f'Could not reach {urlparse(url).netloc}: {exc}') from exc
    if r.status_code >= 400:
        raise OutsideError(body.get('error_description') or body.get('error') or f'HTTP {r.status_code}')
    return body


def http_get_json(url: str, token: str, params: dict | None = None) -> dict:
    try:
        r = requests.get(url, headers={'Authorization': f'Bearer {token}'}, params=params or {}, timeout=20)
        body = r.json()
    except (requests.RequestException, ValueError) as exc:
        raise OutsideError(f'Could not reach {urlparse(url).netloc}: {exc}') from exc
    if r.status_code >= 400:
        raise OutsideError((body.get('error') or {}).get('message') if isinstance(body.get('error'), dict) else f'HTTP {r.status_code}')
    return body


def _jwt_claims(token: str) -> dict:
    """The claims of an ID token we received straight from the provider's token endpoint over TLS."""
    try:
        part = token.split('.')[1]
        return json.loads(base64.urlsafe_b64decode(part + '=' * (-len(part) % 4)))
    except (IndexError, ValueError):
        return {}


# ---------------------------------------------------------------------------
# Where the app lives (sign-in must only ever send people back to our own app)
# ---------------------------------------------------------------------------

def allowed_origins() -> list[str]:
    raw = getattr(settings, 'FRONTEND_ORIGINS', None) or os.environ.get('FRONTEND_ORIGINS', '')
    items = raw if isinstance(raw, (list, tuple)) else [x.strip() for x in raw.split(',')]
    return [x.rstrip('/') for x in items if x]


def safe_origin(origin: str) -> str | None:
    origin = (origin or '').rstrip('/')
    if not origin:
        return None
    if origin in allowed_origins():
        return origin
    host = urlparse(origin).hostname or ''
    if settings.DEBUG and host in ('localhost', '127.0.0.1'):
        return origin
    return None


def _callback_url(request, name: str) -> str:
    base = os.environ.get('PUBLIC_API_URL', '').rstrip('/')
    path = f'/api/v1/auth/integrations/{name}/callback/'
    return f'{base}{path}' if base else request.build_absolute_uri(path)


# ---------------------------------------------------------------------------
# The hub
# ---------------------------------------------------------------------------

def _payload(provider: str, row: Integration | None, request) -> dict:
    cfg = row.config if row else {}
    secret = unseal(row.secret_blob) if row else {}
    out = {'provider': provider, 'label': dict(Integration.PROVIDERS)[provider], 'enabled': bool(row and row.enabled),
           'config': {k: cfg.get(k) for k in PUBLIC[provider]},
           'secrets_set': {k: bool(secret.get(k)) for k in SECRET_FIELDS[provider]},
           'connected_at': row.connected_at.isoformat() if row and row.connected_at else None,
           'last_used_at': row.last_used_at.isoformat() if row and row.last_used_at else None,
           'last_error': row.last_error if row else ''}
    if provider == 'microsoft':
        out['redirect_uri'] = _callback_url(request, 'microsoft')
        out['ready'] = bool(out['enabled'] and cfg.get('client_id') and secret.get('client_secret') and cfg.get('allowed_domains'))
    elif provider == 'google_classroom':
        out['redirect_uri'] = _callback_url(request, 'google-classroom')
        out['connected'] = bool(secret.get('refresh_token'))
        out['uses_server_app'] = not cfg.get('client_id') and bool(os.environ.get('GOOGLE_OAUTH_CLIENT_ID'))
        out['ready'] = bool(out['enabled'] and out['connected'])
    else:
        out['ready'] = bool(out['enabled'] and cfg.get('host'))
    return out


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hub(request):
    """Every integration the school can use, including those set up elsewhere (payments, SMS, calendar)."""
    from services.core.accounts.google_identity import google_sign_in_enabled
    from services.education.communication.models import SmsConfig
    from services.education.finance.models import PaymentGatewayConfig

    if not is_admin(request.user):
        return _err('Only the office can manage integrations.', 403)
    school = _school(request)
    rows = {r.provider: r for r in Integration.objects.all()}
    sms = SmsConfig.objects.first()
    gateways = [{'provider': g.provider, 'label': g.get_provider_display(), 'active': g.is_active}
                for g in PaymentGatewayConfig.objects.filter(tenant=school)]
    return Response({
        'integrations': [_payload(p, rows.get(p), request) for p, _ in Integration.PROVIDERS],
        'elsewhere': {
            'google_sign_in': {'enabled': google_sign_in_enabled(), 'note': 'Sign in with Google for every account (set on the server).'},
            'sms': {'enabled': bool(sms and getattr(sms, 'is_active', True) and getattr(sms, 'account_sid', '')),
                    'where': '/education/communication/sms'},
            'payments': {'gateways': gateways, 'where': '/education/fees/online-payments'},
            'calendar': {'enabled': True, 'where': '/calendar',
                         'note': 'Everyone has a private link for Google Calendar, Apple Calendar or Outlook.'},
            'server_email': {'enabled': bool(settings.EMAIL_HOST) if hasattr(settings, 'EMAIL_HOST') else False},
        },
        'school': {'name': school.name if school else '', 'code': getattr(school, 'subdomain', '') if school else ''},
    })


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def configure(request, provider):
    if not is_admin(request.user):
        return _err('Only the office can manage integrations.', 403)
    provider = provider.replace('-', '_')
    if provider not in PUBLIC:
        return _err('Unknown integration.', 404)
    school = _school(request)
    row = _row(school, provider, create=True)
    if request.method == 'DELETE':
        row.enabled, row.secret_blob, row.connected_at, row.last_error = False, '', None, ''
        row.save()
        if provider == 'google_classroom':
            ClassroomLink.objects.all().delete()
        return Response(_payload(provider, row, request))
    cfg = dict(row.config)
    for k in PUBLIC[provider]:
        if k not in request.data:
            continue
        v = request.data[k]
        if k == 'allowed_domains':
            v = [d.strip().lower().lstrip('@') for d in (v if isinstance(v, list) else str(v).split(',')) if d.strip()]
        elif k in ('use_tls', 'use_ssl'):
            v = str(v).lower() in ('1', 'true', 'yes', 'on')
        elif k == 'port':
            try:
                v = int(v) if v not in (None, '') else 587
            except (TypeError, ValueError):
                return _err('The port must be a number, e.g. 587.')
        elif k == 'google_account':
            continue  # filled in when Google is connected
        else:
            v = str(v or '').strip()[:300]
        cfg[k] = v
    secret = unseal(row.secret_blob)
    for k in SECRET_FIELDS[provider]:
        if request.data.get(k):  # blank = keep what is stored
            secret[k] = str(request.data[k])
    if 'enabled' in request.data:
        row.enabled = str(request.data['enabled']).lower() in ('1', 'true', 'yes', 'on')
    if provider == 'microsoft' and row.enabled:
        if not cfg.get('client_id') or not secret.get('client_secret'):
            return _err('Enter the application (client) ID and a client secret from the Microsoft Entra admin centre.')
        if not cfg.get('allowed_domains'):
            return _err('Enter the email domain(s) of your school accounts, e.g. myschool.edu.pk.')
        cfg.setdefault('directory', 'organizations')
        taken = Integration.all_objects.filter(provider='microsoft', enabled=True).exclude(tenant=school)
        for other in taken:
            clash = set(other.config.get('allowed_domains') or []) & set(cfg['allowed_domains'])
            if clash:
                return _err(f'Another school already signs in with {", ".join(sorted(clash))}.')
    if provider == 'email' and row.enabled and not cfg.get('host'):
        return _err('Enter the mail server, e.g. smtp.gmail.com.')
    row.config, row.secret_blob = cfg, seal(secret)
    row.connected_by = request.user
    row.connected_at = row.connected_at or timezone.now()
    row.save()
    return Response(_payload(provider, row, request))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_test(request):
    from django.core.mail import EmailMessage

    from .email_backend import school_smtp

    if not is_admin(request.user):
        return _err('Only the office can do this.', 403)
    school = _school(request)
    conn, sender = school_smtp(school)
    if conn is None:
        return _err('Turn on the school email and enter the mail server first.')
    to = str(request.data.get('to') or request.user.email).strip()
    row = _row(school, 'email')
    try:
        EmailMessage('Test email from your school system', f'This came through {row.config.get("host")}. Email is working.',
                     sender, [to], connection=conn).send()
    except Exception as exc:  # SMTP login, TLS, network…
        row.last_error = str(exc)[:500]
        row.save(update_fields=['last_error'])
        return _err(f'The mail server said: {exc}')
    row.last_error, row.last_used_at = '', timezone.now()
    row.save(update_fields=['last_error', 'last_used_at'])
    return Response({'sent_to': to})


# ---------------------------------------------------------------------------
# Microsoft 365 / Entra ID sign-in
# ---------------------------------------------------------------------------

def _belongs(user, school) -> bool:
    from services.core.tenants.models import TenantMembership
    from services.education.students.models import Student

    if TenantMembership.objects.filter(user=user, school=school, is_active=True).exists():
        return True
    if user.email and Student.all_objects.filter(tenant=school, email__iexact=user.email, is_active=True).exists():
        return True
    pp = getattr(user, 'parent_profile', None)
    return bool(pp and pp.linked_students.filter(tenant=school).exists())


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def microsoft_start(request):
    """{email}: which school uses Microsoft for this email's domain, and where to send the browser."""
    email = str(request.data.get('email') or '').strip().lower()
    if '@' not in email:
        return _err('Enter your school email address.')
    domain = email.split('@', 1)[1]
    origin = safe_origin(request.headers.get('Origin') or request.data.get('origin') or '')
    if origin is None:
        return _err('Microsoft sign-in is not available from this address.', 403)
    row = next((r for r in Integration.all_objects.filter(provider='microsoft', enabled=True).select_related('tenant')
                if domain in (r.config.get('allowed_domains') or [])), None)
    secret = unseal(row.secret_blob) if row else {}
    if row is None or not secret.get('client_secret'):
        return _err('Your school has not turned on "Sign in with Microsoft". Use your password instead.', 404)
    nonce = pysecrets.token_urlsafe(16)
    state = signing.dumps({'s': str(row.tenant_id), 'n': nonce, 'o': origin}, salt='sso-microsoft')
    q = {'client_id': row.config['client_id'], 'response_type': 'code', 'redirect_uri': _callback_url(request, 'microsoft'),
         'response_mode': 'query', 'scope': 'openid email profile', 'state': state, 'nonce': nonce,
         'login_hint': email, 'prompt': 'select_account'}
    return Response({'url': f"{MS_AUTHORITY}/{row.config.get('directory') or 'organizations'}/oauth2/v2.0/authorize?{urlencode(q)}",
                     'school': row.tenant.name})


def _back(origin, **params):
    return HttpResponseRedirect(f'{origin}/login?{urlencode(params)}')


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def microsoft_callback(request):
    from services.core.accounts.models import User

    try:
        st = signing.loads(request.query_params.get('state') or '', salt='sso-microsoft', max_age=600)
    except signing.BadSignature:
        return Response({'error': 'This sign-in link has expired. Please start again.'}, status=400)
    origin = safe_origin(st.get('o'))
    if origin is None:
        return Response({'error': 'Unknown app address.'}, status=400)
    if request.query_params.get('error'):
        return _back(origin, sso_error=request.query_params.get('error_description') or 'Microsoft sign-in was cancelled.')
    row = Integration.all_objects.filter(tenant_id=st['s'], provider='microsoft', enabled=True).select_related('tenant').first()
    if row is None:
        return _back(origin, sso_error='Microsoft sign-in has been turned off for your school.')
    cfg, secret = row.config, unseal(row.secret_blob)
    try:
        tokens = http_post_form(f"{MS_AUTHORITY}/{cfg.get('directory') or 'organizations'}/oauth2/v2.0/token", {
            'client_id': cfg['client_id'], 'client_secret': secret.get('client_secret', ''),
            'code': request.query_params.get('code', ''), 'redirect_uri': _callback_url(request, 'microsoft'),
            'grant_type': 'authorization_code', 'scope': 'openid email profile'})
    except OutsideError as exc:
        row.last_error = str(exc)[:500]
        row.save(update_fields=['last_error'])
        return _back(origin, sso_error=f'Microsoft did not accept the sign-in: {exc}')
    claims = _jwt_claims(tokens.get('id_token', ''))
    directory = cfg.get('directory') or 'organizations'
    problems = []
    if claims.get('aud') != cfg['client_id']:
        problems.append('wrong application')
    if claims.get('nonce') != st.get('n'):
        problems.append('reused sign-in')
    if int(claims.get('exp') or 0) < time.time():
        problems.append('expired')
    if directory not in ('organizations', 'common') and claims.get('tid') and claims['tid'] != directory:
        problems.append('another organisation')
    if problems:
        return _back(origin, sso_error=f'Microsoft sign-in could not be checked ({", ".join(problems)}).')
    email = (claims.get('email') or claims.get('preferred_username') or claims.get('upn') or '').strip().lower()
    if '@' not in email or email.split('@', 1)[1] not in (cfg.get('allowed_domains') or []):
        return _back(origin, sso_error=f'{email or "This account"} is not a school account.')
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is None or not _belongs(user, row.tenant):
        return _back(origin, sso_error=f'No account at {row.tenant.name} uses {email}. Ask the office to add you.')
    code = pysecrets.token_urlsafe(24)
    cache.set(f'sso-code:{code}', str(user.pk), 120)
    row.last_used_at, row.last_error = timezone.now(), ''
    row.save(update_fields=['last_used_at', 'last_error'])
    return _back(origin, sso=code)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def sso_exchange(request):
    """{code}: the one-time code from a sign-in redirect → the normal sign-in response (tokens, user, school)."""
    from services.core.accounts.models import User
    from services.core.accounts.views import build_login_response

    code = str(request.data.get('code') or '')
    key = f'sso-code:{code}'
    uid = cache.get(key) if code else None
    if not uid:
        return _err('This sign-in has expired. Please sign in again.', 401)
    cache.delete(key)  # one use only
    user = User.objects.filter(pk=uid, is_active=True).first()
    if user is None:
        return _err('This account is disabled.', 403)
    return build_login_response(request, user, method='microsoft')


# ---------------------------------------------------------------------------
# Google Classroom
# ---------------------------------------------------------------------------

def _google_client(row):
    cfg, secret = row.config, unseal(row.secret_blob)
    cid = cfg.get('client_id') or os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '')
    csec = secret.get('client_secret') or (os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '') if not cfg.get('client_id') else '')
    return cid, csec


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classroom_connect(request):
    if not is_admin(request.user):
        return _err('Only the office can connect Google Classroom.', 403)
    origin = safe_origin(request.headers.get('Origin') or request.data.get('origin') or '')
    if origin is None:
        return _err('Google Classroom can only be connected from the school app.', 403)
    school = _school(request)
    row = _row(school, 'google_classroom', create=True)
    cid, csec = _google_client(row)
    if not cid or not csec:
        return _err('Enter the Google OAuth client ID and secret first (Google Cloud console → APIs & Services → Credentials).')
    state = signing.dumps({'s': str(school.pk), 'u': str(request.user.pk), 'o': origin}, salt='google-classroom')
    q = {'client_id': cid, 'redirect_uri': _callback_url(request, 'google-classroom'), 'response_type': 'code',
         'scope': CLASSROOM_SCOPES, 'access_type': 'offline', 'prompt': 'consent', 'include_granted_scopes': 'true', 'state': state}
    return Response({'url': f'{GOOGLE_AUTH}?{urlencode(q)}'})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def classroom_callback(request):
    try:
        st = signing.loads(request.query_params.get('state') or '', salt='google-classroom', max_age=900)
    except signing.BadSignature:
        return Response({'error': 'This link has expired. Please connect again.'}, status=400)
    origin = safe_origin(st.get('o'))
    if origin is None:
        return Response({'error': 'Unknown app address.'}, status=400)
    back = lambda **p: HttpResponseRedirect(f'{origin}/settings/integrations?{urlencode(p)}')  # noqa: E731
    if request.query_params.get('error'):
        return back(classroom_error='Google Classroom was not connected.')
    row = Integration.all_objects.filter(tenant_id=st['s'], provider='google_classroom').first()
    if row is None:
        return back(classroom_error='Start again from Integrations.')
    cid, csec = _google_client(row)
    try:
        tokens = http_post_form(GOOGLE_TOKEN, {'code': request.query_params.get('code', ''), 'client_id': cid, 'client_secret': csec,
                                               'redirect_uri': _callback_url(request, 'google-classroom'), 'grant_type': 'authorization_code'})
    except OutsideError as exc:
        return back(classroom_error=f'Google did not accept it: {exc}')
    if not tokens.get('refresh_token'):
        return back(classroom_error='Google did not give long-term access. Remove the app at myaccount.google.com/permissions and connect again.')
    secret = unseal(row.secret_blob)
    secret['refresh_token'] = tokens['refresh_token']
    claims = _jwt_claims(tokens.get('id_token', ''))
    row.secret_blob = seal(secret)
    row.config = {**row.config, 'google_account': claims.get('email', '')}
    row.enabled, row.connected_at, row.last_error = True, timezone.now(), ''
    row.save()
    return back(connected='google_classroom')


def _classroom_token(row) -> str:
    cid, csec = _google_client(row)
    refresh = unseal(row.secret_blob).get('refresh_token')
    if not refresh:
        raise OutsideError('Google Classroom is not connected.')
    return http_post_form(GOOGLE_TOKEN, {'client_id': cid, 'client_secret': csec, 'refresh_token': refresh,
                                         'grant_type': 'refresh_token'})['access_token']


def _all_pages(url, token, key, params=None):
    out, params = [], dict(params or {}, pageSize=100)
    for _ in range(50):
        body = http_get_json(url, token, params)
        out += body.get(key, [])
        if not body.get('nextPageToken'):
            break
        params['pageToken'] = body['nextPageToken']
    return out


def _classroom_row(request):
    if not is_admin(request.user):
        return None, _err('Only the office can use Google Classroom here.', 403)
    row = _row(_school(request), 'google_classroom')
    if row is None or not row.enabled:
        return None, _err('Connect Google Classroom first.')
    return row, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classroom_courses(request):
    row, error = _classroom_row(request)
    if error:
        return error
    try:
        token = _classroom_token(row)
        courses = _all_pages(f'{CLASSROOM_API}/courses', token, 'courses', {'courseStates': 'ACTIVE'})
    except OutsideError as exc:
        row.last_error = str(exc)[:500]
        row.save(update_fields=['last_error'])
        return _err(f'Google Classroom: {exc}', 502)
    links = {l.course_id: l for l in ClassroomLink.objects.select_related('school_class')}
    row.last_used_at, row.last_error = timezone.now(), ''
    row.save(update_fields=['last_used_at', 'last_error'])
    return Response([{'id': c['id'], 'name': c.get('name', ''), 'section': c.get('section', ''), 'room': c.get('room', ''),
                      'link': c.get('alternateLink', ''),
                      'class': {'id': str(links[c['id']].school_class_id), 'name': links[c['id']].school_class.name} if c['id'] in links else None,
                      'last_report': links[c['id']].last_report if c['id'] in links else None} for c in courses])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classroom_link(request, course_id):
    from services.education.academics.models import SchoolClass

    row, error = _classroom_row(request)
    if error:
        return error
    class_id = request.data.get('class_id')
    if not class_id:
        ClassroomLink.objects.filter(course_id=course_id).delete()
        return Response({'course_id': course_id, 'class': None})
    cls = SchoolClass.objects.filter(pk=class_id).first()
    if cls is None:
        return _err('Class not found.', 404)
    link, _ = ClassroomLink.objects.update_or_create(course_id=course_id, defaults={
        'tenant': row.tenant, 'school_class': cls, 'course_name': str(request.data.get('course_name') or '')[:255]})
    return Response({'course_id': course_id, 'class': {'id': str(cls.id), 'name': cls.name}})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classroom_compare(request, course_id):
    """Match the course's students (by email) with the class: in both, only in Classroom, only in the school's class."""
    from services.education.students.models import Student

    row, error = _classroom_row(request)
    if error:
        return error
    link = ClassroomLink.objects.select_related('school_class').filter(course_id=course_id).first()
    if link is None:
        return _err('Link this course to a class first.')
    try:
        token = _classroom_token(row)
        people = _all_pages(f'{CLASSROOM_API}/courses/{course_id}/students', token, 'students')
        teachers = _all_pages(f'{CLASSROOM_API}/courses/{course_id}/teachers', token, 'teachers')
    except OutsideError as exc:
        return _err(f'Google Classroom: {exc}', 502)
    gc = {}
    for p in people:
        prof = p.get('profile') or {}
        email = (prof.get('emailAddress') or '').lower()
        gc[email or f"id:{p.get('userId')}"] = (prof.get('name') or {}).get('fullName', '')
    ours = list(Student.objects.filter(current_class=link.school_class, is_active=True))
    by_email = {s.email.lower(): s for s in ours if s.email}
    school_elsewhere = {s.email.lower(): s for s in Student.objects.filter(is_active=True, email__in=[e for e in gc if '@' in e])
                        .exclude(current_class=link.school_class).select_related('current_class')}
    report = {
        'course': link.course_name or course_id, 'class': link.school_class.name,
        'in_both': sorted(by_email[e].full_name for e in gc if e in by_email),
        'only_in_classroom': sorted(
            [{'name': n, 'email': e if '@' in e else '', 'note': (f'in {school_elsewhere[e].current_class.name}' if e in school_elsewhere
                                                                  and school_elsewhere[e].current_class_id else 'not a student here')}
             for e, n in gc.items() if e not in by_email], key=lambda r: r['name']),
        'only_in_class': sorted([{'name': s.full_name, 'email': s.email or '', 'note': 'no email on record' if not s.email else 'not in the course'}
                                 for s in ours if not s.email or s.email.lower() not in gc], key=lambda r: r['name']),
        'teachers': sorted(((t.get('profile') or {}).get('name') or {}).get('fullName', '') for t in teachers),
        'checked_at': timezone.now().isoformat(),
    }
    link.last_report, link.last_synced_at = report, timezone.now()
    link.save(update_fields=['last_report', 'last_synced_at'])
    return Response(report)
