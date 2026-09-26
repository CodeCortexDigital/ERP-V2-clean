"""Automatic SMS and WhatsApp (P16): absence alerts, fee reminders and emergency messages, in the school's own words,
with delivery status from Twilio.

Both channels use the school's Twilio account (Phase 7): SMS from its number, WhatsApp from a WhatsApp-enabled
Twilio number. Every text is logged in Message with its status; Twilio reports delivery back to /texts/status/
(signed with the school's auth token) when PUBLIC_API_URL is set.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import string
from collections import defaultdict

import requests
from django.conf import settings
from django.utils import timezone

from .models import AutoTextRule, Message, SmsConfig

logger = logging.getLogger(__name__)

DEFAULTS = {
    'absent': (True, "{school}: {student} was marked absent today ({date}). If you know the reason, please report it "
                     "in the parent portal or call the school office."),
    'late': (False, '{school}: {student} arrived late today ({date}){minutes}.'),
    'chronic': (False, '{school}: {student} has missed {count} school days without an excuse in the last 30 days. '
                       'Please contact the school so we can help.'),
    'fee_reminder': (True, '{school}: fees of {amount} for {student} are due by {due_date} (invoice {invoice}). '
                           'Please pay at the office or online. Thank you.'),
    'emergency': (True, '{school} URGENT: {message}'),
}
PLACEHOLDERS = {
    'absent': ['school', 'student', 'date', 'class'], 'late': ['school', 'student', 'date', 'minutes', 'class'],
    'chronic': ['school', 'student', 'count', 'class'],
    'fee_reminder': ['school', 'student', 'amount', 'due_date', 'invoice', 'class'], 'emergency': ['school', 'message'],
}
FINAL = {'delivered', 'read', 'undelivered', 'failed'}


def rule(event: str, school) -> AutoTextRule:
    """The school's rule for an event (created with the default wording the first time)."""
    found = AutoTextRule._base_manager.filter(tenant=school, event=event).first()
    if found:
        return found
    active, template = DEFAULTS[event]
    return AutoTextRule._base_manager.create(tenant=school, event=event, sms=True, whatsapp=False, template=template,
                                             is_active=active)


def render(template: str, ctx: dict) -> str:
    """Fills {placeholders}; unknown ones stay as typed, so a typo never stops an alert."""
    class Keep(dict):
        def __missing__(self, key):
            return '{' + key + '}'

    try:
        return string.Formatter().vformat(template, (), Keep({k: v for k, v in ctx.items() if v is not None}))
    except (ValueError, IndexError):
        return template


def config_for(school) -> SmsConfig | None:
    cfg = SmsConfig._base_manager.filter(tenant=school, is_active=True).first() if school is not None else None
    return cfg if cfg and cfg.account_sid and cfg.auth_token and (cfg.from_number or cfg.whatsapp_from) else None


def school_name(school) -> str:
    return ((school.settings_json or {}).get('institute_name') or school.name) if school else 'School'


def family_phones(student) -> list[str]:
    """Guardians who receive school messages; otherwise the phone numbers on the student's form."""
    from services.education.students.models import StudentGuardian

    phones = [l.guardian.mobile_phone for l in StudentGuardian._base_manager.filter(student=student, receives_messages=True)
              .select_related('guardian') if l.guardian.mobile_phone]
    if not phones:
        phones = [p for p in (getattr(student, 'father_mobile', ''), getattr(student, 'mother_mobile', ''),
                              getattr(student, 'guardian_phone', '')) if p]
    return list(dict.fromkeys(phones))


def _callback_url() -> str:
    base = (getattr(settings, 'PUBLIC_API_URL', '') or '').rstrip('/')
    return f'{base}/api/v1/auth/communication/texts/status/' if base.startswith('https://') else ''


def send_text(cfg: SmsConfig, channel: str, to: str, body: str, *, student=None, event='', batch='', dedupe_key='') -> Message | None:
    """Send one SMS or WhatsApp message through Twilio and log it. Returns the log row (None if already sent)."""
    from .inbox import normalize_phone

    if dedupe_key and Message._base_manager.filter(tenant_id=cfg.tenant_id, dedupe_key=dedupe_key).exists():
        return None
    number = normalize_phone(to, cfg.default_country_code)
    log = Message._base_manager.create(tenant_id=cfg.tenant_id, student=student, sender='School', recipient=number or to,
                                 recipient_phone=(number or to)[:20], message=body[:1600], channel=channel, event=event,
                                 batch=batch, dedupe_key=dedupe_key[:200], last_attempt_at=timezone.now())
    sender = cfg.from_number if channel == 'sms' else cfg.whatsapp_from
    if not number:
        log.delivery_status, log.error = 'failed', f'{to} is not a valid phone number.'
    elif not sender:
        log.delivery_status, log.error = 'failed', f'No {"SMS" if channel == "sms" else "WhatsApp"} number is set up.'
    else:
        prefix = 'whatsapp:' if channel == 'whatsapp' else ''
        data = {'To': prefix + number, 'From': prefix + sender, 'Body': body[:1600]}
        if _callback_url():
            data['StatusCallback'] = _callback_url()
        try:
            base = getattr(settings, 'TWILIO_API_BASE', '') or 'https://api.twilio.com'  # overridable for local testing
            resp = requests.post(f'{base}/2010-04-01/Accounts/{cfg.account_sid}/Messages.json', data=data,
                                 auth=(cfg.account_sid, cfg.auth_token), timeout=15)
            payload = resp.json() if resp.content else {}
            if resp.status_code < 400:
                log.delivery_status, log.external_id = payload.get('status', 'queued'), payload.get('sid', '')
            else:
                log.delivery_status, log.error = 'failed', str(payload.get('message') or 'The provider refused the message.')[:300]
        except requests.RequestException as exc:
            log.delivery_status, log.error = 'failed', str(exc)[:300]
    log.save(update_fields=['delivery_status', 'external_id', 'error'])
    return log


