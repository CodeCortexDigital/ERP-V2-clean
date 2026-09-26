"""Help centre and support tickets (P15). /api/v1/support/"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from services.core.accounts.permissions import IsPlatformOwner
from services.core.security.password import app_origin
from services.core.security.policy import user_school

from . import service
from .models import CannedResponse, HelpArticle, SupportTicket


def _local(dt):
    return timezone.localtime(dt).isoformat() if dt else None


def _name(u):
    return (u.full_name or u.email) if u else ''


def _article(a, full=False):
    out = {'id': str(a.id), 'slug': a.slug, 'title': a.title, 'summary': a.summary, 'module': a.module,
           'module_label': a.get_module_display(), 'kind': a.kind, 'video_url': a.video_url, 'updated_at': _local(a.updated_at)}
    if full:
        out.update(body=a.body, roles=a.roles, order=a.order, published=a.published,
                   helpful_yes=a.helpful_yes, helpful_no=a.helpful_no)
    return out


# ---- Help centre ----------------------------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def help_list(request):
    items = service.articles_for(request.user, request.query_params.get('q', ''), request.query_params.get('module', ''))
    return Response({'articles': [_article(a) for a in items], 'modules': [{'key': k, 'label': v} for k, v in HelpArticle.MODULES],
                     'can_open_tickets': service.can_open_tickets(request.user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def help_article(request, slug):
    a = next((x for x in service.articles_for(request.user) if x.slug == slug), None)
    if a is None:
        return Response({'error': 'Article not found.'}, status=status.HTTP_404_NOT_FOUND)
    related = [x for x in service.articles_for(request.user, module=a.module) if x.pk != a.pk][:5]
    return Response({'article': _article(a, full=True), 'related': [_article(x) for x in related]})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def help_vote(request, slug):
    a = get_object_or_404(HelpArticle, slug=slug, published=True)
    key = f'help-vote:{request.user.pk}:{a.pk}'
    if cache.get(key):
        return Response({'message': 'Thanks, you already told us.'})
    field = 'helpful_yes' if request.data.get('helpful') else 'helpful_no'
    HelpArticle.objects.filter(pk=a.pk).update(**{field: getattr(a, field) + 1})
    cache.set(key, 1, 60 * 60 * 24 * 30)
    return Response({'message': 'Thanks for telling us.'})


ARTICLE_FIELDS = ('title', 'summary', 'body', 'module', 'kind', 'roles', 'video_url', 'order', 'published')


@api_view(['GET', 'POST'])
@permission_classes([IsPlatformOwner])
def help_manage(request):
    if request.method == 'GET':
        return Response({'articles': [_article(a, full=True) for a in HelpArticle.objects.all()]})
    d = request.data
    if not str(d.get('title') or '').strip() or not str(d.get('body') or '').strip():
        return Response({'error': 'A title and the text are required.'}, status=status.HTTP_400_BAD_REQUEST)
    base = slugify(d.get('slug') or d['title'])[:100] or 'article'
    slug, n = base, 2
    while HelpArticle.objects.filter(slug=slug).exists():
        slug, n = f'{base}-{n}', n + 1
    a = HelpArticle.objects.create(slug=slug, **{k: d[k] for k in ARTICLE_FIELDS if k in d})
    return Response({'article': _article(a, full=True)}, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsPlatformOwner])
def help_manage_one(request, article_id):
    a = get_object_or_404(HelpArticle, pk=article_id)
    if request.method == 'DELETE':
        a.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    for k in ARTICLE_FIELDS:
        if k in request.data:
            setattr(a, k, request.data[k])
    a.save()
    return Response({'article': _article(a, full=True)})


# ---- Tickets ---------------------------------------------------------------------------------------------------

def _ticket(t, *, support=False, with_messages=False):
    out = {'id': str(t.id), 'number': t.number, 'subject': t.subject, 'category': t.category, 'category_label': t.get_category_display(),
           'priority': t.priority, 'priority_label': t.get_priority_display(), 'status': t.status, 'status_label': t.get_status_display(),
           'school': t.school.name if t.school_id else '', 'created_by': _name(t.created_by),
           'created_by_email': t.created_by.email if t.created_by_id else '',
           'assigned_to': _name(t.assigned_to), 'assigned_to_id': str(t.assigned_to_id) if t.assigned_to_id else None,
           'page': t.page, 'created_at': _local(t.created_at), 'updated_at': _local(t.updated_at),
           'reply_due_at': _local(t.reply_due_at), 'first_reply_at': _local(t.first_reply_at), 'overdue': service.overdue(t)}
    if with_messages:
        msgs = t.messages.select_related('author')
        if not support:
            msgs = msgs.exclude(kind='note')  # internal notes stay with the support team
        out['messages'] = [{'id': str(m.id), 'kind': m.kind, 'body': m.body, 'from_support': m.from_support,
                            'author': 'Support team' if (m.from_support and not support) else _name(m.author),
                            'at': _local(m.created_at)} for m in msgs]
    return out


def _choice(value, choices, default):
    return value if value in dict(choices) else default


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tickets(request):
    user = request.user
    if request.method == 'POST':
        if not service.can_open_tickets(user):
            return Response({'error': 'Please contact your school office; they can reach support for you.'},
                            status=status.HTTP_403_FORBIDDEN)
        d = request.data
        subject, body = str(d.get('subject') or '').strip(), str(d.get('body') or '').strip()
        if not subject or not body:
            return Response({'error': 'Please give a short subject and describe what happened.'}, status=status.HTTP_400_BAD_REQUEST)
        key = f'support-open:{user.pk}'
        if cache.get(key, 0) >= 10:
            return Response({'error': 'You have opened many tickets in the last hour. Please add to an open one.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        cache.set(key, cache.get(key, 0) + 1, 3600)
        t = service.open_ticket_and_notify(user, user_school(user), subject=subject, body=body[:10000],
                                category=_choice(d.get('category'), SupportTicket.CATEGORIES, 'question'),
                                priority=_choice(d.get('priority'), SupportTicket.PRIORITIES, 'normal'),
                                page=str(d.get('page') or ''), origin=app_origin(request))
        return Response({'ticket': _ticket(t, with_messages=True)}, status=status.HTTP_201_CREATED)
    qs = service.visible_tickets(user)
    state = request.query_params.get('status', '')
    if state == 'open':
        qs = qs.exclude(status__in=('resolved', 'closed'))
    elif state:
        qs = qs.filter(status=state)
    return Response({'tickets': [_ticket(t) for t in qs[:200]], 'can_open_tickets': service.can_open_tickets(user)})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ticket_detail(request, ticket_id):
    t = get_object_or_404(service.visible_tickets(request.user), pk=ticket_id)
    support = request.user.is_superuser
    if request.method == 'POST':
        action = request.data.get('action', 'reply')
        if action == 'reply':
            body = str(request.data.get('body') or '').strip()
            if not body:
                return Response({'error': 'Write a reply first.'}, status=status.HTTP_400_BAD_REQUEST)
            if t.status == 'closed' and not support:
                return Response({'error': 'This ticket is closed. Please open a new one.'}, status=status.HTTP_400_BAD_REQUEST)
            service.reply(t, request.user, body[:10000], from_support=support,
                          internal=support and bool(request.data.get('internal')), origin=app_origin(request))
        elif action in ('resolve', 'reopen') and not support:
            # The school can say it's sorted, or that it isn't after all.
            service.change(t, request.user, status='resolved' if action == 'resolve' else 'waiting_support')
        else:
            return Response({'error': 'Unknown action.'}, status=status.HTTP_400_BAD_REQUEST)
        t.refresh_from_db()
    return Response({'ticket': _ticket(t, support=support, with_messages=True)})


@api_view(['POST'])
@permission_classes([IsPlatformOwner])
def ticket_manage(request, ticket_id):
    t = get_object_or_404(SupportTicket, pk=ticket_id)
    d = request.data
    assignee = None
    if d.get('assigned_to'):
        assignee = get_user_model()._base_manager.filter(pk=d['assigned_to'], is_superuser=True, is_active=True).first()
        if assignee is None:
            return Response({'error': 'Tickets can be assigned to the support team only.'}, status=status.HTTP_400_BAD_REQUEST)
    service.change(t, request.user, status=d.get('status') if d.get('status') in dict(SupportTicket.STATUSES) else None,
                   priority=d.get('priority') if d.get('priority') in dict(SupportTicket.PRIORITIES) else None,
                   assigned_to=assignee, unassign=d.get('assigned_to') == '')
    t.refresh_from_db()
    return Response({'ticket': _ticket(t, support=True, with_messages=True)})


@api_view(['GET'])
@permission_classes([IsPlatformOwner])
def support_overview(request):
    qs = SupportTicket.objects.all()
    active = qs.exclude(status__in=('resolved', 'closed'))
    counts = active.aggregate(total=Count('id'), urgent=Count('id', filter=Q(priority='urgent')),
                              waiting=Count('id', filter=Q(status__in=('open', 'waiting_support'))))
    overdue = sum(service.overdue(t) for t in active.filter(first_reply_at__isnull=True))
    team = get_user_model()._base_manager.filter(is_superuser=True, is_active=True)
    return Response({**counts, 'overdue': overdue,
                     'team': [{'id': str(u.pk), 'name': _name(u)} for u in team],
                     'canned': [{'id': str(c.id), 'title': c.title, 'body': c.body} for c in CannedResponse.objects.all()]})
