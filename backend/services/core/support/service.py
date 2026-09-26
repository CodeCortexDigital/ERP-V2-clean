"""Help centre and support tickets (P15): who sees which help, reply deadlines, history and emails."""
from __future__ import annotations

import os
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from .models import HelpArticle, SupportTicket, TicketMessage

# How soon the support team promises a first reply, by priority.
REPLY_HOURS = {'urgent': 4, 'high': 24, 'normal': 48, 'low': 120}
FAMILY_ROLES = ('parent', 'student')


def audience(user) -> str | None:
    """The help audience for this person: admin, teacher, staff, parent or student (None = the platform owner: all)."""
    if user.is_superuser:
        return None
    from services.core.accounts.decorators import get_user_role

    role = get_user_role(user)
    if role in ('admin', 'teacher', 'parent', 'student'):
        return role
    return 'student' if role is None else 'staff'  # no known role: the least


def can_open_tickets(user) -> bool:
    """School staff contact the platform; parents and students contact their school instead."""
    return user.is_superuser or audience(user) not in FAMILY_ROLES


def articles_for(user, q: str = '', module: str = ''):
    qs = HelpArticle.objects.filter(published=True)
    who = audience(user)
    if who is not None:
        # Empty roles = everyone. JSON "contains" isn't available on every database, so filter in Python.
        qs = [a for a in qs if not a.roles or who in a.roles]
    else:
        qs = list(qs)
    if module:
        qs = [a for a in qs if a.module == module]
    q = (q or '').strip().lower()
    if q:
        words = [w for w in q.split() if len(w) > 1] or [q]

        def score(a):
            title, rest = a.title.lower(), f'{a.summary} {a.body}'.lower()
            return sum(3 * (w in title) + (w in rest) for w in words)

        qs = sorted((a for a in qs if score(a)), key=lambda a: (-score(a), a.order))
    return qs


def support_emails() -> list[str]:
    configured = [e.strip() for e in os.environ.get('SUPPORT_EMAILS', '').split(',') if e.strip()]
    if configured:
        return configured
    return list(get_user_model()._base_manager.filter(is_superuser=True, is_active=True).exclude(email='')
                .values_list('email', flat=True)[:5])


def _email(to, subject, title, lines, link, school=None):
    from services.core.security.mailer import layout, send

    text, html = layout(title, lines, button=('Open the ticket', link) if link else None,
                        school_name='School ERP support')
    send('support', to, subject, text, html, school=school)


def _link(origin, ticket, platform=False):
    if not origin:
        return ''
    return f'{origin}/platform/schools?ticket={ticket.id}' if platform else f'{origin}/help/tickets/{ticket.id}'


@transaction.atomic
def open_ticket(user, school, *, subject, body, category='question', priority='normal', page='', origin=''):
    number = (SupportTicket.objects.select_for_update().aggregate(n=Max('number'))['n'] or 1000) + 1
    now = timezone.now()
    ticket = SupportTicket.objects.create(number=number, school=school, created_by=user, subject=subject[:200],
                                          category=category, priority=priority, page=page[:300],
                                          reply_due_at=now + timedelta(hours=REPLY_HOURS.get(priority, 48)))
    TicketMessage.objects.create(ticket=ticket, author=user, body=body)
    return ticket


def open_ticket_and_notify(user, school, **kw):
    """Opens the ticket, then tells the support team (never fails because of email)."""
    origin = kw.get('origin', '')
    ticket = open_ticket(user, school, **kw)
    _email(support_emails(), f'[Support #{ticket.number}] {ticket.subject[:120]}', f'New support ticket #{ticket.number}',
           [f'From {user.email}' + (f' at {school.name}' if school else '') + f'. Priority: {ticket.get_priority_display()}.',
            kw.get('body', '')[:1500]], _link(origin, ticket, platform=True), school)
    return ticket


def _event(ticket, user, text):
    TicketMessage.objects.create(ticket=ticket, author=user, from_support=True, kind='event', body=text)


