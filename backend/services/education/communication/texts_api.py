"""Automatic SMS and WhatsApp (P16): the school's rules and wording, the delivery log, retries, a test send,
emergency messages, and Twilio's delivery reports. Mounted at /api/v1/auth/communication/texts/."""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.decorators import is_admin

from . import texts
from .models import Announcement, AutoTextRule, Message


def _school(request):
    return getattr(request, 'tenant', None)


def _admin_only(request):
    if not is_admin(request.user) or _school(request) is None:
        return Response({'error': 'Only school administrators can do this.'}, status=status.HTTP_403_FORBIDDEN)
    return None


def _rule(r: AutoTextRule) -> dict:
    return {'event': r.event, 'label': r.get_event_display(), 'sms': r.sms, 'whatsapp': r.whatsapp, 'template': r.template,
            'is_active': r.is_active, 'placeholders': texts.PLACEHOLDERS[r.event]}


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def rules(request):
    denied = _admin_only(request)
    if denied:
        return denied
    school = _school(request)
    if request.method == 'PUT':
        for item in request.data.get('rules') or []:
            if item.get('event') not in texts.DEFAULTS:
                continue
            r = texts.rule(item['event'], school)
            template = str(item.get('template', r.template)).strip()
            if not template:
                return Response({'error': f'The message for "{r.get_event_display()}" cannot be empty.'}, status=400)
            r.template = template[:600]
            for key in ('sms', 'whatsapp', 'is_active'):
                if key in item:
                    setattr(r, key, bool(item[key]))
            r.save()
    cfg = texts.config_for(school)
    return Response({'rules': [_rule(texts.rule(e, school)) for e in texts.DEFAULTS],
                     'ready': {'sms': bool(cfg and cfg.from_number), 'whatsapp': bool(cfg and cfg.whatsapp_from)},
                     'delivery_reports': bool(texts._callback_url())})


def _msg(m: Message) -> dict:
    return {'id': str(m.id), 'channel': m.channel, 'to': m.recipient_phone or m.recipient, 'event': m.event,
            'event_label': dict(AutoTextRule.EVENTS).get(m.event, 'Message'), 'student': m.student.full_name if m.student_id else '',
            'body': m.message, 'status': m.delivery_status, 'error': m.error, 'batch': m.batch,
            'at': timezone.localtime(m.created_at).isoformat(), 'delivered_at': timezone.localtime(m.delivered_at).isoformat() if m.delivered_at else None}


