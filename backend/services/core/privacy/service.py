"""Privacy rules (P14): default consents, document templates, what someone still has to accept, current answers,
and the incident playbook."""
from __future__ import annotations

import os

from django.apps import apps
from django.conf import settings
from django.core.mail import get_connection, send_mail
from django.db.models import Max
from django.utils import timezone

from .models import ConsentRecord, ConsentType, DocumentAcceptance, Incident, IncidentUpdate, LegalDocument

DEFAULT_CONSENTS = [
    ('photos_media', 'Photos and videos', 'Photos and videos of my child may be used in the school newsletter, noticeboards, the school website '
     'and its official social media. Names are never shown with photos without asking again.', 'student'),
    ('usage_analytics', 'Anonymous usage statistics', 'The app may record which pages are used (never names or school records) '
     'so that it can be improved.', 'user'),
]

PLAYBOOK = [
    ('contain', 'Contain it: stop the leak, revoke keys or sessions, switch off affected accounts'),
    ('assess', 'Assess: what data, how many people, which schools, how sensitive, is it personal data'),
    ('record', 'Record the facts and decisions in this incident (who, what, when)'),
    ('regulator', 'Decide on telling the regulator (within 72 hours of discovery when personal data is at risk)'),
    ('schools', 'Tell the affected schools (they are responsible for their families’ data)'),
    ('people', 'Help schools tell affected people when the risk to them is high'),
    ('fix', 'Fix the cause and check nothing similar remains'),
    ('review', 'Review afterwards: what to change so it does not happen again'),
]

TEMPLATE_NOTE = ('This is a starting template. Have it reviewed by a lawyer for the countries you work in before relying on it.')


def platform_template(kind: str) -> tuple[str, str]:
    name = os.environ.get('PLATFORM_LEGAL_NAME', '') or 'the platform provider'
    if kind == 'terms':
        return 'Terms of use', (
            f'These terms cover the use of this school management system provided by {name}.\n\n'
            '1. The school is responsible for the accounts it creates and the records it keeps.\n'
            '2. Use the system only for the school’s legitimate purposes; do not try to reach data you are not allowed to see.\n'
            '3. Keep your password private. Tell the school office straight away if you think someone else used your account.\n'
            '4. The service is provided under the school’s agreement with the provider, which sets out fees, availability and support.\n'
            '5. We may update these terms; you will be asked to accept a new version when you next sign in.\n\n' + TEMPLATE_NOTE)
    return 'Privacy notice', (
        f'This notice explains how {name} handles personal data in this school management system.\n\n'
        'Who is responsible: each school decides what data it keeps about its students, families and staff (it is the controller). '
        'We process that data on the school’s instructions (we are its processor).\n\n'
        'What we hold: the records the school enters (for example names, classes, attendance, marks, fees and messages), '
        'sign-in details and a record of sign-ins and changes, kept for security.\n\n'
        'How long: as long as the school uses the system, then deleted at the end of its contract. Security logs are kept for the '
        'periods the school sets.\n\n'
        'Who else sees it: only the service providers listed on the sub-processors page, under contracts that protect the data.\n\n'
        'Your rights: you can ask the school to see, correct or erase your data, to limit its use or to object. Use Privacy & consent '
        'in the app, or contact the school office. You can also complain to your data protection authority.\n\n' + TEMPLATE_NOTE)


def school_template(school) -> tuple[str, str]:
    s = school.settings_json or {}
    contact = s.get('email') or 'the school office'
    return f'Privacy notice for {school.name}', (
        f'{school.name} keeps personal data about its students, their families and its staff to run the school: admissions, '
        'classes and timetables, attendance, learning and reports, fees, communication, and safety.\n\n'
        'We only share it with people who need it: our staff, the families of each student, and the service providers who run our '
        'systems for us. We do not sell it or use it for advertising.\n\n'
        'We keep records for as long as a student or staff member is at the school, and afterwards only as long as the law requires.\n\n'
        'Where we rely on your consent (for example photos in our newsletter) you can change your mind at any time under Privacy & '
        'consent in the app.\n\n'
        f'You can ask to see, correct or erase your data, to limit its use or to object, in the app or by contacting {contact}.\n\n'
        + TEMPLATE_NOTE)


# ---- Documents --------------------------------------------------------------------------------------------------

def current(kind, school=None):
    return LegalDocument.objects.filter(kind=kind, school=school).order_by('-version').first()


