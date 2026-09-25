"""School calendar API: one combined feed (events, holidays, terms, exams, assignment
due dates, fee due dates, meetings), event management, parent-teacher meeting
booking, a private subscription feed (iCal) and reminders."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

from django.core import signing
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import _get_teacher_class_ids, filter_students_for_user, get_user_role, is_admin

from .models import CalendarEvent, MeetingSlot

FEED_SALT = 'school-calendar-feed'


def _d(value, default=None):
    try:
        return date.fromisoformat(str(value)[:10]) if value else default
    except ValueError:
        return default


def _t(value):
    try:
        return time.fromisoformat(str(value)) if value else None
    except ValueError:
        return None


def _kids(user):
    from services.education.students.models import Student

    return list(filter_students_for_user(user, Student.objects.filter(is_active=True)).select_related('current_class'))


def _event_visible(e: CalendarEvent, role: str, class_ids: set, levels: set) -> bool:
    if role == 'admin':
        return True
    if e.audience == 'everyone':
        return True
    if e.audience == 'staff':
        return role == 'teacher'
    if e.audience == 'families':
        return role in ('parent', 'student', 'teacher')
    if e.audience == 'class':
        return bool(class_ids & {str(c) for c in e.class_ids})
    if e.audience == 'grade':
        return bool(levels & set(e.grade_levels or []))
    return False


def _event_payload(e: CalendarEvent, can_edit=False) -> dict:
    return {'id': f'event:{e.id}', 'source': 'event', 'title': e.title, 'kind': e.kind, 'description': e.description,
            'start_date': e.start_date.isoformat(), 'end_date': e.end_date.isoformat(),
            'start_time': e.start_time.strftime('%H:%M') if e.start_time else None,
            'end_time': e.end_time.strftime('%H:%M') if e.end_time else None, 'all_day': e.start_time is None,
            'location': e.location, 'audience': e.audience, 'class_ids': e.class_ids, 'grade_levels': e.grade_levels,
            'closes_school': e.closes_school, 'remind_days_before': e.remind_days_before, 'editable': can_edit}


def feed_for(user, start: date, end: date, student=None) -> list[dict]:
    """Everything on the calendar for this user between two dates (optionally only what concerns one student)."""
    from services.education.academics.models import Term
    from services.education.exams.models import Exam
    from services.education.gradebook.models import Assignment

    role = get_user_role(user)
    items: list[dict] = []
    if role in ('parent', 'student'):
        kids = _kids(user)
        class_ids = {str(k.current_class_id) for k in kids if k.current_class_id}
        levels = {k.current_class.grade_level for k in kids if k.current_class_id and k.current_class.grade_level is not None}
    elif role == 'teacher':
        kids = []
        class_ids = {str(c) for c in _get_teacher_class_ids(user)}
        levels = set()
    else:
        kids, class_ids, levels = [], None, set()
    if student is not None:
        kids = [student]
        class_ids = {str(student.current_class_id)} if student.current_class_id else set()
        levels = {student.current_class.grade_level} if student.current_class_id and student.current_class.grade_level is not None else set()

    for e in CalendarEvent.objects.filter(start_date__lte=end, end_date__gte=start):
        if _event_visible(e, role, class_ids or set(), levels):
            items.append(_event_payload(e, can_edit=is_admin(user) or e.created_by_id == user.pk))

    for t in Term.objects.filter(Q(start_date__range=(start, end)) | Q(end_date__range=(start, end))):
        for d, label in ((t.start_date, 'starts'), (t.end_date, 'ends')):
            if start <= d <= end:
                items.append({'id': f'term:{t.id}:{label}', 'source': 'term', 'kind': 'term', 'title': f'{t.name} {label}',
                              'start_date': d.isoformat(), 'end_date': d.isoformat(), 'all_day': True})

    exams = Exam.objects.filter(exam_date__range=(start, end), is_active=True).select_related('class_ref', 'subject')
    if class_ids is not None:
        exams = exams.filter(class_ref_id__in=class_ids)
    exams = list(exams[:2000])
    if class_ids is None:
        # The office sees one entry per exam type per day instead of every class paper.
        groups: dict = {}
        for x in exams:
            groups.setdefault((x.exam_date, x.get_exam_type_display()), []).append(x)
        for (d, label), papers in groups.items():
            if len(papers) > 3:
                items.append({'id': f'exams:{d}:{label}', 'source': 'exam', 'kind': 'exam', 'title': f'{label} exams ({len(papers)} papers)',
                              'start_date': d.isoformat(), 'end_date': d.isoformat(), 'all_day': True,
                              'description': '\n'.join(sorted(f'{p.title} ({p.class_ref.name})' for p in papers))})
                grouped = {p.pk for p in papers}
                exams = [x for x in exams if x.pk not in grouped]
    for x in exams:
        items.append({'id': f'exam:{x.id}', 'source': 'exam', 'kind': 'exam', 'title': f'{x.title} ({x.class_ref.name})',
                      'start_date': x.exam_date.isoformat(), 'end_date': x.exam_date.isoformat(),
                      'start_time': x.start_time.strftime('%H:%M') if x.start_time else None,
                      'end_time': x.end_time.strftime('%H:%M') if x.end_time else None, 'all_day': x.start_time is None})

    if class_ids is not None and class_ids:
        work = Assignment.objects.filter(due_date__range=(start, end), class_subject__class_ref_id__in=class_ids) \
            .select_related('class_subject__subject', 'class_subject__class_ref')
        if role in ('parent', 'student'):
            work = work.filter(is_published=True)
        for a in work[:500]:
            items.append({'id': f'assignment:{a.id}', 'source': 'assignment', 'kind': 'deadline',
                          'title': f'Due: {a.title} ({a.class_subject.subject.name})',
                          'start_date': a.due_date.isoformat(), 'end_date': a.due_date.isoformat(), 'all_day': True})

    if kids:
        from services.education.finance.models import Invoice

        for inv in Invoice.objects.filter(student__in=kids, due_date__range=(start, end),
                                          status__in=('issued', 'partial', 'overdue')).select_related('student'):
            items.append({'id': f'invoice:{inv.id}', 'source': 'invoice', 'kind': 'deadline',
                          'title': f'Fee due: {inv.student.full_name} ({inv.invoice_number})',
                          'start_date': inv.due_date.isoformat(), 'end_date': inv.due_date.isoformat(), 'all_day': True})

    for m in MeetingSlot.objects.filter(date__range=(start, end)).filter(Q(host=user) | Q(booked_by=user)) \
            .select_related('host', 'booked_by', 'student'):
        who = (m.booked_by.full_name or m.booked_by.email) if m.booked_by_id else 'Open slot'
        if m.booked_by_id == user.pk:
            who = f'with {m.host.full_name or m.host.email}'
        items.append({'id': f'meeting:{m.id}', 'source': 'meeting', 'kind': 'meeting',
                      'title': f"{m.title}: {who}{f' about {m.student.full_name}' if m.student_id else ''}",
                      'start_date': m.date.isoformat(), 'end_date': m.date.isoformat(),
                      'start_time': m.start_time.strftime('%H:%M'), 'end_time': m.end_time.strftime('%H:%M'),
                      'all_day': False, 'location': m.location})
    items.sort(key=lambda i: (i['start_date'], i.get('start_time') or ''))
    return items


def school_closed_on(day: date) -> bool:
    """True when a holiday/closure event covers this date (used by attendance)."""
    return CalendarEvent.objects.filter(closes_school=True, start_date__lte=day, end_date__gte=day).exists()


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feed(request):
    today = timezone.localdate()
    start = _d(request.query_params.get('from'), today.replace(day=1))
    end = _d(request.query_params.get('to'), start + timedelta(days=41))
    if (end - start).days > 400:
        return Response({'error': 'Ask for at most a year at a time.'}, status=400)
    return Response(feed_for(request.user, start, end))


def _save_event(e: CalendarEvent, data, user):
    e.title = str(data.get('title') or e.title or '').strip()[:200]
    if not e.title:
        raise ValueError('Give the event a title.')
    e.description = str(data.get('description', e.description) or '')[:5000]
    e.kind = data.get('kind') if data.get('kind') in dict(CalendarEvent.KINDS) else (e.kind or 'event')
    e.start_date = _d(data.get('start_date'), e.start_date)
    e.end_date = _d(data.get('end_date'), e.start_date if not e.end_date else e.end_date) or e.start_date
    if not e.start_date:
        raise ValueError('Choose a date.')
    if e.end_date < e.start_date:
        raise ValueError('The end date must be on or after the start date.')
    if 'start_time' in data:
        e.start_time = _t(data.get('start_time'))
    if 'end_time' in data:
        e.end_time = _t(data.get('end_time'))
    e.location = str(data.get('location', e.location) or '')[:200]
    e.audience = data.get('audience') if data.get('audience') in dict(CalendarEvent.AUDIENCES) else (e.audience or 'everyone')
    e.class_ids = [str(x) for x in data.get('class_ids', e.class_ids) or []]
    e.grade_levels = [int(x) for x in data.get('grade_levels', e.grade_levels) or [] if str(x).lstrip('-').isdigit()]
    e.closes_school = bool(data.get('closes_school', e.closes_school)) or e.kind == 'holiday'
    rd = data.get('remind_days_before', e.remind_days_before)
    e.remind_days_before = int(rd) if rd is not None and str(rd).isdigit() else None
    if get_user_role(user) == 'teacher':
        mine = {str(c) for c in _get_teacher_class_ids(user)}
        if e.audience != 'class' or not e.class_ids or not set(e.class_ids) <= mine or e.closes_school:
            raise PermissionError('Teachers can add events for their own classes.')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def events(request):
    if get_user_role(request.user) not in ('admin', 'teacher'):
        return Response({'error': 'Only staff can add events.'}, status=403)
    e = CalendarEvent(tenant=getattr(request, 'tenant', None), created_by=request.user)
    try:
        _save_event(e, request.data, request.user)
    except PermissionError as exc:
        return Response({'error': str(exc)}, status=403)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    e.save()
    return Response(_event_payload(e, True), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def event_detail(request, event_id):
    e = get_object_or_404(CalendarEvent, pk=event_id)
    if not (is_admin(request.user) or e.created_by_id == request.user.pk):
        return Response({'error': 'You can only change events you added.'}, status=403)
    if request.method == 'DELETE':
        e.delete()
        return Response(status=204)
    try:
        _save_event(e, request.data, request.user)
    except PermissionError as exc:
        return Response({'error': str(exc)}, status=403)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)
    e.save()
    return Response(_event_payload(e, True))


# ---------------------------------------------------------------------------
# Parent-teacher meetings
# ---------------------------------------------------------------------------

def _slot_payload(m: MeetingSlot, me) -> dict:
    return {'id': str(m.id), 'title': m.title, 'date': m.date.isoformat(), 'start_time': m.start_time.strftime('%H:%M'),
            'end_time': m.end_time.strftime('%H:%M'), 'location': m.location,
            'host': {'id': str(m.host_id), 'name': m.host.full_name or m.host.email},
            'booked': bool(m.booked_by_id), 'mine': m.booked_by_id == me.pk,
            'booked_by': (m.booked_by.full_name or m.booked_by.email) if m.booked_by_id and (m.host_id == me.pk or is_admin(me) or m.booked_by_id == me.pk) else None,
            'student': m.student.full_name if m.student_id and (m.host_id == me.pk or m.booked_by_id == me.pk or is_admin(me)) else None,
            'note': m.note if m.host_id == me.pk or m.booked_by_id == me.pk else ''}


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def meetings(request):
    """GET: staff see their own slots; parents see open slots of their children's teachers and their bookings.
    POST (staff): {date, from, to, minutes, location, title} creates back-to-back slots."""
    role = get_user_role(request.user)
    today = timezone.localdate()
    if request.method == 'GET':
        qs = MeetingSlot.objects.filter(date__gte=today).select_related('host', 'booked_by', 'student')
        if role in ('admin', 'teacher'):
            qs = qs if (role == 'admin' and request.query_params.get('all')) else qs.filter(host=request.user)
        else:
            from services.education.communication.inbox import teacher_users

            class_ids = [k.current_class_id for k in _kids(request.user) if k.current_class_id]
            hosts = list(teacher_users(class_ids).values_list('pk', flat=True)) if class_ids else []
            qs = qs.filter(Q(host_id__in=hosts, booked_by__isnull=True) | Q(booked_by=request.user))
        return Response([_slot_payload(m, request.user) for m in qs[:300]])

    if role not in ('admin', 'teacher'):
        return Response({'error': 'Only staff can offer meeting times.'}, status=403)
    day = _d(request.data.get('date'))
    t_from, t_to = _t(request.data.get('from')), _t(request.data.get('to'))
    try:
        minutes = int(request.data.get('minutes') or 15)
    except (TypeError, ValueError):
        minutes = 0
    if not day or not t_from or not t_to or not 5 <= minutes <= 120 or t_to <= t_from:
        return Response({'error': 'Choose a date, a start and end time, and a meeting length of 5–120 minutes.'}, status=400)
    if day < today:
        return Response({'error': 'Choose a date in the future.'}, status=400)
    slots, cursor = [], datetime.combine(day, t_from)
    stop = datetime.combine(day, t_to)
    with transaction.atomic():
        while cursor + timedelta(minutes=minutes) <= stop and len(slots) < 60:
            nxt = cursor + timedelta(minutes=minutes)
            if not MeetingSlot.objects.filter(host=request.user, date=day, start_time__lt=nxt.time(), end_time__gt=cursor.time()).exists():
                slots.append(MeetingSlot.objects.create(
                    tenant=getattr(request, 'tenant', None), host=request.user, date=day, start_time=cursor.time(),
                    end_time=nxt.time(), location=str(request.data.get('location') or '')[:200],
                    title=str(request.data.get('title') or 'Parent-teacher meeting')[:120]))
            cursor = nxt
    return Response([_slot_payload(m, request.user) for m in slots], status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_children(request):
    """The children a parent can book meetings about."""
    return Response([{'id': str(k.id), 'full_name': k.full_name, 'class_name': k.current_class.name if k.current_class_id else ''}
                     for k in _kids(request.user)] if get_user_role(request.user) in ('parent', 'student') else [])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def book_meeting(request, slot_id):
    """{student_id, note} — a parent books an open slot with one of their child's teachers."""
    from services.education.communication.inbox import teacher_users

    kids = {str(k.id): k for k in _kids(request.user)}
    student = kids.get(str(request.data.get('student_id') or ''))
    if student is None and len(kids) == 1:
        student = next(iter(kids.values()))
    if student is None:
        return Response({'error': 'Choose which child the meeting is about.'}, status=400)
    with transaction.atomic():
        slot = MeetingSlot.objects.select_for_update().filter(pk=slot_id).select_related('host').first()
        if slot is None:
            return Response({'error': 'That time is no longer available.'}, status=404)
        if slot.booked_by_id:
            return Response({'error': 'Someone has just booked this time. Please choose another.'}, status=409)
        if not student.current_class_id or not teacher_users([student.current_class_id]).filter(pk=slot.host_id).exists():
            return Response({'error': 'You can book meetings with your child’s teachers.'}, status=403)
        slot.booked_by = request.user
        slot.student = student
        slot.note = str(request.data.get('note') or '')[:500]
        slot.booked_at = timezone.now()
        slot.save()
    _tell(slot.host, 'Meeting booked', f'{request.user.full_name or request.user.email} booked {slot.date:%a %d %b} '
                     f'{slot.start_time:%H:%M} about {student.full_name}.' + (f' Note: {slot.note}' if slot.note else ''))
    return Response(_slot_payload(slot, request.user))


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def cancel_meeting(request, slot_id):
    """POST: the parent (or host) cancels a booking. DELETE: the host removes an open or booked slot."""
    slot = get_object_or_404(MeetingSlot.objects.select_related('host', 'booked_by'), pk=slot_id)
    if request.method == 'DELETE':
        if slot.host_id != request.user.pk and not is_admin(request.user):
            return Response({'error': 'Only the teacher who offered this time can remove it.'}, status=403)
        if slot.booked_by_id:
            _tell(slot.booked_by, 'Meeting cancelled', f'The meeting on {slot.date:%a %d %b} at {slot.start_time:%H:%M} was cancelled by the school.')
        slot.delete()
        return Response(status=204)
    if request.user.pk not in (slot.booked_by_id, slot.host_id) and not is_admin(request.user):
        return Response({'error': 'You can only cancel your own booking.'}, status=403)
    other = slot.host if request.user.pk == slot.booked_by_id else slot.booked_by
    slot.booked_by = None
    slot.student = None
    slot.note = ''
    slot.booked_at = None
    slot.save()
    if other:
        _tell(other, 'Meeting cancelled', f'The meeting on {slot.date:%a %d %b} at {slot.start_time:%H:%M} was cancelled.')
    return Response(_slot_payload(slot, request.user))


