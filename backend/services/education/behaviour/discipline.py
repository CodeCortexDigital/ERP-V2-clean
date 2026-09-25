"""Behaviour management: merit and incident categories, the behaviour log (one student or a whole
group at once), actions and follow-ups, family alerts, points milestones, student history and reports."""
from __future__ import annotations

import logging
import uuid
from collections import Counter, defaultdict
from datetime import date, timedelta

from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import (
    _get_teacher_class_ids, ensure_student_access, filter_students_for_user, get_user_role, is_admin,
)

from .models import BehaviourAction, BehaviourCategory, BehaviourIncident, BehaviourSettings, MilestoneAward

logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES = [
    # (name, kind, points, severity, notify_family)
    ('Helping others', 'positive', 2, 'low', False),
    ('Excellent work', 'positive', 2, 'low', False),
    ('Participation', 'positive', 1, 'low', False),
    ('Kindness', 'positive', 1, 'low', False),
    ('Leadership', 'positive', 3, 'low', False),
    ('Homework not done', 'negative', -1, 'low', False),
    ('Late to class', 'negative', -1, 'low', False),
    ('Disrupting the class', 'negative', -2, 'medium', False),
    ('Disrespect', 'negative', -3, 'medium', True),
    ('Uniform / dress code', 'negative', -1, 'low', False),
    ('Mobile phone misuse', 'negative', -2, 'medium', True),
    ('Bullying', 'negative', -5, 'high', True),
    ('Fighting', 'negative', -5, 'high', True),
    ('Cheating', 'negative', -5, 'high', True),
    ('Damage to property', 'negative', -4, 'high', True),
]
DEFAULT_MILESTONES = [{'points': 25, 'name': 'Bronze award'}, {'points': 50, 'name': 'Silver award'},
                      {'points': 100, 'name': 'Gold award'}]
ADMIN_ONLY_ACTIONS = {'suspension', 'in_school_suspension'}


def _staff(user) -> bool:
    return get_user_role(user) in ('admin', 'teacher')


def _school(request):
    return getattr(request, 'tenant', None)


def categories_for(school):
    qs = BehaviourCategory.objects.all()
    if not qs.exists() and school is not None:
        for i, (name, kind, points, severity, notify) in enumerate(DEFAULT_CATEGORIES):
            BehaviourCategory.objects.get_or_create(tenant=school, name=name, defaults=dict(
                kind=kind, points=points, severity=severity, notify_family=notify, order=i))
        qs = BehaviourCategory.objects.all()
    return qs


def settings_for(school) -> BehaviourSettings:
    obj = BehaviourSettings.objects.first()
    if obj is None:
        obj = BehaviourSettings.objects.create(tenant=school, milestones=DEFAULT_MILESTONES)
    return obj


def _students():
    from services.education.students.models import Student

    return Student.objects.filter(is_active=True)


def _visible_incidents(user):
    """Incidents this person may see."""
    role = get_user_role(user)
    qs = BehaviourIncident.objects.select_related('student', 'student__current_class', 'category', 'reported_by')
    if role == 'admin':
        return qs
    if role == 'teacher':
        return qs.filter(Q(student__current_class_id__in=list(_get_teacher_class_ids(user))) | Q(reported_by=user))
    kids = filter_students_for_user(user, _students())
    return qs.filter(student__in=kids, visible_to_family=True)


def _can_edit(user, inc: BehaviourIncident) -> bool:
    return is_admin(user) or inc.reported_by_id == user.pk


def _cat_payload(c: BehaviourCategory) -> dict:
    return {'id': str(c.id), 'name': c.name, 'kind': c.kind, 'points': c.points, 'severity': c.severity,
            'notify_family': c.notify_family, 'is_active': c.is_active, 'order': c.order}


def _action_payload(a: BehaviourAction) -> dict:
    return {'id': str(a.id), 'action_type': a.action_type, 'label': a.get_action_type_display(),
            'start_date': a.start_date.isoformat() if a.start_date else None,
            'end_date': a.end_date.isoformat() if a.end_date else None, 'notes': a.notes, 'completed': a.completed,
            'by': (a.created_by.full_name or a.created_by.email) if a.created_by_id else '', 'at': a.created_at.isoformat()}


