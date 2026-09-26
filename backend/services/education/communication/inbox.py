"""Two-way messaging between staff and families, targeted announcements, SMS
(Twilio) and each student's communication history.

Who can message whom:
* Parents: the office (school admins) and the teachers of their children's classes.
* Teachers: the office, other teachers, and the parents of students they teach.
* Admins: every teacher and every parent at the school.
Students read conversations they are added to but don't start new ones.
"""
from __future__ import annotations

import logging
import re

import requests
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import _get_teacher_class_ids, get_user_role, is_admin

from .models import (
    Announcement, AnnouncementReceipt, ChatMessage, Conversation, ConversationParticipant, Message, SmsConfig,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ---------------------------------------------------------------------------
# Directory: who belongs to this school, and who may talk to whom
# ---------------------------------------------------------------------------

def _students():
    from services.education.students.models import Student

    return Student.objects.filter(is_active=True)


def admin_users(school):
    from services.core.tenants.models import TenantMembership

    ids = TenantMembership.objects.filter(school=school, role='admin', is_active=True).values_list('user_id', flat=True)
    return User.objects.filter(pk__in=list(ids), is_active=True)


def teacher_users(class_ids=None):
    from services.education.academics.models import SchoolClass, Teacher, TeacherSubjectAssignment, TimetableEntry

    teachers = Teacher.objects.all()
    if class_ids is not None:
        emails = set(TeacherSubjectAssignment.objects.filter(class_subject__class_ref_id__in=class_ids)
                     .values_list('teacher__email', flat=True))
        emails |= set(TimetableEntry.objects.filter(class_subject__class_ref_id__in=class_ids)
                      .values_list('teacher__email', flat=True))
        emails |= set(SchoolClass.objects.filter(pk__in=class_ids, homeroom_teacher__isnull=False)
                      .values_list('homeroom_teacher__email', flat=True))
        names = [n for n in SchoolClass.objects.filter(pk__in=class_ids).values_list('teacher_name', flat=True) if n]
        emails |= set(teachers.filter(full_name__in=names).values_list('email', flat=True))
        teachers = teachers.filter(email__in=[e for e in emails if e])
    return User.objects.filter(email__in=list(teachers.values_list('email', flat=True)), is_active=True)


def parent_links(students):
    """{user_id: [student names]} for parent portal accounts linked to these students."""
    from services.core.accounts.models import ParentProfile
    from services.education.students.models import StudentGuardian

    out: dict = {}
    ids = set(students.values_list('id', flat=True))
    for p in ParentProfile.objects.filter(linked_students__in=students).distinct().prefetch_related('linked_students'):
        out.setdefault(p.user_id, set()).update(s.full_name for s in p.linked_students.all() if s.id in ids)
    for link in StudentGuardian.objects.filter(student__in=students, portal_access=True, guardian__user__isnull=False) \
            .select_related('student'):
        out.setdefault(link.guardian.user_id, set()).add(link.student.full_name)
    return out


def _my_children(user):
    from services.core.accounts.decorators import filter_students_for_user

    return filter_students_for_user(user, _students())


def contacts_for(user, school) -> list[dict]:
    role = get_user_role(user)
    people: dict = {}

    def add(qs, label, about=None):
        for u in qs:
            if u.pk == user.pk:
                continue
            entry = people.setdefault(u.pk, {'id': str(u.pk), 'name': u.full_name or u.email, 'email': u.email,
                                             'role': label, 'about': set()})
            if about:
                entry['about'].update(about.get(u.pk, set()))

    if role == 'admin':
        add(admin_users(school), 'Office')
        add(teacher_users(), 'Teacher')
        links = parent_links(_students())
        add(User.objects.filter(pk__in=list(links)), 'Parent', links)
    elif role == 'teacher':
        add(admin_users(school), 'Office')
        add(teacher_users(), 'Teacher')
        mine = _students().filter(current_class_id__in=_get_teacher_class_ids(user))
        links = parent_links(mine)
        add(User.objects.filter(pk__in=list(links)), 'Parent', links)
    elif role == 'parent':
        add(admin_users(school), 'Office')
        kids = list(_my_children(user))
        by_class: dict = {}
        for k in kids:
            if k.current_class_id:
                by_class.setdefault(k.current_class_id, set()).add(k.full_name)
        for class_id, names in by_class.items():
            add(teacher_users([class_id]), 'Teacher', {u.pk: names for u in teacher_users([class_id])})
    return sorted(({**p, 'about': sorted(p['about'])} for p in people.values()),
                  key=lambda p: ({'Office': 0, 'Teacher': 1, 'Parent': 2}.get(p['role'], 3), p['name'].lower()))


def _role_label(user):
    return {'admin': 'Office', 'teacher': 'Teacher', 'parent': 'Parent', 'student': 'Student'}.get(get_user_role(user), '')


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

def _notify_new_message(conv: Conversation, msg: ChatMessage, sender):
    from services.core.user_notifications.utils import create_user_notification

    preview = (msg.body[:140] + '…') if len(msg.body) > 140 else msg.body
    for p in conv.participants.select_related('user').exclude(user=sender):
        try:
            create_user_notification(p.user, f'Message from {sender.full_name or sender.email}', f'{conv.subject}: {preview}',
                                     'message')
            if p.user.email:
                _in_background(lambda to=p.user.email: send_mail(
                    f'New message: {conv.subject}',
                    f'{sender.full_name or sender.email} wrote:\n\n{msg.body}\n\nReply in the school portal.',
                    None, [to], fail_silently=True))
        except Exception:
            logger.exception('Could not notify a conversation participant')


def _conv_payload(conv: Conversation, me) -> dict:
    parts = list(conv.participants.select_related('user'))
    mine = next((p for p in parts if p.user_id == me.pk), None)
    last = conv.messages.order_by('-created_at').first()
    unread = conv.messages.exclude(sender=me).filter(created_at__gt=mine.last_read_at).count() if mine and mine.last_read_at \
        else conv.messages.exclude(sender=me).count()
    return {'id': str(conv.id), 'subject': conv.subject,
            'student': {'id': str(conv.student_id), 'full_name': conv.student.full_name} if conv.student_id else None,
            'participants': [{'id': str(p.user_id), 'name': p.user.full_name or p.user.email, 'role': p.role} for p in parts],
            'last_message': {'body': last.body[:160], 'at': last.created_at, 'sender': last.sender.full_name if last.sender else ''} if last else None,
            'last_message_at': conv.last_message_at, 'unread': unread}


def _msg_payload(m: ChatMessage, request=None) -> dict:
    url = ''
    if m.attachment:
        url = m.attachment.url
        if request is not None and not url.startswith('http'):
            url = request.build_absolute_uri(url)
    return {'id': str(m.id), 'body': m.body, 'at': m.created_at,
            'sender': {'id': str(m.sender_id), 'name': (m.sender.full_name or m.sender.email) if m.sender else 'Deleted user'},
            'attachment': {'name': m.attachment_name, 'url': url} if m.attachment else None}


def _my_conversation(request, conv_id) -> Conversation:
    return get_object_or_404(Conversation.objects.filter(participants__user=request.user), pk=conv_id)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contacts(request):
    return Response(contacts_for(request.user, getattr(request, 'tenant', None)))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversations(request):
    if request.method == 'GET':
        qs = Conversation.objects.filter(participants__user=request.user).select_related('student').distinct()
        if request.query_params.get('student'):
            qs = qs.filter(student_id=request.query_params['student'])
        return Response([_conv_payload(c, request.user) for c in qs[:100]])

    if get_user_role(request.user) == 'student':
        return Response({'error': 'Students can reply to messages but not start new ones.'}, status=403)
    wanted = {str(x) for x in request.data.get('participants') or []}
    allowed = {c['id']: c for c in contacts_for(request.user, getattr(request, 'tenant', None))}
    if not wanted:
        return Response({'error': 'Choose who to write to.'}, status=400)
    if not wanted <= set(allowed):
        return Response({'error': 'You can only message the people listed in your contacts.'}, status=403)
    subject = str(request.data.get('subject') or '').strip()
    body = str(request.data.get('body') or '').strip()
    if not subject or not body:
        return Response({'error': 'Write a subject and a message.'}, status=400)
    student = None
    if request.data.get('student'):
        from services.core.accounts.decorators import ensure_student_access
        from services.education.students.households import find_student

        student = find_student(request.data['student'])
        if student is None or not ensure_student_access(request.user, student):
            return Response({'error': 'Student not found.'}, status=404)
    with transaction.atomic():
        conv = Conversation.objects.create(tenant=getattr(request, 'tenant', None), subject=subject[:200],
                                           student=student, created_by=request.user)
        ConversationParticipant.objects.create(conversation=conv, user=request.user, role=_role_label(request.user),
                                               last_read_at=timezone.now())
        for uid in wanted:
            ConversationParticipant.objects.create(conversation=conv, user_id=uid, role=allowed[uid]['role'])
        msg = ChatMessage.objects.create(conversation=conv, sender=request.user, body=body[:10000])
    _notify_new_message(conv, msg, request.user)
    return Response(_conv_payload(conv, request.user), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_detail(request, conv_id):
    conv = _my_conversation(request, conv_id)
    ConversationParticipant.objects.filter(conversation=conv, user=request.user).update(last_read_at=timezone.now())
    data = _conv_payload(conv, request.user)
    data['messages'] = [_msg_payload(m, request) for m in conv.messages.select_related('sender')]
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def post_message(request, conv_id):
    conv = _my_conversation(request, conv_id)
    body = str(request.data.get('body') or '').strip()
    upload = request.FILES.get('attachment')
    if not body and not upload:
        return Response({'error': 'Write a message.'}, status=400)
    if upload:
        from django.core.exceptions import ValidationError

        from services.core.storage.utils import validate_upload

        try:
            info = validate_upload(upload, upload.name, declared_content_type=getattr(upload, 'content_type', None))
        except ValidationError as exc:
            return Response({'error': ' '.join(exc.messages)}, status=400)
    msg = ChatMessage.objects.create(conversation=conv, sender=request.user, body=body[:10000] or '(attachment)',
                                     attachment=upload, attachment_name=info.name if upload else '')
    Conversation.objects.filter(pk=conv.pk).update(last_message_at=msg.created_at)
    ConversationParticipant.objects.filter(conversation=conv, user=request.user).update(last_read_at=timezone.now())
    _notify_new_message(conv, msg, request.user)
    return Response(_msg_payload(msg, request), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread(request):
    total = 0
    for p in ConversationParticipant.objects.filter(user=request.user).select_related('conversation'):
        qs = p.conversation.messages.exclude(sender=request.user)
        total += qs.filter(created_at__gt=p.last_read_at).count() if p.last_read_at else qs.count()
    ann = AnnouncementReceipt.objects.filter(user=request.user, read_at__isnull=True).count()
    return Response({'messages': total, 'announcements': ann})


# ---------------------------------------------------------------------------
# SMS (Twilio)
# ---------------------------------------------------------------------------

def normalize_phone(raw: str, country_code: str = '') -> str | None:
    digits = re.sub(r'[^\d+]', '', raw or '')
    if digits.startswith('00'):
        digits = '+' + digits[2:]
    if digits.startswith('+'):
        return digits if 8 <= len(digits) <= 16 else None
    if digits.startswith('0') and country_code:
        return f'+{country_code.lstrip("+")}{digits[1:]}'
    if country_code and len(digits) >= 8:
        return f'+{country_code.lstrip("+")}{digits}' if not digits.startswith(country_code.lstrip('+')) else f'+{digits}'
    return None


def sms_config():
    cfg = SmsConfig.objects.filter(is_active=True).first()
    return cfg if cfg and cfg.account_sid and cfg.auth_token and cfg.from_number else None


def send_sms(to: str, body: str, cfg: SmsConfig | None = None, student=None) -> tuple[bool, str]:
    cfg = cfg or sms_config()
    if cfg is None:
        return False, 'SMS is not set up for this school.'
    from .texts import send_text  # one sender for every text, with delivery status (P16)

    msg = send_text(cfg, 'sms', to, body, student=student)
    return msg.delivery_status != 'failed', msg.error


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def sms_settings(request):
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can change SMS settings.'}, status=403)
    cfg = SmsConfig.objects.first()
    if request.method == 'PUT':
        cfg = cfg or SmsConfig(tenant=getattr(request, 'tenant', None))
        for key in ('account_sid', 'from_number', 'default_country_code', 'whatsapp_from'):
            if key in request.data:
                setattr(cfg, key, str(request.data[key] or '').strip())
        if request.data.get('auth_token'):
            cfg.auth_token = str(request.data['auth_token']).strip()
        if 'is_active' in request.data:
            cfg.is_active = bool(request.data['is_active'])
        cfg.save()
    return Response({'provider': 'twilio', 'account_sid': cfg.account_sid if cfg else '', 'from_number': cfg.from_number if cfg else '',
                     'default_country_code': cfg.default_country_code if cfg else '', 'whatsapp_from': cfg.whatsapp_from if cfg else '',
                     'is_active': bool(cfg.is_active) if cfg else True,  # a new setup starts switched on
                     'has_auth_token': bool(cfg and cfg.auth_token), 'ready': sms_config() is not None})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sms_send(request):
    """{to: ['+92300…', …], message} — send a text to specific numbers (admins)."""
    if not is_admin(request.user):
        return Response({'error': 'Only school administrators can send SMS.'}, status=403)
    body = str(request.data.get('message') or '').strip()
    numbers = [str(n) for n in (request.data.get('to') or []) if str(n).strip()]
    if not body or not numbers:
        return Response({'error': 'Enter at least one number and a message.'}, status=400)
    if sms_config() is None:
        return Response({'error': 'Set up SMS first (Communication → SMS settings).'}, status=400)
    results = [{'to': n, **dict(zip(('sent', 'error'), send_sms(n, body)))} for n in numbers[:500]]
    return Response({'sent': sum(1 for r in results if r['sent']), 'results': results})


# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------

def _audience_students(a: Announcement):
    qs = _students()
    if a.audience == 'class':
        return qs.filter(current_class_id__in=a.class_ids or [])
    if a.audience == 'grade':
        return qs.filter(current_class__grade_level__in=a.grade_levels or [])
    if a.audience in ('everyone', 'parents', 'students'):
        return qs
    return qs.none()


def recipients(a: Announcement, school):
    """(users, extra emails for guardians without a login, phone numbers)."""
    from services.education.students.models import StudentGuardian

    users, emails, phones = set(), set(), set()
    if a.audience in ('everyone', 'staff'):
        users |= set(admin_users(school)) | set(teacher_users())
    students = _audience_students(a)
    parents = a.audience in ('everyone', 'parents') or (a.audience in ('class', 'grade') and a.include_parents)
    kids = a.audience in ('everyone', 'students') or (a.audience in ('class', 'grade') and a.include_students)
    if parents:
        users |= set(User.objects.filter(pk__in=list(parent_links(students)), is_active=True))
        for link in StudentGuardian.objects.filter(student__in=students, receives_messages=True).select_related('guardian'):
            if link.guardian.email:
                emails.add(link.guardian.email.lower())
            if link.guardian.mobile_phone:
                phones.add(link.guardian.mobile_phone)
    if kids:
        users |= set(User.objects.filter(email__in=list(students.values_list('email', flat=True)), is_active=True))
    emails |= {u.email.lower() for u in users if u.email}
    return users, emails, phones


def deliver(a: Announcement):
    """Send an announcement now: portal notice, email, and SMS if chosen."""
    from services.core.user_notifications.utils import create_user_notification

    if a.sent_at:
        return a
    school = a.tenant
    users, emails, phones = recipients(a, school)
    for u in users:
        AnnouncementReceipt.objects.get_or_create(announcement=a, user=u)
        try:
            create_user_notification(u, a.title, a.body[:500], 'announcement')
        except Exception:
            logger.exception('Announcement notice failed')
    a.sent_at = timezone.now()
    a.recipient_count = len(users)
    a.save(update_fields=['sent_at', 'recipient_count'])
    _in_background(lambda: _send_bulk(a.pk, school, sorted(emails) if a.send_email else [],
                                       sorted(phones) if a.send_sms else []))
    return a


def _in_background(fn):
    """Emails and texts can take minutes for a whole school, so they go out after the response.
    Tests (in-memory email backend) run them straight away."""
    from django.conf import settings as dj_settings

    if dj_settings.EMAIL_BACKEND.endswith('locmem.EmailBackend'):
        fn()
        return
    import threading

    from django.db import connection

    def run():
        try:
            fn()
        except Exception:
            logger.exception('Background delivery failed')
        finally:
            connection.close()

    threading.Thread(target=run, daemon=True).start()


def _send_bulk(ann_id, school, emails, phones):
    from django.core.mail import EmailMessage, get_connection

    from services.core.tenants.context import use_tenant

    with use_tenant(school):
        a = Announcement.objects.filter(pk=ann_id).first()
        if a is None:
            return
        email_count = sms_count = 0
        if emails:
            school_name = ((school.settings_json or {}).get('institute_name') or school.name) if school else 'School'
            try:
                with get_connection(fail_silently=True) as conn:  # one SMTP connection for the whole batch
                    email_count = conn.send_messages([
                        EmailMessage(f'{school_name}: {a.title}', a.body, None, [e]) for e in emails]) or 0
            except Exception:
                logger.exception('Announcement emails failed')
        if phones and sms_config():
            text = f'{a.title}: {a.body}'[:600]
            sms_count = sum(1 for p in phones if send_sms(p, text)[0])
        Announcement.objects.filter(pk=ann_id).update(email_count=email_count, sms_count=sms_count)


def deliver_due():
    for a in Announcement.objects.filter(sent_at__isnull=True, scheduled_for__lte=timezone.now()):
        deliver(a)


def _ann_payload(a: Announcement, me=None, staff=False) -> dict:
    data = {'id': str(a.id), 'title': a.title, 'body': a.body, 'audience': a.audience,
            'audience_label': a.get_audience_display(), 'class_ids': a.class_ids, 'grade_levels': a.grade_levels,
            'is_pinned': a.is_pinned, 'scheduled_for': a.scheduled_for, 'sent_at': a.sent_at, 'created_at': a.created_at,
            'author': (a.created_by.full_name or a.created_by.email) if a.created_by else ''}
    if staff:
        data.update({'recipient_count': a.recipient_count, 'email_count': a.email_count, 'sms_count': a.sms_count,
                     'read_count': a.receipts.filter(read_at__isnull=False).count(),
                     'send_email': a.send_email, 'send_sms': a.send_sms})
    if me is not None:
        r = a.receipts.filter(user=me).first()
        data['read'] = bool(r and r.read_at)
    return data


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def announcements(request):
    deliver_due()
    role = get_user_role(request.user)
    if request.method == 'GET':
        if role == 'admin':
            qs = Announcement.objects.all()
        elif role == 'teacher':
            qs = Announcement.objects.filter(Q(created_by=request.user) | Q(receipts__user=request.user)).distinct()
        else:
            qs = Announcement.objects.filter(receipts__user=request.user, sent_at__isnull=False).distinct()
        return Response([_ann_payload(a, request.user, staff=role == 'admin' or a.created_by_id == request.user.pk)
                         for a in qs.select_related('created_by')[:100]])

    if role not in ('admin', 'teacher'):
        return Response({'error': 'Only staff can post announcements.'}, status=403)
    audience = request.data.get('audience') or 'everyone'
    if audience not in dict(Announcement.AUDIENCES):
        return Response({'error': 'Choose who should get the announcement.'}, status=400)
    class_ids = [str(x) for x in request.data.get('class_ids') or []]
    if role == 'teacher':
        mine = {str(c) for c in _get_teacher_class_ids(request.user)}
        if audience != 'class' or not class_ids or not set(class_ids) <= mine:
            return Response({'error': 'Teachers can post announcements to their own classes.'}, status=403)
    title = str(request.data.get('title') or '').strip()
    body = str(request.data.get('body') or '').strip()
    if not title or not body:
        return Response({'error': 'Write a title and a message.'}, status=400)
    if audience == 'class' and not class_ids:
        return Response({'error': 'Choose at least one class.'}, status=400)
    grades = [int(g) for g in request.data.get('grade_levels') or [] if str(g).lstrip('-').isdigit()]
    if audience == 'grade' and not grades:
        return Response({'error': 'Choose at least one grade level.'}, status=400)
    when = request.data.get('scheduled_for') or None
    if when:
        from django.utils.dateparse import parse_datetime

        when = parse_datetime(str(when))
        if when is None:
            return Response({'error': 'The send time is not valid.'}, status=400)
        if timezone.is_naive(when):
            when = timezone.make_aware(when)
    a = Announcement.objects.create(
        tenant=getattr(request, 'tenant', None), title=title[:200], body=body[:20000], audience=audience,
        class_ids=class_ids, grade_levels=grades, include_parents=bool(request.data.get('include_parents', True)),
        include_students=bool(request.data.get('include_students', False)),
        send_email=bool(request.data.get('send_email', True)), send_sms=bool(request.data.get('send_sms', False)),
        is_pinned=bool(request.data.get('is_pinned', False)) and role == 'admin', scheduled_for=when, created_by=request.user,
    )
    if not when or when <= timezone.now():
        deliver(a)
        a.refresh_from_db()
    return Response(_ann_payload(a, staff=True), status=201)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def announcement_action(request, ann_id):
    """POST marks it read (for the signed-in user). DELETE removes it (author or admin)."""
    if request.method == 'POST':
        AnnouncementReceipt.objects.filter(announcement_id=ann_id, user=request.user, read_at__isnull=True) \
            .update(read_at=timezone.now())
        return Response({'read': True})
    a = get_object_or_404(Announcement, pk=ann_id)
    if not (is_admin(request.user) or a.created_by_id == request.user.pk):
        return Response({'error': 'You can only remove your own announcements.'}, status=403)
    a.delete()
    return Response(status=204)


# ---------------------------------------------------------------------------
# Communication history for one student
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_history(request, student_id):
    """Everything sent to or about a student's family, newest first (staff)."""
    from services.education.students.households import find_student

    if get_user_role(request.user) not in ('admin', 'teacher'):
        return Response({'error': 'Staff only.'}, status=403)
    student = find_student(student_id)
    from services.core.accounts.decorators import ensure_student_access

    if not student or not ensure_student_access(request.user, student):
        return Response({'error': 'Student not found.'}, status=404)
    items = []
    for c in Conversation.objects.filter(student=student).annotate(n=Count('messages'), last=Max('messages__created_at')):
        items.append({'kind': 'conversation', 'at': c.last or c.created_at, 'title': c.subject,
                      'detail': f'{c.n} message(s)', 'id': str(c.id)})
    class_id = str(student.current_class_id) if student.current_class_id else ''
    level = student.current_class.grade_level if student.current_class_id else None
    for a in Announcement.objects.filter(sent_at__isnull=False):
        if a.audience in ('everyone', 'parents', 'students') or (a.audience == 'class' and class_id in a.class_ids) \
                or (a.audience == 'grade' and level in (a.grade_levels or [])):
            items.append({'kind': 'announcement', 'at': a.sent_at, 'title': a.title, 'detail': a.get_audience_display()})
    try:
        from services.education.attendance.models import AttendanceNotice

        for n in AttendanceNotice.objects.filter(student=student):
            items.append({'kind': 'attendance', 'at': n.created_at, 'title': f'Attendance alert: {n.get_kind_display()}',
                          'detail': n.message[:160]})
    except Exception:
        pass
    for m in Message.objects.filter(student=student):
        items.append({'kind': m.channel or 'message', 'at': m.created_at, 'title': m.subject or f'{m.channel.upper()} message',
                      'detail': f'{m.message[:160]} ({m.delivery_status})'})
    items.sort(key=lambda x: x['at'], reverse=True)
    return Response(items[:200])
