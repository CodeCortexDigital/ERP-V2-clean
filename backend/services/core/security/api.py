"""Privacy & security (Phase 21): activity log, sign-in history, who has access, roles, the school's rules, and
everyone's own sign-ins and data. /api/v1/security/"""
from __future__ import annotations

import csv
import json
from datetime import datetime, time, timedelta

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import filter_students_for_user, get_user_role, is_admin
from services.core.audit.models import AuditLog

from . import policy
from .access import ROLE_LABELS, ROLE_MATRIX, ROLE_ORDER, AREAS, area_of, school_people
from .models import SignInEvent
from services.core.accounts.models import AccountDeletionRequest

User = get_user_model()
PAGE = 50
ACTION_LABELS = {'CREATE': 'Added or ran', 'UPDATE': 'Changed', 'DELETE': 'Deleted', 'EXPORT': 'Exported',
                 'PERMISSION_DENIED': 'Refused', 'SECURITY': 'Security'}


def _admin_school(request):
    """(school, None) for a school administrator, else (None, error response)."""
    if not is_admin(request.user):
        return None, Response({'error': 'Only school administrators can see this.'}, status=status.HTTP_403_FORBIDDEN)
    school = getattr(request, 'tenant', None)
    if school is None:
        return None, Response({'error': 'Pick a school first.'}, status=status.HTTP_400_BAD_REQUEST)
    return school, None


def _name(user):
    return (getattr(user, 'full_name', '') or '').strip() or (user.email if user else '')


def _range(request, qs, field):
    start, end = parse_date(request.GET.get('from') or ''), parse_date(request.GET.get('to') or '')
    tz = timezone.get_current_timezone()
    if start:
        qs = qs.filter(**{f'{field}__gte': timezone.make_aware(datetime.combine(start, time.min), tz)})
    if end:
        qs = qs.filter(**{f'{field}__lt': timezone.make_aware(datetime.combine(end + timedelta(days=1), time.min), tz)})
    return qs