def _payload(i: BehaviourIncident, user=None, family=False) -> dict:
    out = {'id': str(i.id), 'student': {'id': str(i.student_id), 'full_name': i.student.full_name,
                                        'class_name': i.student.current_class.name if i.student.current_class_id else ''},
           'category': {'id': str(i.category_id), 'name': i.category.name}, 'kind': i.kind, 'points': i.points,
           'severity': i.severity, 'date': i.date.isoformat(), 'time': i.time.strftime('%H:%M') if i.time else None,
           'location': i.location, 'description': i.description, 'status': i.status,
           'follow_up_date': i.follow_up_date.isoformat() if i.follow_up_date else None,
           'reported_by': (i.reported_by.full_name or i.reported_by.email) if i.reported_by_id else '',
           'actions': [_action_payload(a) for a in i.actions.all() if not family or a.action_type != 'follow_up'],
           'created_at': i.created_at.isoformat()}
    if not family:
        out.update({'visible_to_family': i.visible_to_family,
                    'family_notified_at': i.family_notified_at.isoformat() if i.family_notified_at else None,
                    'editable': bool(user and _can_edit(user, i))})
    return out


# ---------------------------------------------------------------------------
# Family alerts and milestones
# ---------------------------------------------------------------------------

def _tell_family(student, subject: str, message: str) -> bool:
    from services.education.attendance.register import _recipients, _school_name
    from services.education.communication.inbox import _in_background

    emails, users = _recipients(student)
    try:
        from services.core.user_notifications.utils import create_user_notification

        for u in users:
            create_user_notification(u, subject, message, 'system')
    except Exception:
        logger.exception('Behaviour notice failed')
    if emails:
        school = _school_name(student)
        _in_background(lambda: send_mail(f'{school}: {subject}', message, None, emails, fail_silently=True))
    return bool(emails or users)


def notify_incident(inc: BehaviourIncident) -> None:
    if not inc.visible_to_family:
        return
    when = inc.date.strftime('%d %b %Y')
    if inc.kind == 'positive':
        text = f'{inc.student.full_name} was recognised for "{inc.category.name}" on {when} (+{inc.points} points).'
    else:
        text = f'We need to let you know about a behaviour incident involving {inc.student.full_name} on {when}: {inc.category.name}.'
    if inc.description:
        text += f'\n\n{inc.description}'
    text += '\n\nYou can see the details in the parent portal. Please contact the school if you have any questions.'
    if _tell_family(inc.student, f'Behaviour: {inc.student.full_name}', text):
        BehaviourIncident.objects.filter(pk=inc.pk).update(family_notified_at=timezone.now())


def student_points(student) -> int:
    return BehaviourIncident.objects.filter(student=student).aggregate(s=Sum('points'))['s'] or 0


def check_milestones(student, school) -> list[str]:
    """Award every milestone the student's positive points have reached (each only once)."""
    cfg = settings_for(school)
    positive = BehaviourIncident.objects.filter(student=student, kind='positive').aggregate(s=Sum('points'))['s'] or 0
    won = []
    for m in sorted(cfg.milestones or [], key=lambda m: m.get('points', 0)):
        pts = int(m.get('points') or 0)
        if pts <= 0 or positive < pts:
            continue
        try:
            with transaction.atomic():
                MilestoneAward.objects.create(tenant=student.tenant, student=student, points=pts, name=str(m.get('name') or f'{pts} points'))
        except IntegrityError:
            continue
        won.append(m.get('name') or f'{pts} points')
        if cfg.notify_milestones:
            _tell_family(student, f'Award: {student.full_name}',
                         f'Congratulations! {student.full_name} has earned the {m.get("name")} for reaching {pts} positive behaviour points.')
    return won


