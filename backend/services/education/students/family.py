"""Parent portal: one account, the whole family.

- ``family/``                          every child with their key numbers, the household(s), guardians and my update requests
- ``family/changes/``                  POST: ask the office to update household or guardian contact details
- ``family/applications/``             the family's admission applications and re-enrolment answers
- ``family-updates/``                  office: update requests (``?status=pending``)
- ``family-updates/<id>/review/``      office: POST ``{"approve": true|false, "note": ""}``
"""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import filter_students_for_user, get_user_role, is_admin

from .models import ContactChangeRequest, Guardian, Household, Student
from .portal import _attendance, _average, _current_term, _student_payload, _subject_grades, assignment_items

RELATION = dict(Guardian.RELATIONSHIPS)


def _children(user):
    if get_user_role(user) not in ('parent', 'student'):
        return []
    return list(filter_students_for_user(user, Student.objects.filter(is_active=True))
                .select_related('current_class', 'current_section', 'household').order_by('full_name'))


def _households(kids) -> list[Household]:
    seen, out = set(), []
    for k in kids:
        if k.household_id and k.household_id not in seen:
            seen.add(k.household_id)
            out.append(k.household)
    return out


def _is_me(g: Guardian, user) -> bool:
    return g.user_id == user.pk or bool(g.email and user.email and g.email.lower() == user.email.lower())


def child_summary(request, s: Student, term, today) -> dict:
    """The numbers a parent scans first for one child."""
    from services.education.attendance.models import AttendanceRecord
    from services.education.behaviour.models import BehaviourIncident
    from services.education.finance.models import Invoice

    start = term.start_date if term else today - timedelta(days=90)
    att = _attendance(s, start, min(today, term.end_date) if term else today)
    subjects = _subject_grades(s, term)
    work = assignment_items(s, since=today - timedelta(days=30))
    soon = (today + timedelta(days=14)).isoformat()
    due = [w for w in work if w['status'] in ('upcoming', 'due_today') and w['due_date'] and w['due_date'] <= soon]
    overdue = [w for w in work if w['status'] in ('overdue', 'missing')]
    open_inv = [i for i in Invoice.objects.filter(student=s).exclude(status__in=('cancelled', 'carried_forward', 'draft'))
                if i.balance_due > 0]
    balance = sum((Decimal(i.balance_due) for i in open_inv), Decimal('0'))
    overdue_inv = [i for i in open_inv if i.due_date < today]
    open_incidents = BehaviourIncident.objects.filter(student=s, visible_to_family=True, kind='negative').exclude(
        status='resolved').count()
    alerts = []
    if att['rate'] is not None and att['rate'] < 90 and att['total'] >= 10:
        alerts.append(f"Attendance {att['rate']}%")
    if overdue:
        alerts.append(f'{len(overdue)} overdue')
    if overdue_inv:
        alerts.append('Fees overdue')
    if open_incidents:
        alerts.append(f'{open_incidents} open incident(s)')
    return {
        **_student_payload(request, s),
        'today': AttendanceRecord.objects.filter(student=s, date=today).values_list('status', flat=True).first(),
        'attendance_rate': att['rate'], 'absences': att['absent'] + att['excused'],
        'average': _average(subjects), 'missing': sum(x['missing'] for x in subjects),
        'due_count': len(due), 'overdue_count': len(overdue),
        'next_due': min(due, key=lambda w: w['due_date'])['title'] if due else None,
        'balance': float(balance), 'overdue_fees': float(sum((Decimal(i.balance_due) for i in overdue_inv), Decimal('0'))),
        'open_incidents': open_incidents, 'alerts': alerts,
    }


def _household_payload(h: Household, user, kids) -> dict:
    kid_ids = {k.id for k in kids}
    guardians = []
    for g in h.guardians.all().prefetch_related('student_links__student'):
        links = [l for l in g.student_links.all() if l.student_id in kid_ids]
        guardians.append({
            'id': str(g.id), 'name': g.full_name, 'relationship': g.relationship,
            'relationship_label': RELATION.get(g.relationship, g.relationship),
            'email': g.email, 'mobile_phone': g.mobile_phone, 'home_phone': g.home_phone, 'work_phone': g.work_phone,
            'occupation': g.occupation, 'employer': g.employer, 'address': g.address,
            'preferred_language': g.preferred_language, 'is_me': _is_me(g, user),
            'children': [{'name': l.student.full_name, 'primary': l.is_primary, 'pickup': l.can_pickup,
                          'emergency': l.is_emergency_contact, 'billing': l.receives_billing} for l in links],
        })
    return {'id': str(h.id), 'name': h.name, 'address': h.address, 'city': h.city, 'state': h.state,
            'postal_code': h.postal_code, 'country': h.country, 'phone': h.phone, 'email': h.email,
            'preferred_language': h.preferred_language, 'guardians': guardians,
            'children': [k.full_name for k in kids if k.household_id == h.id]}