def _page(request, qs):
    try:
        page = max(1, int(request.GET.get('page') or 1))
    except ValueError:
        page = 1
    total = qs.count()
    return list(qs[(page - 1) * PAGE: page * PAGE]), {'page': page, 'pages': max(1, -(-total // PAGE)), 'total': total}


def _csv(filename, header, rows):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    writer = csv.writer(response)
    writer.writerow(header)
    writer.writerows(rows)
    return response


def _local(dt):
    return timezone.localtime(dt).isoformat() if dt else None


# ---- The school's rules ---------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rules_for_me(request):
    """The rules the app needs for everyone: idle sign-out and the password length."""
    rules = policy.security_settings(getattr(request, 'tenant', None))
    return Response({'idle_minutes': rules['idle_minutes'], 'password_min_length': rules['password_min_length']})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def settings_view(request):
    school, error = _admin_school(request)
    if error:
        return error
    if request.method == 'PUT':
        saved, problem = policy.save_settings(school, request.data or {})
        if problem:
            return Response({'error': problem}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'settings': saved, 'limits': policy.LIMITS})
    return Response({'settings': policy.security_settings(school), 'limits': policy.LIMITS, 'defaults': policy.DEFAULTS})


# ---- Overview -------------------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def overview(request):
    school, error = _admin_school(request)
    if error:
        return error
    people = school_people(school)
    users = User.objects.filter(id__in=list(people))
    week = timezone.now() - timedelta(days=7)
    signins = SignInEvent.objects.filter(school=school, created_at__gte=week)
    return Response({
        'people': len(people),
        'admins': sum(1 for r in people.values() if r == 'admin'),
        'locked': users.filter(account_locked_until__gt=timezone.now()).count(),
        'disabled': users.filter(is_active=False).count(),
        'never_signed_in': users.filter(last_login__isnull=True, is_active=True).count(),
        'deletion_requests': AccountDeletionRequest.objects.filter(user__in=users, status='pending').count(),
        'week': {
            'sign_ins': signins.filter(outcome='success').count(),
            'failed': signins.filter(outcome='failed').count(),
            'blocked': signins.filter(outcome__in=('locked', 'disabled')).count(),
            'changes': AuditLog.objects.filter(school=school, timestamp__gte=week).exclude(action='PERMISSION_DENIED').count(),
            'refused': AuditLog.objects.filter(school=school, timestamp__gte=week, action='PERMISSION_DENIED').count(),
        },
        'rules': policy.security_settings(school),
    })


# ---- Activity log ---------------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity(request):
    school, error = _admin_school(request)
    if error:
        return error
    qs = AuditLog.objects.filter(school=school).select_related('user').order_by('-timestamp')
    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(user__email__icontains=q) | Q(user__full_name__icontains=q) | Q(resource_type__icontains=q))
    if request.GET.get('action') in ACTION_LABELS:
        qs = qs.filter(action=request.GET['action'])
    area = request.GET.get('area')
    if area:
        keys = [k for k, label in AREAS if label == area]
        if keys:
            cond = Q()
            for k in keys:
                cond |= Q(resource_type__icontains=f'/{k}/') | Q(resource_type__istartswith=f'{k}/')
            qs = qs.filter(cond)
    if request.GET.get('user'):
        qs = qs.filter(user_id=request.GET['user'])
    qs = _range(request, qs, 'timestamp')

    def row(a):
        return {
            'id': str(a.id), 'when': _local(a.timestamp), 'user_id': str(a.user_id) if a.user_id else None,
            'who': _name(a.user) if a.user else 'System', 'email': a.user.email if a.user else '',
            'action': a.action, 'action_label': ACTION_LABELS.get(a.action, a.action.title()),
            'area': area_of(a.resource_type), 'path': '/' + (a.resource_type or ''),
            'record_id': str(a.resource_id) if a.resource_id else None,
            'method': (a.new_data or {}).get('method', ''), 'ip': a.ip_address,
        }

    if request.GET.get('export') == 'csv':
        rows = [row(a) for a in qs[:20000]]
        return _csv('activity-log.csv', ['When', 'Who', 'Email', 'What', 'Area', 'Address', 'Record', 'IP'],
                    [[r['when'], r['who'], r['email'], r['action_label'], r['area'], r['path'], r['record_id'] or '', r['ip'] or ''] for r in rows])
    items, paging = _page(request, qs)
    return Response({'results': [row(a) for a in items], **paging,
                     'areas': sorted({label for _, label in AREAS}), 'actions': ACTION_LABELS})


# ---- Sign-ins -------------------------------------------------------------------------------------------------

def _signin_row(e):
    return {'id': str(e.id), 'when': _local(e.created_at), 'email': e.email, 'user_id': str(e.user_id) if e.user_id else None,
            'who': _name(e.user) if e.user else e.email, 'outcome': e.outcome, 'outcome_label': e.get_outcome_display(),
            'method': e.method, 'ip': e.ip_address, 'device': _device(e.user_agent)}


def _device(agent: str) -> str:
    a = (agent or '').lower()
    browser = next((n for k, n in (('edg/', 'Edge'), ('chrome/', 'Chrome'), ('firefox/', 'Firefox'), ('safari/', 'Safari')) if k in a), '')
    system = next((n for k, n in (('android', 'Android'), ('iphone', 'iPhone'), ('ipad', 'iPad'), ('windows', 'Windows'),
                                  ('mac os', 'Mac'), ('linux', 'Linux')) if k in a), '')
    return ' on '.join(x for x in (browser, system) if x) or ('Unknown device' if a else '')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sign_ins(request):
    school, error = _admin_school(request)
    if error:
        return error
    qs = SignInEvent.objects.filter(school=school).select_related('user')
    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(user__full_name__icontains=q) | Q(ip_address__startswith=q))
    if request.GET.get('outcome') in dict(SignInEvent.OUTCOMES):
        qs = qs.filter(outcome=request.GET['outcome'])
    if request.GET.get('user'):
        qs = qs.filter(user_id=request.GET['user'])
    qs = _range(request, qs, 'created_at')
    if request.GET.get('export') == 'csv':
        rows = [_signin_row(e) for e in qs[:20000]]
        return _csv('sign-ins.csv', ['When', 'Who', 'Email', 'Result', 'How', 'IP', 'Device'],
                    [[r['when'], r['who'], r['email'], r['outcome_label'], r['method'], r['ip'] or '', r['device']] for r in rows])
    items, paging = _page(request, qs)
    return Response({'results': [_signin_row(e) for e in items], **paging, 'outcomes': dict(SignInEvent.OUTCOMES)})