FAILED = ('failed', 'undelivered')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def log(request):
    denied = _admin_only(request)
    if denied:
        return denied
    qs = Message._base_manager.filter(tenant=_school(request), channel__in=('sms', 'whatsapp')).select_related('student')
    q = request.query_params
    if q.get('event'):
        qs = qs.filter(event=q['event'])
    if q.get('batch'):
        qs = qs.filter(batch=q['batch'])
    if q.get('status') == 'failed':
        qs = qs.filter(delivery_status__in=FAILED)
    elif q.get('status') == 'delivered':
        qs = qs.filter(delivery_status__in=('delivered', 'read'))
    week = Message._base_manager.filter(tenant=_school(request), channel__in=('sms', 'whatsapp'),
                                        created_at__gte=timezone.now() - timedelta(days=7))
    counts = week.aggregate(total=Count('id'), delivered=Count('id', filter=Q(delivery_status__in=('delivered', 'read'))),
                            failed=Count('id', filter=Q(delivery_status__in=FAILED)))
    return Response({'messages': [_msg(m) for m in qs.order_by('-created_at')[:300]], 'week': counts})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retry(request):
    """Send failed texts again (chosen ones, or every failed one in a batch)."""
    denied = _admin_only(request)
    if denied:
        return denied
    school = _school(request)
    cfg = texts.config_for(school)
    if not cfg:
        return Response({'error': 'SMS is not set up for this school.'}, status=400)
    qs = Message._base_manager.filter(tenant=school, delivery_status__in=FAILED, channel__in=('sms', 'whatsapp'))
    if request.data.get('batch'):
        qs = qs.filter(batch=request.data['batch'])
    else:
        qs = qs.filter(pk__in=request.data.get('ids') or [])
    done = failed = 0
    for old in qs[:500]:
        new = texts.send_text(cfg, old.channel, old.recipient_phone or old.recipient, old.message, student=old.student,
                              event=old.event, batch=old.batch)
        Message._base_manager.filter(pk=old.pk).update(retry_count=old.retry_count + 1, delivery_status='retried')
        done += 1
        failed += int(new is not None and new.delivery_status in FAILED)
    return Response({'message': f'Sent {done} again; {failed} failed again.', 'sent': done, 'failed': failed})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_send(request):
    """Send one event's message, filled with example values, to a number (to check wording and setup)."""
    denied = _admin_only(request)
    if denied:
        return denied
    school = _school(request)
    cfg = texts.config_for(school)
    event, to, channel = request.data.get('event'), str(request.data.get('to') or ''), request.data.get('channel', 'sms')
    if not cfg:
        return Response({'error': 'SMS is not set up for this school.'}, status=400)
    if event not in texts.DEFAULTS or channel not in ('sms', 'whatsapp') or not to:
        return Response({'error': 'Choose a message, a channel and a phone number.'}, status=400)
    example = {'school': texts.school_name(school), 'student': 'Ali Khan', 'date': timezone.localdate().strftime('%d %b %Y'),
               'minutes': ' (12 minutes late)', 'count': 4, 'amount': '5,000', 'due_date': timezone.localdate().strftime('%d %b %Y'),
               'invoice': 'INV-TEST', 'class': 'Grade 5', 'message': 'This is a test message.'}
    body = texts.render(texts.rule(event, school).template, example)
    msg = texts.send_text(cfg, channel, to, body, event=event, batch='test')
    if msg.delivery_status in FAILED:
        return Response({'error': msg.error or 'Could not send.', 'body': body}, status=400)
    return Response({'message': 'Sent. It should arrive in a few seconds.', 'body': body, 'status': msg.delivery_status})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def emergency(request):
    """An urgent message to the chosen people: portal notice and email (as an announcement, pinned), plus SMS and
    WhatsApp to every phone number, straight away."""
    denied = _admin_only(request)
    if denied:
        return denied
    school = _school(request)
    d = request.data
    message = str(d.get('message') or '').strip()
    audience = d.get('audience', 'everyone')
    if not message:
        return Response({'error': 'Write the message.'}, status=400)
    if audience not in ('everyone', 'parents', 'staff', 'class'):
        return Response({'error': 'Choose who should receive it.'}, status=400)
    channels = [c for c in (d.get('channels') or ['sms']) if c in ('sms', 'whatsapp')]
    from .inbox import deliver, recipients

    ann = Announcement.objects.create(tenant=school, title=f'URGENT: {message[:80]}', body=message, audience=audience,
                                      class_ids=d.get('class_ids') or [], include_parents=True, send_email=True,
                                      send_sms=False, is_pinned=True, created_by=request.user)
    deliver(ann)
    _users, _emails, phones = recipients(ann, school)
    if audience in ('everyone', 'staff'):
        from services.education.academics.models import Teacher

        phones |= {t.phone for t in Teacher.objects.exclude(phone='') if t.phone}
    batch = f'emergency:{ann.pk}'
    result = texts.emergency(school, message, sorted(phones), batch, channels) if channels else {}
    return Response({'message': f'Sent to {ann.recipient_count} people in the portal and by email, and '
                                f'{result.get("sent", 0)} text(s).' + (f' {result["failed"]} could not be sent.' if result.get('failed') else ''),
                     'batch': batch, 'texts': result, 'announcement_id': str(ann.pk)})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def status_callback(request):
    """Twilio's delivery report for one message. Checked with the owning school's auth token."""
    sid = request.data.get('MessageSid') or request.data.get('SmsSid') or ''
    msg = Message._base_manager.filter(external_id=sid).select_related('tenant').first() if sid else None
    if msg is None:
        return Response(status=status.HTTP_404_NOT_FOUND)
    cfg = texts.config_for(msg.tenant)
    params = {k: request.data.get(k) for k in request.data.keys()}
    signature = request.headers.get('X-Twilio-Signature', '')
    urls = {request.build_absolute_uri(), texts._callback_url()}
    if not cfg or not any(u and texts.valid_signature(cfg.auth_token, u, params, signature) for u in urls):
        return Response(status=status.HTTP_403_FORBIDDEN)
    texts.record_status(msg, request.data.get('MessageStatus') or request.data.get('SmsStatus') or '',
                        str(request.data.get('ErrorCode') or ''))
    return Response(status=status.HTTP_204_NO_CONTENT)
