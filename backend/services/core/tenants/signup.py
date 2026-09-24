"""Self-service school signup and the new-school setup checklist.

POST /api/v1/tenants/signup/ creates a School and its first administrator
(a TenantMembership with role 'admin') in one transaction and signs them in.
The admin then adds staff, students and parents, who all belong to that
school; the tenant scoping in scoping.py keeps every school's data apart.
"""
from __future__ import annotations

import random
import re
import string

from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .context import use_tenant
from .localization import (
    DEFAULT_CURRENCY,
    DEFAULT_LANGUAGE,
    DEFAULT_TIMEZONE,
    normalize_currency,
    normalize_language,
    options as localization_options,
    school_locale,
)
from .models import School, TenantMembership

User = get_user_model()


class SignupThrottle(AnonRateThrottle):
    """Public endpoint: limit school creation per IP."""
    scope = 'school_signup'
    rate = '10/hour'


def _tenant_code(name: str) -> str:
    """Three letters from the school name (e.g. 'Green Valley School' -> GVS), unique."""
    words = [w for w in re.split(r'[^A-Za-z]+', name.upper()) if w]
    candidates = []
    if len(words) >= 3:
        candidates.append(''.join(w[0] for w in words[:3]))
    if words:
        joined = ''.join(words)
        candidates += [joined[:3], (words[0][:2] + (words[1][0] if len(words) > 1 else words[0][-1]))]
    for code in candidates:
        if len(code) == 3 and not School.objects.filter(tenant_code=code).exists():
            return code
    for _ in range(200):
        code = ''.join(random.choices(string.ascii_uppercase, k=3))
        if not School.objects.filter(tenant_code=code).exists():
            return code
    raise ValidationError('Could not allocate a school code, please try again.')


def _subdomain(name: str) -> str:
    base = slugify(name)[:40] or 'school'
    candidate, n = base, 1
    while School.objects.filter(subdomain=candidate).exists():
        n += 1
        candidate = f'{base}-{n}'
    return candidate


