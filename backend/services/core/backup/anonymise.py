"""Make a copy of the database safe for staging (P5).

Replaces names, contact details, ID numbers, addresses, birth dates and health notes with made-up values, removes
secrets (payment, SMS, WhatsApp and integration keys, 2-step codes, tokens), logs that hold addresses or emails, file
links and IP addresses, and gives every account the same staging password. The made-up values depend only on the real
value, so the same parent gets the same made-up name everywhere and links by email keep working.

Free-text notes (announcements, comments, behaviour notes, messages in chats) are kept as they are: staging is for
the team, and these rarely matter, but keep that in mind before sharing staging more widely.

Refuses to run unless APP_ENV is "staging" (or the site runs with DEBUG), so it can never touch production.
"""
from __future__ import annotations

import hashlib
import os
import secrets as _secrets

from django.apps import apps
from django.conf import settings
from django.db import models, transaction

FIRST = ['Aisha', 'Omar', 'Lena', 'Yusuf', 'Maya', 'Idris', 'Sara', 'Noah', 'Zara', 'Adam', 'Hana', 'Ravi', 'Mina', 'Leo',
         'Nadia', 'Sami', 'Iris', 'Tariq', 'Elif', 'Karim', 'Rosa', 'Imran', 'Dina', 'Felix']
LAST = ['Ahmed', 'Baker', 'Chen', 'Diaz', 'Evans', 'Farooq', 'Garcia', 'Hassan', 'Ito', 'Jones', 'Khan', 'Lopez', 'Malik',
        'Novak', 'Owens', 'Patel', 'Quinn', 'Rahman', 'Silva', 'Tanaka', 'Usman', 'Varga', 'Walsh', 'Young']
DOMAIN = 'example.test'

# (model, field) -> what kind of made-up value it gets.
RULES = {
    'core_accounts.User': {'first_name': 'first', 'last_name': 'last', 'full_name': 'name', 'email': 'email',
                           'phone_number': 'phone', 'date_of_birth': 'dob', 'email_verification_token': 'blank',
                           'phone_verification_code': 'blank', 'two_factor_secret': 'blank'},
    'core_accounts.PortalCredential': {'initial_password': 'blank'},
    'core_accounts.ParentProfile': {'phone': 'phone', 'address': 'address'},
    'core_accounts.TeacherProfile': {'phone': 'phone'},
    'education_academics.Teacher': {'full_name': 'name', 'email': 'email', 'phone': 'phone', 'father_husband_name': 'name',
                                    'national_id': 'nid', 'home_address': 'address', 'date_of_birth': 'dob'},
    'education_academics.TeacherLeave': {'applicant_email': 'email'},
    'education_academics.LeaveBalance': {'applicant_email': 'email'},
    'education_students.Student': {
        'full_name': 'name', 'email': 'email', 'phone': 'phone', 'date_of_birth': 'dob', 'guardian_name': 'name',
        'emergency_contact': 'phone', 'father_name': 'name', 'mother_name': 'name', 'guardian_phone': 'phone',
        'address': 'address', 'birth_form_id': 'nid', 'father_national_id': 'nid', 'father_occupation': 'blank',
        'father_education': 'blank', 'father_mobile': 'phone', 'father_profession': 'blank', 'father_income': 'blank',
        'mother_national_id': 'nid', 'mother_occupation': 'blank', 'mother_education': 'blank', 'mother_mobile': 'phone',
        'mother_profession': 'blank', 'mother_income': 'blank'},
    'education_students.Household': {'name': 'family', 'address': 'address', 'phone': 'phone', 'email': 'email'},
    'education_students.Guardian': {'first_name': 'first', 'last_name': 'last', 'email': 'email', 'mobile_phone': 'phone',
                                    'home_phone': 'phone', 'work_phone': 'phone', 'national_id': 'nid', 'address': 'address'},
    'education_students.StudentHealth': {'allergies': 'blank', 'medical_conditions': 'blank', 'physician_phone': 'phone'},
    'education_admissions.Applicant': {
        'full_name': 'name', 'email': 'email', 'phone': 'phone', 'date_of_birth': 'dob', 'address': 'address',
        'father_name': 'name', 'father_phone': 'phone', 'father_occupation': 'blank', 'mother_name': 'name',
        'mother_phone': 'phone', 'mother_occupation': 'blank', 'guardian_name': 'name', 'guardian_phone': 'phone',
        'guardians': 'empty', 'medical_notes': 'blank'},
    'education_admissions.Application': {'tracking_token': 'token'},
    'education_transport.TransportStaff': {'name': 'name', 'phone': 'phone', 'national_id': 'nid'},
    'education_inventory.Supplier': {'contact_person': 'name', 'phone': 'phone', 'email': 'email', 'address': 'address'},
    'education_library.Member': {'name': 'name'},
    'core_privacy.PrivacyRequest': {'requester_email': 'email'},
    'core_privacy.Incident': {'reported_by_email': 'email'},
    'core_portability.SchoolDeletion': {'requested_by_email': 'email'},
    'core_backup.DisasterRecoveryPlan': {'notification_emails': 'empty', 'slack_webhook_url': 'blank'},
    # Logs keep what happened, not the before/after values (which hold names, emails and addresses).
    'audit.AuditLog': {'old_data': 'empty', 'new_data': 'empty', 'changes': 'empty', 'ip_address': 'blank', 'user_agent': 'blank'},
    'core_db.AuditLogArchive': {'old_data': 'empty', 'new_data': 'empty', 'ip_address': 'blank', 'user_agent': 'blank'},
    'core_accounts.UserActivity': {'details': 'empty', 'ip_address': 'blank', 'user_agent': 'blank'},
    'education_finance.TransactionLog': {'old_values': 'empty', 'new_values': 'empty', 'object_name': 'blank',
                                         'ip_address': 'blank', 'user_agent': 'blank'},
    # Secrets: a staging copy must never be able to charge cards or send real messages.
    'education_finance.PaymentGatewayConfig': {'api_key': 'blank', 'api_secret': 'blank', 'webhook_secret': 'blank'},
    'education_communication.WhatsAppConfig': {'access_token': 'blank', 'phone_number_id': 'blank'},
    'education_communication.SmsConfig': {'account_sid': 'blank', 'auth_token': 'blank'},
    'education_integrations.Integration': {'secret_blob': 'blank'},
}
# Logs full of addresses, emails and IPs: emptied.
EMPTIED = ['core_security.SignInEvent', 'core_security.EmailLog', 'core_security.TwoFactor', 'core_support.SupportTicket', 'education_communication.Message',
           'token_blacklist.OutstandingToken', 'sessions.Session']