def reply(ticket, user, body, *, from_support: bool, internal=False, origin=''):
    now = timezone.now()
    msg = TicketMessage.objects.create(ticket=ticket, author=user, from_support=from_support,
                                       kind='note' if internal else 'reply', body=body)
    if internal:
        ticket.save(update_fields=['updated_at'])
        return msg
    fields = ['status', 'updated_at']
    if from_support:
        if not ticket.first_reply_at:
            ticket.first_reply_at = now
            fields.append('first_reply_at')
        if ticket.status not in ('resolved', 'closed'):
            ticket.status = 'waiting_school'
        if ticket.created_by and ticket.created_by.email:
            _email([ticket.created_by.email], f'[Support #{ticket.number}] New reply: {ticket.subject[:100]}',
                   f'Support replied to ticket #{ticket.number}', [body[:1500]], _link(origin, ticket), ticket.school)
    else:
        # The school wrote back: it goes back to the support team, and a resolved ticket opens again.
        ticket.status = 'waiting_support'
        if ticket.resolved_at:
            ticket.resolved_at = None
            fields.append('resolved_at')
        to = [ticket.assigned_to.email] if ticket.assigned_to_id and ticket.assigned_to.email else support_emails()
        _email(to, f'[Support #{ticket.number}] Reply from the school', f'The school replied to ticket #{ticket.number}',
               [body[:1500]], _link(origin, ticket, platform=True), ticket.school)
    ticket.save(update_fields=fields)
    return msg


def change(ticket, user, *, status=None, priority=None, assigned_to=None, unassign=False):
    """Status, priority and assignment changes, each recorded in the history."""
    fields = ['updated_at']
    if status and status != ticket.status:
        _event(ticket, user, f'Status: {ticket.get_status_display()} → {dict(SupportTicket.STATUSES)[status]}')
        ticket.status = status
        ticket.resolved_at = timezone.now() if status in ('resolved', 'closed') else None
        fields += ['status', 'resolved_at']
    if priority and priority != ticket.priority:
        _event(ticket, user, f'Priority: {ticket.get_priority_display()} → {dict(SupportTicket.PRIORITIES)[priority]}')
        ticket.priority = priority
        fields.append('priority')
        if not ticket.first_reply_at:
            ticket.reply_due_at = ticket.created_at + timedelta(hours=REPLY_HOURS[priority])
            fields.append('reply_due_at')
    if unassign and ticket.assigned_to_id:
        _event(ticket, user, 'Unassigned')
        ticket.assigned_to = None
        fields.append('assigned_to')
    elif assigned_to is not None and assigned_to.pk != ticket.assigned_to_id:
        _event(ticket, user, f'Assigned to {assigned_to.full_name or assigned_to.email}')
        ticket.assigned_to = assigned_to
        fields.append('assigned_to')
    ticket.save(update_fields=list(dict.fromkeys(fields)))
    return ticket


def overdue(ticket) -> bool:
    return bool(ticket.reply_due_at and not ticket.first_reply_at and ticket.status not in ('resolved', 'closed')
                and ticket.reply_due_at < timezone.now())


def visible_tickets(user):
    """The platform owner: all. A school administrator: the school's. Anyone else: their own."""
    qs = SupportTicket.objects.select_related('school', 'created_by', 'assigned_to')
    if user.is_superuser:
        return qs
    if audience(user) == 'admin':
        from services.core.security.policy import user_school

        school = user_school(user)
        return qs.filter(Q(created_by=user) | Q(school=school)) if school else qs.filter(created_by=user)
    return qs.filter(created_by=user)


def close_resolved(days: int = 7) -> int:
    """Resolved tickets with no reply for a week are closed (run daily)."""
    cutoff = timezone.now() - timedelta(days=days)
    return SupportTicket.objects.filter(status='resolved', resolved_at__lt=cutoff).update(status='closed')
