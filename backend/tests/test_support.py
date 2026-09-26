"""Help centre and support tickets (P15)."""
from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.core.accounts.models import ParentProfile, TeacherProfile
from services.core.portability.data import school_querysets
from services.core.support import service
from services.core.support.models import HelpArticle, SupportTicket
from services.core.tenants.models import TenantMembership
from tests.conftest import SchoolFactory, UserFactory

H = '/api/v1/support'


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
    return c


@pytest.fixture
def sup(db, settings):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    school, other = SchoolFactory(name='Hill School'), SchoolFactory(name='Other School')
    people = {}
    for key, email, sch, role in [('admin', 'office@hill.test', school, 'admin'), ('teacher', 'tess@hill.test', school, 'teacher'),
                                  ('parent', 'pat@hill.test', school, 'parent'), ('other_admin', 'office@other.test', other, 'admin')]:
        u = UserFactory(email=email)
        TenantMembership.objects.create(user=u, school=sch, role=role, is_primary=True)
        if role == 'parent':
            ParentProfile.objects.create(user=u)
        elif role == 'teacher':
            TeacherProfile.objects.create(user=u)
        people[key] = u
    people['owner'] = UserFactory(email='owner@platform.test', is_superuser=True, is_staff=True)
    return dict(school=school, **people)


@pytest.mark.django_db
def test_help_is_shown_by_role_and_searchable(sup):
    assert HelpArticle.objects.count() >= 20  # the starter set
    parent = _client(sup['parent']).get(f'{H}/help/').json()
    slugs = {a['slug'] for a in parent['articles']}
    assert 'pay-fees-online' in slugs and 'forgot-password' in slugs and 'fee-structure' not in slugs
    assert parent['can_open_tickets'] is False
    teacher = {a['slug'] for a in _client(sup['teacher']).get(f'{H}/help/').json()['articles']}
    assert 'take-attendance' in teacher and 'payroll' not in teacher
    found = _client(sup['admin']).get(f'{H}/help/', {'q': 'forgot password'}).json()['articles']
    assert found[0]['slug'] == 'forgot-password'
    fees = _client(sup['admin']).get(f'{H}/help/', {'module': 'fees'}).json()['articles']
    assert fees and all(a['module'] == 'fees' for a in fees)
    art = _client(sup['parent']).get(f'{H}/help/portal-overview/').json()
    assert 'Fees & Billing' in art['article']['body']
    assert _client(sup['parent']).get(f'{H}/help/payroll/').status_code == 404  # not for parents
    c = _client(sup['parent'])
    c.post(f'{H}/help/portal-overview/vote/', {'helpful': True}, format='json')
    c.post(f'{H}/help/portal-overview/vote/', {'helpful': True}, format='json')  # counted once
    assert HelpArticle.objects.get(slug='portal-overview').helpful_yes == 1