def publish(kind, title, body, *, school=None, by=None, summary=''):
    last = LegalDocument.objects.filter(kind=kind, school=school).aggregate(v=Max('version'))['v'] or 0
    return LegalDocument.objects.create(kind=kind, school=school, version=last + 1, title=title[:200], body=body,
                                        summary_of_changes=summary[:300], published_by=by if getattr(by, 'pk', None) else None)


def pending_documents(user, school):
    docs = [d for d in (current('terms'), current('privacy'), current('school_privacy', school) if school else None) if d]
    accepted = set(DocumentAcceptance.objects.filter(user=user, document__in=docs).values_list('document_id', flat=True))
    return [d for d in docs if d.pk not in accepted]


# ---- Consent ----------------------------------------------------------------------------------------------------

def consent_types(school, active_only=True):
    if not ConsentType.objects.filter(school=school).exists():
        for key, label, description, subject in DEFAULT_CONSENTS:
            ConsentType.objects.get_or_create(school=school, key=key, defaults={'label': label, 'description': description, 'subject': subject})
    qs = ConsentType.objects.filter(school=school)
    return qs.filter(is_active=True) if active_only else qs


def answers(school, *, students=None, user=None):
    """{(type_id, student_id or None): latest record} for the given students and/or person."""
    qs = ConsentRecord.objects.filter(school=school).select_related('consent_type')
    if students is not None and user is not None:
        from django.db.models import Q

        qs = qs.filter(Q(student__in=students) | Q(subject_user=user, student__isnull=True))
    elif students is not None:
        qs = qs.filter(student__in=students)
    elif user is not None:
        qs = qs.filter(subject_user=user, student__isnull=True)
    out = {}
    for r in qs.order_by('created_at'):
        out[(r.consent_type_id, r.student_id)] = r
    return out


def photo_consent(school, student_ids) -> dict:
    """{student_id: True | False | None (not asked)} for the photos consent."""
    t = ConsentType.objects.filter(school=school, key='photos_media').first()
    if t is None:
        return {sid: None for sid in student_ids}
    latest = {}
    for sid, granted in ConsentRecord.objects.filter(consent_type=t, student_id__in=student_ids).order_by('created_at').values_list('student_id', 'granted'):
        latest[str(sid)] = granted
    return {sid: latest.get(str(sid)) for sid in student_ids}


# ---- Incidents --------------------------------------------------------------------------------------------------

def next_reference():
    year = timezone.localdate().year
    prefix = f'INC-{year}-'
    last = Incident.objects.filter(reference__startswith=prefix).order_by('-reference').values_list('reference', flat=True).first()
    return f'{prefix}{(int(last.rsplit("-", 1)[1]) + 1 if last else 1):03d}'


def add_update(incident, note, by=None):
    return IncidentUpdate.objects.create(incident=incident, note=note, by=by if getattr(by, 'pk', None) else None,
                                         by_name=(getattr(by, 'full_name', '') or getattr(by, 'email', '')) if by else 'System')


def notify_schools(incident, message, by=None):
    """Email the administrators of every affected school, and record it."""
    TenantMembership = apps.get_model('core_tenants', 'TenantMembership')
    sent = 0
    for school in incident.schools.all():
        to = list(TenantMembership.objects.filter(school=school, role='admin', is_active=True).values_list('user__email', flat=True))
        billing = ((school.settings_json or {}).get('billing') or {}).get('email')
        if billing:
            to.append(billing)
        to = sorted({e for e in to if e})
        if not to:
            continue
        body = (f'Security notice {incident.reference}: {incident.title}\n\n{message}\n\n'
                f'Discovered: {timezone.localtime(incident.discovered_at):%d %b %Y %H:%M}. '
                f'Data involved: {incident.data_affected or "being assessed"}.\n\n'
                'We will keep you updated. Please contact us with any questions.')
        try:
            send_mail(f'[{incident.reference}] Security notice for {school.name}', body, settings.DEFAULT_FROM_EMAIL, to,
                      connection=get_connection(settings.FALLBACK_EMAIL_BACKEND), fail_silently=True)
            sent += 1
        except Exception:
            pass
    incident.schools_notified_at = timezone.now()
    if incident.status in ('reported', 'investigating', 'contained'):
        incident.status = 'notified'
    incident.checklist = {**(incident.checklist or {}), 'schools': timezone.now().isoformat()}
    incident.save()
    add_update(incident, f'Affected schools told ({sent} school{"s" if sent != 1 else ""}): {message[:200]}', by)
    return sent