def _request_payload(r: ContactChangeRequest) -> dict:
    target = (f'{r.guardian.full_name} (guardian)' if r.guardian_id else
              f'{r.household.name} (household)' if r.household_id else '')
    return {'id': str(r.id), 'target': target, 'household_id': str(r.household_id) if r.household_id else None,
            'guardian_id': str(r.guardian_id) if r.guardian_id else None, 'changes': r.changes, 'note': r.note,
            'status': r.status, 'status_label': r.get_status_display(), 'review_note': r.review_note,
            'requested_by': (r.requested_by.full_name or r.requested_by.email) if r.requested_by_id else '',
            'created_at': r.created_at.isoformat(), 'reviewed_at': r.reviewed_at.isoformat() if r.reviewed_at else None}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def family(request):
    kids = _children(request.user)
    today = timezone.localdate()
    term = _current_term()
    children = [child_summary(request, k, term, today) for k in kids]
    households = _households(kids)
    mine = ContactChangeRequest.objects.filter(requested_by=request.user).select_related('guardian', 'household', 'requested_by')[:20]
    return Response({
        'term': {'id': str(term.id), 'name': term.name} if term else None,
        'children': children,
        'totals': {'balance': round(sum(c['balance'] for c in children), 2),
                   'overdue_fees': round(sum(c['overdue_fees'] for c in children), 2),
                   'due_count': sum(c['due_count'] for c in children),
                   'overdue_count': sum(c['overdue_count'] for c in children)},
        'households': [_household_payload(h, request.user, kids) for h in households],
        'requests': [_request_payload(r) for r in mine],
        'fields': {'household': list(ContactChangeRequest.HOUSEHOLD_FIELDS), 'guardian': list(ContactChangeRequest.GUARDIAN_FIELDS)},
    })