def create_school_with_admin(*, school_name, admin_email, admin_name, password=None,
                             firebase_uid='', city='', phone='', currency=None, language=None, timezone=None):
    """Create the school and its first admin. Raises ValidationError on bad input."""
    school_name = (school_name or '').strip()
    admin_email = (admin_email or '').strip().lower()
    if len(school_name) < 3:
        raise ValidationError({'school_name': 'Enter your school name.'})
    if not admin_email or '@' not in admin_email:
        raise ValidationError({'email': 'Enter a valid email address.'})
    if User.objects.filter(email__iexact=admin_email).exists():
        raise ValidationError({'email': 'An account with this email already exists. Sign in instead.'})
    currency_code = normalize_currency(currency or DEFAULT_CURRENCY)
    if not currency_code:
        raise ValidationError({'currency': 'Choose a supported currency.'})
    language_code = normalize_language(language or DEFAULT_LANGUAGE)
    if not language_code:
        raise ValidationError({'language': 'Choose a supported language.'})
    if password is not None:
        try:
            validate_password(password)
        except ValidationError as exc:
            raise ValidationError({'password': ' '.join(exc.messages)})

    with transaction.atomic(), use_tenant(None):
        school = School.objects.create(
            name=school_name,
            tenant_code=_tenant_code(school_name),
            subdomain=_subdomain(school_name),
            is_active=True,
            settings_json={
                'institute_name': school_name,
                'name': school_name,
                'city': city.strip(),
                'phone': phone.strip(),
                'currency': currency_code,
                'language': language_code,
                'timezone': (timezone or DEFAULT_TIMEZONE)[:64],
                'onboarding': {'created_via': 'google' if firebase_uid else 'signup'},
            },
        )
        user = User.objects.create_user(email=admin_email, password=password, full_name=(admin_name or '').strip())
        user.account_status = User.AccountStatus.ACTIVE
        user.email_verified = bool(firebase_uid)
        if firebase_uid:
            user.firebase_uid = firebase_uid
        if password is None:
            user.set_unusable_password()  # Google-only account
        user.save()
        TenantMembership.objects.create(user=user, school=school, role='admin', is_active=True, is_primary=True)
    return school, user


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([SignupThrottle])
def school_signup(request):
    """
    Body (password):  {school_name, admin_name, email, password, currency, language, city?, phone?, timezone?}
    Body (Google):    {school_name, currency, language, city?, phone?, timezone?, id_token}
                      (name/email come from Google)
    Returns the same payload as /auth/login/ (tokens, user, tenant).
    """
    from services.core.accounts.google_identity import GoogleIdentityError, verify_google_identity
    from services.core.accounts.views import build_login_response

    data = request.data
    firebase_uid, email, name, password = '', data.get('email'), data.get('admin_name'), data.get('password')
    if data.get('id_token'):
        try:
            ident = verify_google_identity(data['id_token'])
        except GoogleIdentityError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
        if not ident.email_verified:
            return Response({'error': 'Please verify your Google email address first.'},
                            status=status.HTTP_401_UNAUTHORIZED)
        firebase_uid, email, name, password = ident.uid, ident.email, name or ident.name, None
    elif not password:
        return Response({'error': 'Choose a password.', 'fields': {'password': 'Choose a password.'}},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        _, user = create_school_with_admin(
            school_name=data.get('school_name'), admin_email=email, admin_name=name, password=password,
            firebase_uid=firebase_uid, city=data.get('city') or '', phone=data.get('phone') or '',
            currency=data.get('currency'), language=data.get('language'), timezone=data.get('timezone'),
        )
    except ValidationError as exc:
        fields = exc.message_dict if hasattr(exc, 'error_dict') else {'non_field': exc.messages}
        fields = {k: ' '.join(v) if isinstance(v, list) else v for k, v in fields.items()}
        return Response({'error': next(iter(fields.values())), 'fields': fields}, status=status.HTTP_400_BAD_REQUEST)

    response = build_login_response(request, user)
    response.status_code = status.HTTP_201_CREATED
    return response


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def signup_config(request):
    """What the public signup page can offer (Google button only when configured)."""
    from services.core.accounts.google_identity import google_sign_in_enabled

    return Response({'google_sign_in': google_sign_in_enabled(), **localization_options()})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def school_locale_view(request):
    """GET: the school's currency/language (+ choices). PUT (school admin): change them."""
    from services.core.accounts.decorators import is_admin

    tenant = getattr(request, 'tenant', None)
    if request.method == 'GET':
        return Response({'locale': school_locale(tenant), **localization_options()})
    if tenant is None:
        return Response({'error': 'Your account is not linked to a school.'}, status=status.HTTP_400_BAD_REQUEST)
    if not (request.user.is_superuser or is_admin(request.user)):
        return Response({'error': 'Only the school administrator can change this.'}, status=status.HTTP_403_FORBIDDEN)
    updates, errors = {}, {}
    if 'currency' in request.data:
        code = normalize_currency(request.data.get('currency'))
        if code:
            updates['currency'] = code
        else:
            errors['currency'] = 'Choose a supported currency.'
    if 'language' in request.data:
        code = normalize_language(request.data.get('language'))
        if code:
            updates['language'] = code
        else:
            errors['language'] = 'Choose a supported language.'
    if request.data.get('timezone'):
        updates['timezone'] = str(request.data['timezone'])[:64]
    if errors:
        return Response({'error': next(iter(errors.values())), 'fields': errors}, status=status.HTTP_400_BAD_REQUEST)
    with use_tenant(None):
        tenant.settings_json = {**(tenant.settings_json or {}), **updates}
        tenant.save(update_fields=['settings_json', 'updated_at'])
    return Response({'locale': school_locale(tenant)})


# Setup checklist shown on a new school's dashboard: (key, label, model, link)
SETUP_STEPS = [
    ('profile', 'Add your school profile (logo, address, phone)', None, '/settings/profile'),
    ('classes', 'Create classes and sections', 'education_academics.SchoolClass', '/education/academic-setup'),
    ('subjects', 'Add subjects', 'education_academics.Subject', '/education/academic-setup'),
    ('staff', 'Add teachers and staff', 'education_academics.Teacher', '/education/teachers/add'),
    ('students', 'Admit students', 'education_students.Student', '/education/students/add'),
    ('fees', 'Set up fee structures', 'education_finance.FeeStructure', '/education/fees/invoices'),
]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def onboarding_status(request):
    """Which setup steps the current school has done (counts use the school scope)."""
    tenant = getattr(request, 'tenant', None)
    if tenant is None:
        return Response({'school': None, 'steps': [], 'complete': True})
    steps = []
    for key, label, model_label, link in SETUP_STEPS:
        if model_label is None:
            s = tenant.settings_json or {}
            done = bool(s.get('address') and s.get('phone'))
        else:
            done = apps.get_model(model_label).objects.exists()
        steps.append({'key': key, 'label': label, 'done': done, 'link': link})
    return Response({
        'school': {'name': tenant.name, 'code': tenant.tenant_code},
        'steps': steps,
        'complete': all(s['done'] for s in steps),
    })