# ---------------------------------------------------------------------------
# Categories and settings
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def categories(request):
    if request.method == 'GET':
        qs = categories_for(_school(request))
        if request.query_params.get('active'):
            qs = qs.filter(is_active=True)
        return Response([_cat_payload(c) for c in qs])
    if not is_admin(request.user):
        return Response({'error': 'Only the office can change behaviour categories.'}, status=403)
    c = BehaviourCategory(tenant=_school(request))
    return _save_category(c, request.data, created=True)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detail(request, cat_id):
    if not is_admin(request.user):
        return Response({'error': 'Only the office can change behaviour categories.'}, status=403)
    c = get_object_or_404(BehaviourCategory, pk=cat_id)
    if request.method == 'DELETE':
        if c.incidents.exists():
            c.is_active = False
            c.save(update_fields=['is_active'])
            return Response(_cat_payload(c))
        c.delete()
        return Response(status=204)
    return _save_category(c, request.data)


def _save_category(c, data, created=False):
    c.name = str(data.get('name', c.name) or '').strip()[:100]
    if not c.name:
        return Response({'error': 'Give the category a name.'}, status=400)
    c.kind = data.get('kind') if data.get('kind') in ('positive', 'negative') else (c.kind or 'positive')
    try:
        pts = int(data.get('points', c.points if not created else (1 if c.kind == 'positive' else -1)))
    except (TypeError, ValueError):
        return Response({'error': 'Points must be a whole number.'}, status=400)
    c.points = abs(pts) if c.kind == 'positive' else -abs(pts)
    c.severity = data.get('severity') if data.get('severity') in dict(BehaviourCategory.SEVERITIES) else c.severity
    for f in ('notify_family', 'is_active'):
        if f in data:
            setattr(c, f, bool(data.get(f)))
    if 'order' in data and str(data.get('order')).isdigit():
        c.order = int(data['order'])
    if BehaviourCategory.objects.filter(name__iexact=c.name).exclude(pk=c.pk).exists():
        return Response({'error': 'A category with this name already exists.'}, status=400)
    c.save()
    return Response(_cat_payload(c), status=201 if created else 200)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def behaviour_settings(request):
    cfg = settings_for(_school(request))
    if request.method == 'PUT':
        if not is_admin(request.user):
            return Response({'error': 'Only the office can change these settings.'}, status=403)
        rows = []
        for m in request.data.get('milestones') or []:
            try:
                pts = int(m.get('points'))
            except (TypeError, ValueError, AttributeError):
                continue
            if pts > 0 and str(m.get('name') or '').strip():
                rows.append({'points': pts, 'name': str(m['name']).strip()[:100]})
        cfg.milestones = sorted(rows, key=lambda m: m['points'])
        if 'notify_milestones' in request.data:
            cfg.notify_milestones = bool(request.data.get('notify_milestones'))
        cfg.save()
    return Response({'milestones': cfg.milestones, 'notify_milestones': cfg.notify_milestones})


# ---------------------------------------------------------------------------
# The behaviour log
# ---------------------------------------------------------------------------