def _tell(user, title, message):
    if user is None:
        return
    try:
        from django.core.mail import send_mail

        from services.core.user_notifications.utils import create_user_notification
        from services.education.communication.inbox import _in_background

        create_user_notification(user, title, message, 'announcement')
        if user.email:
            _in_background(lambda: send_mail(title, message, None, [user.email], fail_silently=True))
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Subscription feed (Google / Apple / Outlook calendars)
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feed_link(request):
    school = getattr(request, 'tenant', None)
    token = signing.dumps({'u': str(request.user.pk), 's': str(school.pk) if school else ''}, salt=FEED_SALT)
    return Response({'url': request.build_absolute_uri(f'/api/v1/auth/calendar/ical/{token}/')})


def _ics_escape(text: str) -> str:
    return (text or '').replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def ical(request, token):
    from django.contrib.auth import get_user_model

    from services.core.tenants.context import use_tenant
    from services.core.tenants.models import School

    try:
        data = signing.loads(token, salt=FEED_SALT)
    except signing.BadSignature:
        return HttpResponse('Invalid calendar link.', status=404, content_type='text/plain')
    user = get_user_model().objects.filter(pk=data.get('u'), is_active=True).first()
    school = School.objects.filter(pk=data.get('s'), is_active=True).first() if data.get('s') else None
    if user is None or school is None:
        return HttpResponse('This calendar link no longer works.', status=404, content_type='text/plain')
    today = timezone.localdate()
    with use_tenant(school):
        items = feed_for(user, today - timedelta(days=60), today + timedelta(days=365))
    name = (school.settings_json or {}).get('institute_name') or school.name
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CodeCortex School ERP//EN', f'X-WR-CALNAME:{_ics_escape(name)}',
             'CALSCALE:GREGORIAN']
    stamp = timezone.now().strftime('%Y%m%dT%H%M%SZ')
    for i in items:
        lines += ['BEGIN:VEVENT', f"UID:{i['id']}@{school.pk}", f'DTSTAMP:{stamp}', f"SUMMARY:{_ics_escape(i['title'])}"]
        sd = date.fromisoformat(i['start_date'])
        ed = date.fromisoformat(i['end_date'])
        if i.get('all_day', True) or not i.get('start_time'):
            lines += [f'DTSTART;VALUE=DATE:{sd:%Y%m%d}', f'DTEND;VALUE=DATE:{ed + timedelta(days=1):%Y%m%d}']
        else:
            st = i['start_time'].replace(':', '')
            et = (i.get('end_time') or i['start_time']).replace(':', '')
            lines += [f'DTSTART:{sd:%Y%m%d}T{st}00', f'DTEND:{ed:%Y%m%d}T{et}00']
        if i.get('location'):
            lines.append(f"LOCATION:{_ics_escape(i['location'])}")
        if i.get('description'):
            lines.append(f"DESCRIPTION:{_ics_escape(i['description'])}")
        lines.append('END:VEVENT')
    lines.append('END:VCALENDAR')
    return HttpResponse('\r\n'.join(lines) + '\r\n', content_type='text/calendar; charset=utf-8')


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

