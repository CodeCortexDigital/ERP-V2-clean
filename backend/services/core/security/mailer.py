"""Transactional email (P3): one branded layout, sent through the school's own email when it has one (Phase 17),
and a delivery log."""
from __future__ import annotations

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape


def layout(title: str, paragraphs: list[str], *, button: tuple[str, str] | None = None, school_name: str = '',
           footer: str = '') -> tuple[str, str]:
    """(text, html) in the same simple layout for every system email."""
    brand = school_name or 'School ERP'
    text = f'{title}\n\n' + '\n\n'.join(paragraphs)
    if button:
        text += f'\n\n{button[0]}: {button[1]}'
    text += f'\n\n— {brand}' + (f'\n{footer}' if footer else '')
    body = ''.join(f'<p style="margin:0 0 14px;line-height:1.5">{escape(p)}</p>' for p in paragraphs)
    if button:
        body += (f'<p style="margin:22px 0"><a href="{escape(button[1])}" style="background:#1d4ed8;color:#fff;padding:11px 18px;'
                 f'border-radius:8px;text-decoration:none;font-weight:600">{escape(button[0])}</a></p>'
                 f'<p style="font-size:12px;color:#64748b">If the button does not work, copy this address into your browser:<br>{escape(button[1])}</p>')
    html = (f'<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">'
            f'<p style="font-size:13px;color:#64748b;margin:0 0 18px">{escape(brand)}</p>'
            f'<h1 style="font-size:20px;margin:0 0 16px">{escape(title)}</h1>{body}'
            f'<p style="font-size:12px;color:#94a3b8;margin-top:28px">{escape(footer or "This email was sent automatically; you do not need to reply.")}</p></div>')
    return text, html


def send(kind: str, to: list[str], subject: str, text: str, html: str | None = None, *, school=None) -> bool:
    """Send and log. Never raises: a failed email must not break the action that triggered it."""
    from .models import EmailLog

    to = [t for t in to if t]
    if not to:
        return False
    status, error = 'sent', ''
    try:
        msg = EmailMultiAlternatives(subject=subject[:200], body=text, from_email=settings.DEFAULT_FROM_EMAIL, to=to)
        if html:
            msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception as exc:
        status, error = 'failed', str(exc)[:500]
    try:
        EmailLog.objects.create(school=school if getattr(school, 'pk', None) else None, kind=kind, to=', '.join(to)[:500],
                                subject=subject[:200], status=status, error=error)
    except Exception:
        pass
    return status == 'sent'