def notify_family(student, event: str, ctx: dict, *, key: str) -> list[Message]:
    """An automatic alert about one student to the family, on the channels the school chose. Each alert (event + key,
    e.g. the date) goes to each number once."""
    school = getattr(student, 'tenant', None)
    cfg = config_for(school)
    r = rule(event, school) if school is not None else None
    if not cfg or not r or not r.is_active:
        return []
    cls = getattr(getattr(student, 'current_class', None), 'name', '')
    body = render(r.template, {'school': school_name(school), 'student': student.full_name, 'class': cls, **ctx})
    sent = []
    for channel in [c for c, on in (('sms', r.sms), ('whatsapp', r.whatsapp)) if on]:
        for phone in family_phones(student):
            msg = send_text(cfg, channel, phone, body, student=student, event=event,
                            dedupe_key=f'{event}:{student.pk}:{key}:{channel}:{phone}')
            if msg:
                sent.append(msg)
    return sent


def fee_reminder(invoice) -> list[Message]:
    from services.education.finance.billing import billing_contacts

    student = invoice.student
    school = getattr(student, 'tenant', None)
    currency = ((school.settings_json or {}).get('currency') if school else '') or ''
    amount = f'{currency} {invoice.balance_due:,.0f}'.strip()
    phones = [c['phone'] for c in billing_contacts([student]) if c.get('phone')]
    cfg, r = config_for(school), (rule('fee_reminder', school) if school is not None else None)
    if not cfg or not r or not r.is_active:
        return []
    body = render(r.template, {'school': school_name(school), 'student': student.full_name, 'amount': amount,
                               'due_date': invoice.due_date.strftime('%d %b %Y') if invoice.due_date else '',
                               'invoice': invoice.invoice_number,
                               'class': getattr(getattr(student, 'current_class', None), 'name', '')})
    phones = phones or family_phones(student)
    today = timezone.localdate().isoformat()
    out = []
    for channel in [c for c, on in (('sms', r.sms), ('whatsapp', r.whatsapp)) if on]:
        for phone in dict.fromkeys(phones):
            msg = send_text(cfg, channel, phone, body, student=student, event='fee_reminder',
                            dedupe_key=f'fee:{invoice.pk}:{today}:{channel}:{phone}')
            if msg:
                out.append(msg)
    return out


def emergency(school, message: str, phones: list[str], batch: str, channels: list[str]) -> dict:
    cfg = config_for(school)
    if not cfg:
        return {'sent': 0, 'failed': 0}
    r = rule('emergency', school)
    body = render(r.template, {'school': school_name(school), 'message': message})
    counts = defaultdict(int)
    for channel in channels:
        for phone in dict.fromkeys(phones):
            msg = send_text(cfg, channel, phone, body, event='emergency', batch=batch)
            counts['failed' if msg and msg.delivery_status == 'failed' else 'sent'] += 1
    return dict(counts)


def valid_signature(auth_token: str, url: str, params: dict, signature: str) -> bool:
    """Twilio signs callbacks: HMAC-SHA1 of the URL plus every POST field (sorted), with the account's auth token."""
    data = url + ''.join(f'{k}{params[k]}' for k in sorted(params))
    expected = base64.b64encode(hmac.new(auth_token.encode(), data.encode(), hashlib.sha1).digest()).decode()
    return bool(signature) and hmac.compare_digest(expected, signature)


def record_status(msg: Message, status: str, error_code: str = '') -> None:
    status = (status or '').lower()
    if not status:
        return
    fields = ['delivery_status']
    msg.delivery_status = status
    if status in ('delivered', 'read'):
        msg.is_delivered, msg.delivered_at = True, msg.delivered_at or timezone.now()
        fields += ['is_delivered', 'delivered_at']
    if status in ('undelivered', 'failed') and error_code:
        msg.error = f'Provider error {error_code}'
        fields.append('error')
    msg.save(update_fields=fields)