def _notify(users, title, message):
    from services.core.user_notifications.utils import create_user_notification

    for u in users:
        create_user_notification(u, title, message, 'system')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_change(request):
    """``{"household_id"| "guardian_id": id, "changes": {field: value}, "note": ""}`` → a request for the office."""
    from services.education.communication.inbox import admin_users

    kids = _children(request.user)
    if get_user_role(request.user) != 'parent' or not kids:
        return Response({'error': 'Only parents can ask for contact changes.'}, status=403)
    households = {str(h.id): h for h in _households(kids)}
    raw = request.data.get('changes') or {}
    if not isinstance(raw, dict):
        return Response({'error': 'Nothing to change.'}, status=400)
    guardian = household = None
    if request.data.get('guardian_id'):
        guardian = Guardian.objects.filter(pk=request.data['guardian_id'], household_id__in=list(households)).first()
        if guardian is None:
            return Response({'error': 'Guardian not found.'}, status=404)
        allowed, obj = ContactChangeRequest.GUARDIAN_FIELDS, guardian
    elif request.data.get('household_id') in households:
        household = households[request.data['household_id']]
        allowed, obj = ContactChangeRequest.HOUSEHOLD_FIELDS, household
    else:
        return Response({'error': 'Household not found.'}, status=404)
    changes = {}
    for field, value in raw.items():
        if field not in allowed:
            continue
        new, old = str(value or '').strip()[:500], str(getattr(obj, field) or '')
        if new != old:
            changes[field] = {'from': old, 'to': new}
    if 'email' in changes and changes['email']['to']:
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(changes['email']['to'])
        except ValidationError:
            return Response({'error': 'Enter a valid email address.'}, status=400)
    if not changes:
        return Response({'error': 'Nothing has changed.'}, status=400)
    r = ContactChangeRequest.objects.create(
        tenant=obj.tenant, household=household, guardian=guardian, changes=changes,
        note=str(request.data.get('note') or '')[:1000], requested_by=request.user)
    who = request.user.full_name or request.user.email
    school = obj.tenant or getattr(request, 'tenant', None)
    if school is not None:
        _notify(admin_users(school), 'Family details update',
                f'{who} asked to update {len(changes)} detail(s) for {guardian.full_name if guardian else household.name}.')
    return Response(_request_payload(r), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def change_requests(request):
    if not is_admin(request.user):
        return Response({'error': 'Only the office can review family updates.'}, status=403)
    qs = ContactChangeRequest.objects.select_related('guardian', 'household', 'requested_by')
    status = request.query_params.get('status')
    if status:
        qs = qs.filter(status=status)
    return Response({'pending': ContactChangeRequest.objects.filter(status='pending').count(),
                     'results': [_request_payload(r) for r in qs[:200]]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def review_change(request, id):
    if not is_admin(request.user):
        return Response({'error': 'Only the office can review family updates.'}, status=403)
    r = get_object_or_404(ContactChangeRequest.objects.select_related('guardian', 'household'), pk=id)
    if r.status != 'pending':
        return Response({'error': 'This request has already been reviewed.'}, status=400)
    approve = bool(request.data.get('approve'))
    if approve:
        obj = r.guardian or r.household
        if obj is None:
            return Response({'error': 'The record no longer exists.'}, status=400)
        allowed = ContactChangeRequest.GUARDIAN_FIELDS if r.guardian_id else ContactChangeRequest.HOUSEHOLD_FIELDS
        for field, change in r.changes.items():
            if field in allowed:
                setattr(obj, field, change.get('to', ''))
        obj.save()
    r.status = 'approved' if approve else 'declined'
    r.review_note = str(request.data.get('note') or '')[:1000]
    r.reviewed_by = request.user
    r.reviewed_at = timezone.now()
    r.save()
    if r.requested_by_id:
        msg = 'Your contact details were updated.' if approve else 'The school could not make the change you asked for.'
        _notify([r.requested_by], 'Family details update', f'{msg}{" " + r.review_note if r.review_note else ""}')
    return Response(_request_payload(r))


# ---------------------------------------------------------------------------
# Applications and re-enrolment
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def applications(request):
    """Applications this family made (by the parent's email or for their children) and every re-enrolment answer."""
    from services.education.admissions.models import Application, ReEnrollmentResponse
    from services.education.admissions.views import _public_school, _settings

    if get_user_role(request.user) != 'parent':
        return Response({'applications': [], 'reenrollment': [], 'apply_url': None})
    kids = _children(request.user)
    kid_ids = [k.id for k in kids]
    email = (request.user.email or '').strip()
    school = getattr(request, 'tenant', None) or (kids[0].tenant if kids and kids[0].tenant_id else None)
    match = Q(converted_to_student_id__in=kid_ids)
    if email:
        match |= Q(applicant__email__iexact=email) | Q(applicant__guardians__icontains=email)
    qs = Application.objects.filter(match).select_related('applicant').prefetch_related('events', 'documents')
    if school is not None:
        qs = qs.filter(applicant__tenant=school)
    labels = dict(Application.STATUS_CHOICES)
    apps = []
    for a in qs.distinct():
        steps = [{'status': e.to_status, 'label': labels.get(e.to_status, e.to_status), 'at': e.at.isoformat()}
                 for e in a.events.all() if e.to_status and e.to_status != e.from_status]
        decided = a.status in ('approved', 'rejected', 'waitlisted', 'enrolled')
        apps.append({
            'id': str(a.id), 'application_no': a.application_no, 'student': a.applicant.full_name,
            'applying_for': a.applicant.applying_for_class, 'academic_year': a.academic_year,
            'status': a.status, 'status_label': labels.get(a.status, a.status), 'source': a.source,
            'submitted_at': a.submitted_at.isoformat(), 'decided_at': a.decided_at.isoformat() if a.decided_at else None,
            'decision_note': a.status_notes if decided else '',
            'interview_date': a.interview_date.isoformat() if a.interview_date else None,
            'documents': a.documents.count(), 'steps': steps,
        })
    reen = [{'id': str(r.id), 'student': r.student.full_name, 'campaign': r.campaign.title,
             'academic_year': r.campaign.academic_year, 'open': r.campaign.is_open, 'closes_on': r.campaign.closes_on,
             'intent': r.intent, 'responded_at': r.responded_at}
            for r in ReEnrollmentResponse.objects.filter(student_id__in=kid_ids).select_related('campaign', 'student')
            .order_by('-campaign__created_at', 'student__full_name')]
    apply_url = None
    if school is not None and _settings(school)['online_open'] and school.subdomain:
        if _public_school(school.subdomain) is not None:
            apply_url = f'/apply/{school.subdomain}'
    return Response({'applications': apps, 'reenrollment': reen, 'apply_url': apply_url})