# ---- People & access ------------------------------------------------------------------------------------------

def _person(u, role, me):
    locked = policy.locked_minutes(u)
    return {
        'id': str(u.id), 'name': _name(u), 'email': u.email, 'role': role, 'role_label': ROLE_LABELS.get(role, role.title()),
        'active': u.is_active, 'locked_minutes': locked, 'last_sign_in': _local(u.last_login), 'last_ip': u.last_login_ip,
        'failed_attempts': u.failed_login_attempts or 0, 'is_me': u.pk == me.pk, 'platform_owner': u.is_superuser,
        'deletion_requested': AccountDeletionRequest.objects.filter(user=u, status='pending').exists(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def people(request):
    school, error = _admin_school(request)
    if error:
        return error
    roles = school_people(school)
    qs = User.objects.filter(id__in=list(roles)).order_by('full_name', 'email')
    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(full_name__icontains=q) | Q(email__icontains=q))
    role = request.GET.get('role')
    if role:
        qs = qs.filter(id__in=[uid for uid, r in roles.items() if r == role])
    state = request.GET.get('status')
    if state == 'locked':
        qs = qs.filter(account_locked_until__gt=timezone.now())
    elif state == 'disabled':
        qs = qs.filter(is_active=False)
    elif state == 'never':
        qs = qs.filter(last_login__isnull=True)
    elif state == 'failed':
        qs = qs.filter(failed_login_attempts__gt=0)
    elif state == 'deletion':
        qs = qs.filter(deletion_requests__status='pending').distinct()
    counts = {r: 0 for r in ROLE_ORDER}
    for r in roles.values():
        counts[r] = counts.get(r, 0) + 1
    items, paging = _page(request, qs)
    return Response({'results': [_person(u, roles[u.pk], request.user) for u in items], **paging,
                     'roles': [{'code': r, 'label': ROLE_LABELS.get(r, r.title()), 'count': counts.get(r, 0)} for r in ROLE_ORDER]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def person_action(request, user_id):
    school, error = _admin_school(request)
    if error:
        return error
    roles = school_people(school)
    target = User.objects.filter(pk=user_id).first()
    if target is None or target.pk not in roles:
        return Response({'error': 'That person does not belong to this school.'}, status=status.HTTP_404_NOT_FOUND)
    action = (request.data or {}).get('action')
    if target.is_superuser and not request.user.is_superuser:
        return Response({'error': "The platform owner's account can't be changed here."}, status=status.HTTP_403_FORBIDDEN)
    if action == 'disable' and target.pk == request.user.pk:
        return Response({'error': "You can't switch off your own account."}, status=status.HTTP_400_BAD_REQUEST)
    if action == 'disable' and roles[target.pk] == 'admin':
        other_admins = [uid for uid, r in roles.items() if r == 'admin' and uid != target.pk]
        if not User.objects.filter(pk__in=other_admins, is_active=True).exists():
            return Response({'error': 'This is the only administrator. Add another before switching this account off.'},
                            status=status.HTTP_400_BAD_REQUEST)

    if action == 'unlock':
        policy.unlock(target)
        message = f'{_name(target)} can sign in again.'
    elif action == 'sign_out':
        policy.revoke_sessions(target)
        message = f'{_name(target)} has been signed out on every device.'
    elif action == 'disable':
        target.is_active = False
        target.save(update_fields=['is_active'])
        policy.revoke_sessions(target)
        AccountDeletionRequest.objects.filter(user=target, status='pending').update(status='completed', processed_at=timezone.now())
        message = f"{_name(target)}'s account is switched off."
    elif action == 'enable':
        target.is_active = True
        target.save(update_fields=['is_active'])
        policy.unlock(target)
        message = f"{_name(target)}'s account is switched on."
    else:
        return Response({'error': 'Unknown action.'}, status=status.HTTP_400_BAD_REQUEST)
    AuditLog.objects.create(user=request.user, school=school, action='SECURITY', resource_type=f'v1/security/people/{target.pk}/{action}/',
                            resource_id=target.pk, new_data={'action': action, 'person': target.email}, ip_address=policy.client_ip(request))
    target.refresh_from_db()
    return Response({'message': message, 'person': _person(target, roles[target.pk], request.user)})


# ---- Roles ----------------------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def roles(request):
    school, error = _admin_school(request)
    if error:
        return error
    counts = {}
    for r in school_people(school).values():
        counts[r] = counts.get(r, 0) + 1
    return Response({
        'roles': [{'code': r, 'label': ROLE_LABELS[r], 'count': counts.get(r, 0)} for r in ROLE_ORDER],
        'areas': [{'area': area, 'access': access} for area, access in ROLE_MATRIX],
    })


# ---- My own sign-ins and data ---------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    events = SignInEvent.objects.filter(user=request.user)[:20]
    return Response({
        'sign_ins': [_signin_row(e) for e in events],
        'failed_since_last': SignInEvent.objects.filter(user=request.user, outcome='failed',
                                                        created_at__gte=_previous_success(request.user)).count(),
        'rules': {k: v for k, v in policy.security_settings(getattr(request, 'tenant', None)).items() if k in ('idle_minutes', 'password_min_length')},
        'deletion_requested': AccountDeletionRequest.objects.filter(user=request.user, status='pending').exists(),
    })


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def deletion_request(request):
    """Ask the school office to delete my account (the office decides, because the school may have to keep records)."""
    pending = AccountDeletionRequest.objects.filter(user=request.user, status='pending')
    if request.method == 'DELETE':
        pending.update(status='cancelled', processed_at=timezone.now())
        return Response({'message': 'Your request has been withdrawn.', 'deletion_requested': False})
    if not pending.exists():
        AccountDeletionRequest.objects.create(user=request.user)
    return Response({'message': 'The school office has been asked to delete your account. They will contact you if they need to keep any records.',
                     'deletion_requested': True})


def _previous_success(user):
    """When this person signed in before the current session (failed attempts since then are worth knowing about)."""
    successes = list(SignInEvent.objects.filter(user=user, outcome='success').values_list('created_at', flat=True)[:2])
    return successes[1] if len(successes) > 1 else timezone.now() - timedelta(days=30)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sign_out_everywhere(request):
    policy.revoke_sessions(request.user)
    return Response({'message': 'Signed out on every device, including this one.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_data(request):
    """Everything the school system holds about the person's account, as a JSON download."""
    user = request.user
    role = get_user_role(user)
    school = getattr(request, 'tenant', None)
    data = {
        'exported_at': timezone.now().isoformat(),
        'school': getattr(school, 'name', None),
        'account': {'email': user.email, 'name': _name(user), 'phone': user.phone_number, 'role': role,
                    'created': _local(user.created_at), 'last_sign_in': _local(user.last_login),
                    'language': user.preferred_language, 'email_notifications': user.email_notifications,
                    'sms_notifications': user.sms_notifications},
        'sign_ins': [_signin_row(e) for e in SignInEvent.objects.filter(user=user)[:500]],
        'activity': [{'when': _local(a.timestamp), 'what': ACTION_LABELS.get(a.action, a.action), 'area': area_of(a.resource_type)}
                     for a in AuditLog.objects.filter(user=user, school=school).order_by('-timestamp')[:1000]] if school else [],
        'consents': [{'type': c.consent_type, 'version': c.version, 'given': c.given, 'given_at': _local(c.given_at),
                      'revoked_at': _local(c.revoked_at)} for c in user.consents.all()],
    }
    if role in ('parent', 'student'):
        Student = apps.get_model('education_students', 'Student')
        data['students'] = [{'name': s.full_name, 'student_number': s.student_id,
                             'class': getattr(s.current_class, 'name', None), 'date_of_birth': str(s.date_of_birth) if getattr(s, 'date_of_birth', None) else None}
                            for s in filter_students_for_user(user, Student.objects.select_related('current_class'))[:20]]
    response = HttpResponse(json.dumps(data, indent=2, default=str), content_type='application/json')
    response['Content-Disposition'] = 'attachment; filename="my-data.json"'
    return response