class NotStaging(Exception):
    pass


def allowed() -> bool:
    return getattr(settings, 'APP_ENV', '') == 'staging' or settings.DEBUG


def _h(kind: str, value) -> int:
    return int(hashlib.sha256(f'{kind}|{str(value).strip().lower()}'.encode()).hexdigest(), 16)


def fake(kind: str, value, field=None):
    if value in (None, '') or kind == 'keep':
        return value
    n = _h(kind if kind not in ('first', 'last', 'name', 'family') else 'person', value)
    if kind == 'first':
        return FIRST[n % len(FIRST)]
    if kind == 'last':
        return LAST[n % len(LAST)]
    if kind == 'name':
        words = str(value).split()
        # Keep the shape: one word stays one word, "First Last" stays two.
        return FIRST[n % len(FIRST)] if len(words) < 2 else f'{FIRST[n % len(FIRST)]} {LAST[(n // 97) % len(LAST)]}'
    if kind == 'family':
        return f'{LAST[n % len(LAST)]} family'
    if kind == 'email':
        return f'u{n % 10**10:010d}@{DOMAIN}'
    if kind == 'phone':
        return f'+1555{n % 10**7:07d}'
    if kind == 'nid':
        return f'X{n % 10**9:09d}'
    if kind == 'address':
        return f'{n % 900 + 1} Example Street'
    if kind == 'dob':
        # Same year (so ages and classes still make sense), made-up day.
        return value.replace(month=n % 12 + 1, day=n % 28 + 1)
    if kind == 'blank':
        if field is not None and field.null:
            return None
        return '0.0.0.0' if isinstance(field, models.GenericIPAddressField) else ''
    if kind == 'empty':
        return [] if isinstance(value, list) else ({} if isinstance(value, dict) else '')
    if kind == 'token':
        return _secrets.token_urlsafe(24)[: getattr(field, 'max_length', None) or 32]
    raise ValueError(kind)


def _model(label):
    try:
        return apps.get_model(label)
    except LookupError:
        return None


def _rewrite(model, plan: dict) -> int:
    """plan: field name -> function(value, field) -> new value. Updates in batches without calling save() or signals."""
    fields = {f.name: f for f in model._meta.concrete_fields}
    plan = {k: v for k, v in plan.items() if k in fields}
    if not plan:
        return 0
    changed, batch = 0, []
    for obj in model._base_manager.all().only('pk', *plan).iterator(chunk_size=500):
        dirty = False
        for name, fn in plan.items():
            old = getattr(obj, name)
            new = fn(old, fields[name])
            if new != old:
                setattr(obj, name, new)
                dirty = True
        if dirty:
            batch.append(obj)
            changed += 1
        if len(batch) >= 500:
            model._base_manager.bulk_update(batch, list(plan))
            batch = []
    if batch:
        model._base_manager.bulk_update(batch, list(plan))
    return changed


def run(password: str | None = None) -> dict:
    if not allowed():
        raise NotStaging('Refused: set APP_ENV=staging. This must never run on the live database.')
    report = {}
    with transaction.atomic():
        for label in EMPTIED:
            m = _model(label)
            if m is not None:
                report[f'emptied {label}'] = m._base_manager.all().delete()[0]
        for label, rules in RULES.items():
            m = _model(label)
            if m is not None:
                report[label] = _rewrite(m, {f: (lambda v, fld, k=k: fake(k, v, fld)) for f, k in rules.items()})
        # Everywhere: file links (the files stay in the live storage), IP addresses and browser details.
        for m in apps.get_models():
            plan = {}
            for f in m._meta.concrete_fields:
                if isinstance(f, models.FileField):
                    plan[f.name] = lambda v, fld: ''
                elif isinstance(f, models.GenericIPAddressField):
                    plan[f.name] = lambda v, fld: None if fld.null else '0.0.0.0'
                elif f.name == 'user_agent':
                    plan[f.name] = lambda v, fld: ''
            if plan and m._meta.label not in RULES:
                n = _rewrite(m, plan)
                if n:
                    report[f'files/IPs {m._meta.label}'] = n
        User = apps.get_model(settings.AUTH_USER_MODEL)
        from django.contrib.auth.hashers import make_password

        password = password or os.environ.get('STAGING_PASSWORD', '')
        extra = {'two_factor_enabled': False} if any(f.name == 'two_factor_enabled' for f in User._meta.fields) else {}
        report['accounts'] = User._base_manager.update(password=make_password(password or None), **extra)
    report['password'] = 'set' if password else 'accounts cannot sign in (no STAGING_PASSWORD)'
    return report


def leftovers() -> list[str]:
    """A check after the run: any account email that is still real."""
    User = apps.get_model(settings.AUTH_USER_MODEL)
    return list(User._base_manager.exclude(email__endswith=f'@{DOMAIN}').exclude(email='').values_list('email', flat=True)[:20])