@pytest.mark.django_db
def test_a_ticket_from_start_to_finish(sup):
    t = _client(sup['teacher'])
    r = t.post(f'{H}/tickets/', {'subject': 'Marks page is blank', 'body': 'Results Entry shows nothing for Grade 6.',
                                 'category': 'problem', 'priority': 'high', 'page': '/education/exams'}, format='json')
    assert r.status_code == 201
    tk = r.json()['ticket']
    assert tk['number'] > 1000 and tk['status'] == 'open' and tk['school'] == 'Hill School'
    row = SupportTicket.objects.get(pk=tk['id'])
    assert abs((row.reply_due_at - row.created_at) - timedelta(hours=24)) < timedelta(seconds=5)
    assert mail.outbox[-1].to == ['owner@platform.test'] and f"#{tk['number']}" in mail.outbox[-1].subject
    # Parents contact the school instead.
    assert _client(sup['parent']).post(f'{H}/tickets/', {'subject': 'x', 'body': 'y'}, format='json').status_code == 403
    # Who sees it: the teacher, the school's office, the platform; not another school.
    assert _client(sup['admin']).get(f'{H}/tickets/').json()['tickets'][0]['id'] == tk['id']
    assert _client(sup['other_admin']).get(f"{H}/tickets/{tk['id']}/").status_code == 404
    owner = _client(sup['owner'])
    assert owner.get(f'{H}/tickets/overview/').json()['total'] == 1
    # Support: an internal note (hidden from the school), then a reply (emailed to the teacher).
    owner.post(f"{H}/tickets/{tk['id']}/", {'body': 'Looks like the section filter.', 'internal': True}, format='json')
    mail.outbox.clear()
    after = owner.post(f"{H}/tickets/{tk['id']}/", {'body': 'Fixed, please check.'}, format='json').json()['ticket']
    assert after['status'] == 'waiting_school' and after['first_reply_at']
    assert mail.outbox[0].to == ['tess@hill.test'] and 'Fixed, please check.' in mail.outbox[0].body
    seen = t.get(f"{H}/tickets/{tk['id']}/").json()['ticket']['messages']
    assert [m['kind'] for m in seen] == ['reply', 'reply'] and seen[1]['author'] == 'Support team'
    # The school replies (back to support), then says it's sorted.
    assert t.post(f"{H}/tickets/{tk['id']}/", {'body': 'Still blank for 6B.'}, format='json').json()['ticket']['status'] == 'waiting_support'
    assert t.post(f"{H}/tickets/{tk['id']}/", {'action': 'resolve'}, format='json').json()['ticket']['status'] == 'resolved'
    # Assignment (support team only), priority, history.
    assert owner.post(f"{H}/tickets/{tk['id']}/manage/", {'assigned_to': str(sup['admin'].pk)}, format='json').status_code == 400
    m = owner.post(f"{H}/tickets/{tk['id']}/manage/", {'assigned_to': str(sup['owner'].pk), 'priority': 'urgent', 'status': 'closed'},
                   format='json').json()['ticket']
    events = [x['body'] for x in m['messages'] if x['kind'] == 'event']
    assert any('Assigned to' in e for e in events) and any('Priority' in e for e in events) and any('Closed' in e for e in events)
    assert t.post(f"{H}/tickets/{tk['id']}/", {'body': 'one more thing'}, format='json').status_code == 400  # closed
    assert t.post(f"{H}/tickets/{tk['id']}/manage/", {'status': 'open'}, format='json').status_code == 403


@pytest.mark.django_db
def test_overdue_closing_and_export(sup):
    t = service.open_ticket(sup['admin'], sup['school'], subject='Invoice question', body='?', priority='low')
    SupportTicket.objects.filter(pk=t.pk).update(reply_due_at=timezone.now() - timedelta(hours=1))
    t.refresh_from_db()
    assert service.overdue(t)
    assert _client(sup['owner']).get(f'{H}/tickets/overview/').json()['overdue'] == 1
    service.change(t, sup['owner'], status='resolved')
    SupportTicket.objects.filter(pk=t.pk).update(resolved_at=timezone.now() - timedelta(days=8))
    assert service.close_resolved() == 1
    labels = {label for label, _m, qs in school_querysets(sup['school']) if qs.exists()}
    assert {'core_support.SupportTicket', 'core_support.TicketMessage'} <= labels


@pytest.mark.django_db
def test_platform_owner_manages_articles(sup):
    owner = _client(sup['owner'])
    assert _client(sup['admin']).post(f'{H}/help/manage/', {'title': 'x', 'body': 'y'}, format='json').status_code == 403
    a = owner.post(f'{H}/help/manage/', {'title': 'Using the library', 'body': '1. Scan the book.', 'module': 'other',
                                         'roles': ['teacher']}, format='json').json()['article']
    assert a['slug'] == 'using-the-library'
    assert 'using-the-library' in {x['slug'] for x in _client(sup['teacher']).get(f'{H}/help/').json()['articles']}
    assert 'using-the-library' not in {x['slug'] for x in _client(sup['parent']).get(f'{H}/help/').json()['articles']}
    owner.put(f"{H}/help/manage/{a['id']}/", {'published': False}, format='json')
    assert 'using-the-library' not in {x['slug'] for x in _client(sup['teacher']).get(f'{H}/help/').json()['articles']}
