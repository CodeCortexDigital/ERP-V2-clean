"""Privacy (P14): legal documents, consent, privacy requests, sub-processors and incidents. /api/v1/privacy/"""
from __future__ import annotations

import csv

from django.apps import apps
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import filter_students_for_user, get_user_role, is_admin
from services.core.accounts.permissions import IsPlatformOwner
from services.core.security.policy import client_ip
from services.core.tenants.models import School

from . import service
from .models import (ConsentRecord, ConsentType, DocumentAcceptance, Incident, LegalDocument, PrivacyRequest,
                     SubProcessor)


def _local(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def _name(u):
    return (getattr(u, 'full_name', '') or getattr(u, 'email', '')) if u else ''


def _doc(d, full=True):
    out = {'id': str(d.id), 'kind': d.kind, 'kind_label': d.get_kind_display(), 'version': d.version, 'title': d.title,
           'summary_of_changes': d.summary_of_changes, 'published_at': _local(d.published_at), 'school': d.school.name if d.school_id else None}
    if full:
        out['body'] = d.body
    return out


def _students(user):
    Student = apps.get_model('education_students', 'Student')
    role = get_user_role(user)
    if role not in ('parent', 'student'):
        return Student.objects.none()
    return filter_students_for_user(user, Student.objects.filter(is_active=True))


def _admin(request):
    if not is_admin(request.user) or getattr(request, 'tenant', None) is None:
        return Response({'error': 'Only school administrators can see this.'}, status=status.HTTP_403_FORBIDDEN)
    return None


# ---- Public legal pages -----------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def legal(request, kind):
    if kind == 'subprocessors':
        return Response({'subprocessors': [{'name': p.name, 'purpose': p.purpose, 'data': p.data, 'location': p.location,
                                            'optional': p.optional, 'website': p.website} for p in SubProcessor.objects.all()],
                         'updated_at': _local(max((p.updated_at for p in SubProcessor.objects.all()), default=None))})
    if kind not in ('privacy', 'terms'):
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    d = service.current(kind)
    if d is None:
        title, body = service.platform_template(kind)
        return Response({'document': {'kind': kind, 'version': 0, 'title': title, 'body': body, 'published_at': None}})
    return Response({'document': _doc(d)})


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def school_notice(request, code):
    school = School.objects.filter(tenant_code__iexact=code, is_active=True).first()
    d = service.current('school_privacy', school) if school else None
    if d is None:
        return Response({'error': 'This school has not published a privacy notice yet.'}, status=status.HTTP_404_NOT_FOUND)
    return Response({'document': _doc(d)})


# ---- Accepting documents ----------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending(request):
    return Response({'documents': [_doc(d) for d in service.pending_documents(request.user, getattr(request, 'tenant', None))]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept(request):
    wanted = {str(x) for x in (request.data or {}).get('documents', [])}
    docs = [d for d in service.pending_documents(request.user, getattr(request, 'tenant', None)) if str(d.id) in wanted]
    for d in docs:
        DocumentAcceptance.objects.get_or_create(document=d, user=request.user, defaults={'ip_address': client_ip(request)})
    return Response({'accepted': len(docs), 'pending': [_doc(d, False) for d in service.pending_documents(request.user, getattr(request, 'tenant', None))]})


# ---- My privacy (families, students, staff) ---------------------------------------------------------------------

def _record(r):
    return {'granted': r.granted, 'when': _local(r.created_at), 'by': r.given_by_name, 'outdated': r.type_version < r.consent_type.version}


def _request(r):
    return {'id': str(r.id), 'kind': r.kind, 'kind_label': r.get_kind_display(), 'details': r.details, 'status': r.status,
            'status_label': r.get_status_display(), 'student': r.student.full_name if r.student_id else None,
            'requester': r.requester_email, 'created_at': _local(r.created_at), 'due_date': r.due_date,
            'overdue': r.status in ('open', 'in_progress') and r.due_date < timezone.localdate(), 'response': r.response,
            'handled_by': _name(r.handled_by), 'closed_at': _local(r.closed_at)}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    school = getattr(request, 'tenant', None)
    if school is None:
        return Response({'types': [], 'children': [], 'requests': []})
    students = list(_students(request.user))
    types = list(service.consent_types(school))
    ans = service.answers(school, students=students, user=request.user)
    history = {}
    for r in ConsentRecord.objects.filter(school=school, consent_type__in=types).filter(
            student__in=students).order_by('-created_at')[:200]:
        history.setdefault(f'{r.consent_type_id}:{r.student_id}', []).append(_record(r))
    for r in ConsentRecord.objects.filter(school=school, consent_type__in=types, subject_user=request.user, student__isnull=True).order_by('-created_at')[:50]:
        history.setdefault(f'{r.consent_type_id}:', []).append(_record(r))

    def item(t, student=None):
        cur = ans.get((t.id, student.id if student else None))
        key = f'{t.id}:{student.id if student else ""}'
        return {'type_id': str(t.id), 'key': t.key, 'label': t.label, 'description': t.description,
                'current': _record(cur) if cur else None, 'history': history.get(key, [])}

    notice = service.current('school_privacy', school)
    return Response({
        'mine': [item(t) for t in types if t.subject == 'user'],
        'children': [{'id': str(s.id), 'name': s.full_name, 'consents': [item(t, s) for t in types if t.subject == 'student']} for s in students],
        'requests': [_request(r) for r in PrivacyRequest.objects.filter(school=school, requester=request.user).select_related('student', 'handled_by')],
        'kinds': dict(PrivacyRequest.KINDS), 'school_notice': _doc(notice, False) if notice else None, 'school_code': school.tenant_code,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def give_consent(request):
    school = getattr(request, 'tenant', None)
    d = request.data or {}
    t = ConsentType.objects.filter(school=school, pk=d.get('type'), is_active=True).first() if school else None
    if t is None:
        return Response({'error': 'Unknown consent.'}, status=status.HTTP_400_BAD_REQUEST)
    student = None
    if t.subject == 'student':
        student = _students(request.user).filter(pk=d.get('student')).first()
        if student is None:
            return Response({'error': 'You can only answer for your own children.'}, status=status.HTTP_403_FORBIDDEN)
    r = ConsentRecord.objects.create(school=school, consent_type=t, student=student, subject_user=None if student else request.user,
                                     granted=bool(d.get('granted')), type_version=t.version, given_by=request.user, given_by_name=_name(request.user))
    return Response({'current': _record(r)}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_request(request):
    school = getattr(request, 'tenant', None)
    d = request.data or {}
    if school is None or d.get('kind') not in dict(PrivacyRequest.KINDS):
        return Response({'error': 'Choose what you are asking for.'}, status=status.HTTP_400_BAD_REQUEST)
    details = str(d.get('details') or '').strip()
    if len(details) < 5:
        return Response({'error': 'Say briefly what the request is about.'}, status=status.HTTP_400_BAD_REQUEST)
    student = None
    if d.get('student'):
        student = _students(request.user).filter(pk=d['student']).first()
        if student is None:
            return Response({'error': 'You can only ask about yourself or your own children.'}, status=status.HTTP_403_FORBIDDEN)
    r = PrivacyRequest.objects.create(school=school, requester=request.user, requester_email=request.user.email, student=student,
                                      kind=d['kind'], details=details[:4000])
    return Response({'request': _request(r), 'message': f'Request received. The school will reply by {r.due_date:%d %b %Y}.'},
                    status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def photo_consent(request):
    """{student_id: true/false/null} for staff screens (rosters, profiles)."""
    school = getattr(request, 'tenant', None)
    if school is None or get_user_role(request.user) not in ('admin', 'teacher', 'staff'):
        return Response({'error': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
    ids = [x for x in (request.GET.get('ids') or '').split(',') if x][:500]
    return Response({'photo_consent': {str(k): v for k, v in service.photo_consent(school, ids).items()}})


# ---- School administrators --------------------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def documents(request):
    denied = _admin(request)
    if denied:
        return denied
    school = request.tenant
    if request.method == 'POST':
        d = request.data or {}
        if len(str(d.get('body') or '').strip()) < 50:
            return Response({'error': 'The notice is too short.'}, status=status.HTTP_400_BAD_REQUEST)
        doc = service.publish('school_privacy', str(d.get('title') or f'Privacy notice for {school.name}'), str(d['body']).strip(),
                              school=school, by=request.user, summary=str(d.get('summary') or ''))
        return Response({'document': _doc(doc)}, status=status.HTTP_201_CREATED)
    from services.core.security.access import school_people

    people = list(school_people(school))
    rows = []
    for doc in [d for d in (service.current('terms'), service.current('privacy'), service.current('school_privacy', school)) if d]:
        accepted = DocumentAcceptance.objects.filter(document=doc, user_id__in=people).count()
        rows.append({**_doc(doc, doc.school_id is not None), 'accepted': accepted, 'people': len(people)})
    title, body = service.school_template(school)
    return Response({'documents': rows, 'template': {'title': title, 'body': body},
                     'history': [_doc(d, False) for d in LegalDocument.objects.filter(school=school)]})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_consent_types(request):
    denied = _admin(request)
    if denied:
        return denied
    school = request.tenant
    if request.method == 'POST':
        d = request.data or {}
        from django.utils.text import slugify

        label = str(d.get('label') or '').strip()
        if not label or len(str(d.get('description') or '')) < 10:
            return Response({'error': 'Give the consent a name and explain what it allows.'}, status=status.HTTP_400_BAD_REQUEST)
        t_id = d.get('id')
        if t_id:
            t = get_object_or_404(ConsentType, pk=t_id, school=school)
            changed = t.description != d['description'] or t.label != label
            t.label, t.description = label[:120], str(d['description'])
            if changed:
                t.version += 1  # earlier answers were given to different wording
            if 'is_active' in d:
                t.is_active = bool(d['is_active'])
            t.save()
        else:
            key = slugify(label)[:40] or 'consent'
            if ConsentType.objects.filter(school=school, key=key).exists():
                return Response({'error': 'A consent with that name already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            ConsentType.objects.create(school=school, key=key, label=label[:120], description=str(d['description']),
                                       subject='user' if d.get('subject') == 'user' else 'student')
    return Response({'types': [{'id': str(t.id), 'key': t.key, 'label': t.label, 'description': t.description, 'subject': t.subject,
                                'subject_label': t.get_subject_display(), 'is_active': t.is_active, 'version': t.version}
                               for t in service.consent_types(school, active_only=False)]})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consent_report(request):
    denied = _admin(request)
    if denied:
        return denied
    school = request.tenant
    t = get_object_or_404(ConsentType, school=school, pk=request.GET.get('type')) if request.GET.get('type') else service.consent_types(school).first()
    if t is None:
        return Response({'rows': []})
    Student = apps.get_model('education_students', 'Student')
    rows = []
    if t.subject == 'student':
        students = list(Student.objects.filter(is_active=True).select_related('current_class').order_by('current_class__name', 'full_name'))
        ans = service.answers(school, students=students)
        for s in students:
            r = ans.get((t.id, s.id))
            rows.append({'name': s.full_name, 'number': s.student_id, 'class': getattr(s.current_class, 'name', ''),
                         'answer': None if r is None else r.granted, 'when': _local(r.created_at) if r else None,
                         'by': r.given_by_name if r else '', 'outdated': bool(r and r.type_version < t.version)})
    else:
        from django.contrib.auth import get_user_model

        from services.core.security.access import ROLE_LABELS, school_people

        roles = school_people(school)
        latest = {}
        for r in ConsentRecord.objects.filter(consent_type=t, student__isnull=True).order_by('created_at'):
            latest[r.subject_user_id] = r
        for u in get_user_model().objects.filter(pk__in=list(roles)).order_by('full_name'):
            r = latest.get(u.pk)
            rows.append({'name': _name(u), 'number': u.email, 'class': ROLE_LABELS.get(roles[u.pk], ''), 'answer': None if r is None else r.granted,
                         'when': _local(r.created_at) if r else None, 'by': r.given_by_name if r else '', 'outdated': bool(r and r.type_version < t.version)})
    summary = {'yes': sum(1 for r in rows if r['answer'] is True), 'no': sum(1 for r in rows if r['answer'] is False),
               'not_answered': sum(1 for r in rows if r['answer'] is None)}
    if request.GET.get('export') == 'csv':
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="consent-{t.key}.csv"'
        response.write('﻿')
        w = csv.writer(response)
        w.writerow(['Name', 'Number / email', 'Class / role', 'Answer', 'When', 'By', 'Asked again since'])
        for r in rows:
            w.writerow([r['name'], r['number'], r['class'], {True: 'Yes', False: 'No', None: 'Not answered'}[r['answer']], r['when'] or '', r['by'], 'Yes' if r['outdated'] else ''])
        return response
    return Response({'type': {'id': str(t.id), 'label': t.label, 'subject': t.subject}, 'summary': summary, 'rows': rows})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def requests_list(request):
    denied = _admin(request)
    if denied:
        return denied
    qs = PrivacyRequest.objects.filter(school=request.tenant).select_related('student', 'handled_by')
    return Response({'results': [_request(r) for r in qs], 'statuses': dict(PrivacyRequest.STATUSES)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_update(request, request_id):
    denied = _admin(request)
    if denied:
        return denied
    r = get_object_or_404(PrivacyRequest, pk=request_id, school=request.tenant)
    d = request.data or {}
    if d.get('status') in dict(PrivacyRequest.STATUSES):
        r.status = d['status']
        r.closed_at = timezone.now() if r.status in ('done', 'refused') else None
    if 'response' in d:
        r.response = str(d['response'])[:4000]
    if r.status == 'refused' and not r.response.strip():
        return Response({'error': 'Explain why the request is refused.'}, status=status.HTTP_400_BAD_REQUEST)
    r.handled_by = request.user
    r.save()
    return Response({'request': _request(r)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_incident(request):
    denied = _admin(request)
    if denied:
        return denied
    d = request.data or {}
    title, description = str(d.get('title') or '').strip(), str(d.get('description') or '').strip()
    if not title or len(description) < 10:
        return Response({'error': 'Say what happened.'}, status=status.HTTP_400_BAD_REQUEST)
    inc = Incident.objects.create(reference=service.next_reference(), title=title[:200], description=description,
                                  reported_by=request.user, reported_by_email=request.user.email, status='reported')
    inc.schools.add(request.tenant)
    service.add_update(inc, f'Reported by {request.tenant.name}', request.user)
    return Response({'reference': inc.reference, 'message': f'Thank you. Reported as {inc.reference}; we will look into it straight away.'},
                    status=status.HTTP_201_CREATED)


# ---- Platform owner ---------------------------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def platform_documents(request):
    if request.method == 'POST':
        d = request.data or {}
        if d.get('kind') not in ('privacy', 'terms') or len(str(d.get('body') or '')) < 50:
            return Response({'error': 'Choose privacy or terms and write the text.'}, status=status.HTTP_400_BAD_REQUEST)
        doc = service.publish(d['kind'], str(d.get('title') or dict(LegalDocument.KINDS)[d['kind']]), str(d['body']),
                              by=request.user, summary=str(d.get('summary') or ''))
        return Response({'document': _doc(doc)}, status=status.HTTP_201_CREATED)
    out = {}
    for kind in ('privacy', 'terms'):
        doc = service.current(kind)
        title, body = service.platform_template(kind)
        out[kind] = {'current': _doc(doc) if doc else None, 'template': {'title': title, 'body': body},
                     'accepted': DocumentAcceptance.objects.filter(document=doc).count() if doc else 0}
    return Response(out)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsPlatformOwner])
def platform_subprocessors(request):
    d = request.data or {}
    if request.method == 'PUT':
        if not d.get('name') or not d.get('purpose'):
            return Response({'error': 'Name and purpose are needed.'}, status=status.HTTP_400_BAD_REQUEST)
        obj = SubProcessor.objects.filter(pk=d.get('id')).first() if d.get('id') else SubProcessor()
        for f in ('name', 'purpose', 'data', 'location', 'website'):
            setattr(obj, f, str(d.get(f) or '')[:255])
        obj.optional = bool(d.get('optional'))
        obj.save()
    elif request.method == 'DELETE':
        SubProcessor.objects.filter(pk=d.get('id') or request.GET.get('id')).delete()
    return Response({'subprocessors': [{'id': p.id, 'name': p.name, 'purpose': p.purpose, 'data': p.data, 'location': p.location,
                                        'optional': p.optional, 'website': p.website} for p in SubProcessor.objects.all()]})


def _incident(i, full=False):
    out = {'id': str(i.id), 'reference': i.reference, 'title': i.title, 'severity': i.severity, 'status': i.status,
           'status_label': i.get_status_display(), 'discovered_at': _local(i.discovered_at), 'regulator_deadline': _local(i.regulator_deadline),
           'regulator_overdue': bool(i.personal_data and not i.regulator_notified_at and i.status not in ('closed', 'not_a_breach')
                                     and timezone.now() > i.regulator_deadline),
           'schools': [s.name for s in i.schools.all()], 'reported_by': i.reported_by_email, 'personal_data': i.personal_data,
           'regulator_notified_at': _local(i.regulator_notified_at), 'schools_notified_at': _local(i.schools_notified_at),
           'people_notified_at': _local(i.people_notified_at)}
    if full:
        out.update({'description': i.description, 'data_affected': i.data_affected, 'people_affected': i.people_affected,
                    'school_ids': [str(s.pk) for s in i.schools.all()],
                    'checklist': [{'key': k, 'label': label, 'done_at': (i.checklist or {}).get(k)} for k, label in service.PLAYBOOK],
                    'updates': [{'note': u.note, 'by': u.by_name, 'when': _local(u.created_at)} for u in i.updates.all()]})
    return out


@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def platform_incidents(request):
    if request.method == 'POST':
        d = request.data or {}
        if not d.get('title') or len(str(d.get('description') or '')) < 10:
            return Response({'error': 'Give a title and describe what happened.'}, status=status.HTTP_400_BAD_REQUEST)
        inc = Incident.objects.create(reference=service.next_reference(), title=str(d['title'])[:200], description=str(d['description']),
                                      severity=d.get('severity') if d.get('severity') in dict(Incident.SEVERITIES) else 'medium',
                                      status='investigating', discovered_at=parse_datetime(str(d.get('discovered_at') or '')) or timezone.now(),
                                      reported_by=request.user, reported_by_email=request.user.email)
        service.add_update(inc, 'Incident opened', request.user)
        return Response({'incident': _incident(inc, True)}, status=status.HTTP_201_CREATED)
    return Response({'incidents': [_incident(i) for i in Incident.objects.prefetch_related('schools')],
                     'statuses': dict(Incident.STATUSES), 'severities': dict(Incident.SEVERITIES),
                     'schools': [{'id': str(s.pk), 'name': s.name} for s in School.objects.filter(is_active=True).order_by('name')]})


@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def platform_incident(request, incident_id):
    inc = get_object_or_404(Incident, pk=incident_id)
    if request.method == 'POST':
        d = request.data or {}
        action = d.get('action')
        if action == 'note' and str(d.get('note') or '').strip():
            service.add_update(inc, str(d['note']).strip(), request.user)
        elif action == 'step' and d.get('step') in dict(service.PLAYBOOK):
            cl = dict(inc.checklist or {})
            cl[d['step']] = None if cl.get(d['step']) else timezone.now().isoformat()
            inc.checklist = cl
            inc.save(update_fields=['checklist'])
        elif action == 'notify_schools':
            if not inc.schools.exists():
                return Response({'error': 'Add the affected schools first.'}, status=status.HTTP_400_BAD_REQUEST)
            service.notify_schools(inc, str(d.get('message') or inc.description), request.user)
        elif action == 'update':
            before = inc.status
            for f in ('title', 'description', 'data_affected'):
                if f in d:
                    setattr(inc, f, str(d[f]))
            if d.get('severity') in dict(Incident.SEVERITIES):
                inc.severity = d['severity']
            if d.get('status') in dict(Incident.STATUSES):
                inc.status = d['status']
                inc.closed_at = timezone.now() if inc.status in ('closed', 'not_a_breach') else None
            if 'people_affected' in d:
                inc.people_affected = int(d['people_affected']) if str(d['people_affected']).isdigit() else None
            if 'personal_data' in d:
                inc.personal_data = bool(d['personal_data'])
            for f in ('regulator_notified_at', 'people_notified_at'):
                if d.get(f) == 'now':
                    setattr(inc, f, timezone.now())
            if 'school_ids' in d:
                inc.schools.set(School.objects.filter(pk__in=d['school_ids']))
            inc.save()
            if before != inc.status:
                service.add_update(inc, f'Status: {dict(Incident.STATUSES)[before]} → {inc.get_status_display()}', request.user)
            if d.get('regulator_notified_at') == 'now':
                service.add_update(inc, 'Regulator notified', request.user)
        else:
            return Response({'error': 'Unknown action.'}, status=status.HTTP_400_BAD_REQUEST)
    inc.refresh_from_db()
    return Response({'incident': _incident(inc, True)})