def _d(value, default=None):
    try:
        return date.fromisoformat(str(value)[:10]) if value else default
    except ValueError:
        return default


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def incidents(request):
    if request.method == 'GET':
        qs = _visible_incidents(request.user).prefetch_related('actions', 'actions__created_by')
        p = request.query_params
        if p.get('student'):
            qs = qs.filter(student_id=p['student'])
        if p.get('class'):
            qs = qs.filter(student__current_class_id=p['class'])
        if p.get('kind') in ('positive', 'negative'):
            qs = qs.filter(kind=p['kind'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('category'):
            qs = qs.filter(category_id=p['category'])
        if p.get('follow_up'):
            qs = qs.filter(follow_up_date__lte=timezone.localdate()).exclude(status='resolved')
        if p.get('from'):
            qs = qs.filter(date__gte=_d(p['from']))
        if p.get('to'):
            qs = qs.filter(date__lte=_d(p['to']))
        if p.get('q'):
            qs = qs.filter(Q(student__full_name__icontains=p['q']) | Q(description__icontains=p['q']))
        family = not _staff(request.user)
        return Response([_payload(i, request.user, family) for i in qs[:500]])

    if not _staff(request.user):
        return Response({'error': 'Only staff can log behaviour.'}, status=403)
    data = request.data
    cat = BehaviourCategory.objects.filter(pk=data.get('category'), is_active=True).first() if data.get('category') else None
    if cat is None:
        return Response({'error': 'Choose what happened.'}, status=400)
    ids = data.get('student_ids') or ([data['student']] if data.get('student') else [])
    students = list(_students().filter(pk__in=[str(x) for x in ids]))
    if not students:
        return Response({'error': 'Choose at least one student.'}, status=400)
    for s in students:
        if not ensure_student_access(request.user, s):
            return Response({'error': f'You can only log behaviour for students you teach ({s.full_name}).'}, status=403)
    day = _d(data.get('date'), timezone.localdate())
    if day > timezone.localdate():
        return Response({'error': 'The date cannot be in the future.'}, status=400)
    points = cat.points
    if is_admin(request.user) and data.get('points') not in (None, ''):
        try:
            points = abs(int(data['points'])) * (1 if cat.kind == 'positive' else -1)
        except (TypeError, ValueError):
            pass
    from datetime import time as dtime

    try:
        at = dtime.fromisoformat(str(data['time'])) if data.get('time') else None
    except ValueError:
        at = None
    group = uuid.uuid4() if len(students) > 1 else None
    made = []
    with transaction.atomic():
        for s in students:
            made.append(BehaviourIncident.objects.create(
                tenant=s.tenant, student=s, category=cat, kind=cat.kind, points=points, severity=cat.severity,
                date=day, time=at, location=str(data.get('location') or '')[:120],
                description=str(data.get('description') or '')[:5000],
                status='resolved' if cat.kind == 'positive' else 'open',
                follow_up_date=_d(data.get('follow_up_date')),
                visible_to_family=data.get('visible_to_family', True) not in (False, 'false', 0, '0'),
                group=group, reported_by=request.user))
    notify = data.get('notify_family')
    notify = cat.notify_family if notify in (None, '') else notify not in (False, 'false', 0, '0')
    awards = []
    for inc in made:
        if notify:
            notify_incident(inc)
        if inc.kind == 'positive':
            awards += [f'{inc.student.full_name}: {a}' for a in check_milestones(inc.student, inc.student.tenant)]
    fresh = BehaviourIncident.objects.filter(pk__in=[m.pk for m in made]).select_related(
        'student', 'student__current_class', 'category', 'reported_by').prefetch_related('actions')
    return Response({'incidents': [_payload(i, request.user) for i in fresh], 'awards': awards}, status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def incident_detail(request, incident_id):
    inc = get_object_or_404(_visible_incidents(request.user).prefetch_related('actions'), pk=incident_id)
    if request.method == 'GET':
        return Response(_payload(inc, request.user, not _staff(request.user)))
    if not _can_edit(request.user, inc):
        return Response({'error': 'Only the person who logged this, or the office, can change it.'}, status=403)
    if request.method == 'DELETE':
        inc.delete()
        return Response(status=204)
    data = request.data
    if data.get('status') in dict(BehaviourIncident.STATUSES):
        inc.status = data['status']
        inc.resolved_at = timezone.now() if inc.status == 'resolved' else None
    if 'follow_up_date' in data:
        inc.follow_up_date = _d(data.get('follow_up_date'))
    for f in ('description', 'location'):
        if f in data:
            setattr(inc, f, str(data.get(f) or '')[:5000])
    if 'visible_to_family' in data:
        inc.visible_to_family = bool(data.get('visible_to_family'))
    inc.save()
    if data.get('notify_family'):
        notify_incident(inc)
        inc.refresh_from_db()
    return Response(_payload(inc, request.user))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_action(request, incident_id):
    if not _staff(request.user):
        return Response({'error': 'Only staff can record actions.'}, status=403)
    inc = get_object_or_404(_visible_incidents(request.user), pk=incident_id)
    kind = request.data.get('action_type')
    if kind not in dict(BehaviourAction.TYPES):
        return Response({'error': 'Choose an action.'}, status=400)
    if kind in ADMIN_ONLY_ACTIONS and not is_admin(request.user):
        return Response({'error': 'Only the office can record a suspension.'}, status=403)
    start, end = _d(request.data.get('start_date')), _d(request.data.get('end_date'))
    if start and end and end < start:
        return Response({'error': 'The end date must be on or after the start date.'}, status=400)
    a = BehaviourAction.objects.create(tenant=inc.tenant, incident=inc, action_type=kind, start_date=start, end_date=end,
                                       notes=str(request.data.get('notes') or '')[:5000], created_by=request.user,
                                       completed=bool(request.data.get('completed')))
    if inc.status == 'open' and kind != 'follow_up':
        inc.status = 'in_review'
        inc.save(update_fields=['status'])
    if request.data.get('notify_family') and inc.visible_to_family and kind != 'follow_up':
        span = f' from {start:%d %b}' + (f' to {end:%d %b}' if end else '') if start else ''
        _tell_family(inc.student, f'Behaviour: {inc.student.full_name}',
                     f'Following the incident on {inc.date:%d %b %Y} ({inc.category.name}), the school has recorded: '
                     f'{a.get_action_type_display()}{span}.' + (f'\n\n{a.notes}' if a.notes else ''))
    return Response(_action_payload(a), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def action_detail(request, action_id):
    a = get_object_or_404(BehaviourAction.objects.select_related('incident'), pk=action_id)
    if not (is_admin(request.user) or a.created_by_id == request.user.pk):
        return Response({'error': 'Only the person who recorded this, or the office, can change it.'}, status=403)
    if request.method == 'DELETE':
        a.delete()
        return Response(status=204)
    if 'completed' in request.data:
        a.completed = bool(request.data.get('completed'))
    if 'notes' in request.data:
        a.notes = str(request.data.get('notes') or '')[:5000]
    a.save()
    return Response(_action_payload(a))


# ---------------------------------------------------------------------------
# Class roster with points, student history, reports
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_points(request, class_id):
    if not _staff(request.user):
        return Response({'error': 'Staff only.'}, status=403)
    if not is_admin(request.user) and str(class_id) not in {str(c) for c in _get_teacher_class_ids(request.user)}:
        return Response({'error': 'You can only open classes you teach.'}, status=403)
    students = list(_students().filter(current_class_id=class_id).order_by('full_name'))
    totals = {r['student_id']: r for r in BehaviourIncident.objects.filter(student__in=students).values('student_id').annotate(
        points=Sum('points'), merits=Count('id', filter=Q(kind='positive')), incidents=Count('id', filter=Q(kind='negative')))}
    return Response([{'id': str(s.id), 'full_name': s.full_name, 'student_number': s.student_id or '',
                      'points': (totals.get(s.id) or {}).get('points') or 0,
                      'merits': (totals.get(s.id) or {}).get('merits') or 0,
                      'incidents': (totals.get(s.id) or {}).get('incidents') or 0} for s in students])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_summary(request, student_id):
    s = get_object_or_404(_students().select_related('current_class'), pk=student_id)
    if not ensure_student_access(request.user, s):
        return Response({'error': 'Not your student.'}, status=403)
    family = not _staff(request.user)
    qs = BehaviourIncident.objects.filter(student=s).select_related('category', 'reported_by', 'student', 'student__current_class') \
        .prefetch_related('actions', 'actions__created_by')
    if family:
        qs = qs.filter(visible_to_family=True)
    rows = list(qs)
    positive = sum(i.points for i in rows if i.kind == 'positive')
    negative = sum(i.points for i in rows if i.kind == 'negative')
    cfg = settings_for(s.tenant)
    upcoming = next((m for m in sorted(cfg.milestones or [], key=lambda m: m['points']) if m['points'] > positive), None)
    by_cat = Counter(i.category.name for i in rows)
    return Response({
        'student': {'id': str(s.id), 'full_name': s.full_name, 'class_name': s.current_class.name if s.current_class_id else ''},
        'points': positive + negative, 'positive_points': positive, 'negative_points': negative,
        'merits': sum(1 for i in rows if i.kind == 'positive'), 'incidents': sum(1 for i in rows if i.kind == 'negative'),
        'open_incidents': sum(1 for i in rows if i.kind == 'negative' and i.status != 'resolved'),
        'by_category': [{'name': n, 'count': c} for n, c in by_cat.most_common()],
        'awards': [{'name': a.name, 'points': a.points, 'at': a.awarded_at.isoformat()} for a in s.behaviour_awards.all()],
        'next_milestone': upcoming,
        'history': [_payload(i, request.user, family) for i in rows[:200]],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report(request):
    if not _staff(request.user):
        return Response({'error': 'Staff only.'}, status=403)
    today = timezone.localdate()
    start = _d(request.query_params.get('from'), today - timedelta(days=30))
    end = _d(request.query_params.get('to'), today)
    qs = _visible_incidents(request.user).filter(date__range=(start, end))
    if request.query_params.get('class'):
        qs = qs.filter(student__current_class_id=request.query_params['class'])
    rows = list(qs)
    by_class = defaultdict(lambda: {'merits': 0, 'incidents': 0, 'points': 0})
    by_student = defaultdict(lambda: {'name': '', 'class_name': '', 'points': 0, 'merits': 0, 'incidents': 0})
    by_cat = defaultdict(lambda: {'kind': '', 'count': 0, 'points': 0})
    by_weekday = Counter()
    for i in rows:
        cname = i.student.current_class.name if i.student.current_class_id else '—'
        c = by_class[cname]
        c['merits' if i.kind == 'positive' else 'incidents'] += 1
        c['points'] += i.points
        st = by_student[str(i.student_id)]
        st.update(name=i.student.full_name, class_name=cname)
        st['points'] += i.points
        st['merits' if i.kind == 'positive' else 'incidents'] += 1
        cat = by_cat[i.category.name]
        cat['kind'] = i.kind
        cat['count'] += 1
        cat['points'] += i.points
        if i.kind == 'negative':
            by_weekday[i.date.strftime('%a')] += 1
    students = [{'id': k, **v} for k, v in by_student.items()]
    follow_ups = _visible_incidents(request.user).filter(follow_up_date__lte=today).exclude(status='resolved') \
        .prefetch_related('actions')[:50]
    suspended = BehaviourAction.objects.filter(action_type__in=ADMIN_ONLY_ACTIONS, start_date__lte=today) \
        .filter(Q(end_date__gte=today) | Q(end_date__isnull=True, start_date=today)).select_related('incident__student')
    if not is_admin(request.user):
        suspended = suspended.filter(incident__in=_visible_incidents(request.user))
    return Response({
        'from': start.isoformat(), 'to': end.isoformat(),
        'totals': {'merits': sum(1 for i in rows if i.kind == 'positive'), 'incidents': sum(1 for i in rows if i.kind == 'negative'),
                   'points': sum(i.points for i in rows), 'students': len(by_student),
                   'open': sum(1 for i in rows if i.kind == 'negative' and i.status != 'resolved')},
        'by_category': sorted(({'name': k, **v} for k, v in by_cat.items()), key=lambda r: -r['count']),
        'by_class': sorted(({'name': k, **v} for k, v in by_class.items()), key=lambda r: r['name']),
        'by_weekday': [{'day': d, 'count': by_weekday.get(d, 0)} for d in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')],
        'top_positive': sorted(students, key=lambda r: -r['points'])[:10],
        'most_incidents': sorted((s for s in students if s['incidents']), key=lambda r: -r['incidents'])[:10],
        'follow_ups_due': [_payload(i, request.user) for i in follow_ups],
        'suspended_today': [{'student': a.incident.student.full_name, 'type': a.get_action_type_display(),
                             'until': a.end_date.isoformat() if a.end_date else None} for a in suspended],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_classes(request):
    """Classes this person can log behaviour for."""
    from services.education.academics.models import SchoolClass

    if not _staff(request.user):
        return Response([])
    qs = SchoolClass.objects.all().order_by('grade_level', 'name')
    if not is_admin(request.user):
        qs = qs.filter(pk__in=list(_get_teacher_class_ids(request.user)))
    return Response([{'id': str(c.id), 'name': c.name} for c in qs])