def send_reminders(today: date | None = None) -> int:
    """Tell people about events N days ahead, and about tomorrow's booked meetings."""
    from services.education.communication.inbox import admin_users, parent_links, teacher_users
    from services.education.students.models import Student

    today = today or timezone.localdate()
    sent = 0
    for e in CalendarEvent.objects.filter(remind_days_before__isnull=False, reminder_sent_on__isnull=True, start_date__gte=today):
        if (e.start_date - today).days != e.remind_days_before:
            continue
        users = set()
        if e.audience in ('everyone', 'staff'):
            users |= set(admin_users(e.tenant)) | set(teacher_users())
        if e.audience != 'staff':
            students = Student.objects.filter(is_active=True)
            if e.audience == 'class':
                students = students.filter(current_class_id__in=e.class_ids)
                users |= set(teacher_users(e.class_ids))
            elif e.audience == 'grade':
                students = students.filter(current_class__grade_level__in=e.grade_levels)
            from django.contrib.auth import get_user_model

            users |= set(get_user_model().objects.filter(pk__in=list(parent_links(students))))
        when = e.start_date.strftime('%A %d %B') + (f' at {e.start_time:%H:%M}' if e.start_time else '')
        for u in users:
            _tell(u, f'Reminder: {e.title}', f'{e.title} is on {when}.' + (f' {e.location}' if e.location else ''))
            sent += 1
        CalendarEvent.objects.filter(pk=e.pk).update(reminder_sent_on=today)
    for m in MeetingSlot.objects.filter(date=today + timedelta(days=1), booked_by__isnull=False, reminder_sent=False) \
            .select_related('host', 'booked_by', 'student'):
        text = f'Reminder: meeting tomorrow at {m.start_time:%H:%M}' + (f' ({m.location})' if m.location else '')
        _tell(m.host, 'Meeting tomorrow', f'{text} with {m.booked_by.full_name or m.booked_by.email}.')
        _tell(m.booked_by, 'Meeting tomorrow', f'{text} with {m.host.full_name or m.host.email}.')
        MeetingSlot.objects.filter(pk=m.pk).update(reminder_sent=True)
        sent += 2
    return sent
