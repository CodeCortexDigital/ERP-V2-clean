"""Help centre and support tickets (P15).

Help articles are the platform's own (the same for every school) and shown by role. Tickets go from a school to the
platform's support team, with priority, status, a first-reply deadline, assignment and a full history.
"""
import uuid

from django.conf import settings
from django.db import models

ROLES = ('admin', 'teacher', 'staff', 'parent', 'student')


class HelpArticle(models.Model):
    KINDS = [('guide', 'Guide'), ('faq', 'Question and answer'), ('video', 'Video')]
    MODULES = [
        ('getting-started', 'Getting started'), ('students', 'Students and admissions'), ('attendance', 'Attendance'),
        ('fees', 'Fees and payments'), ('exams', 'Exams and grades'), ('timetable', 'Timetable'),
        ('communication', 'Messages and announcements'), ('staff', 'Staff and payroll'), ('portal', 'Parent and student portal'),
        ('account', 'Your account and security'), ('settings', 'School settings and billing'), ('other', 'Other'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=300, blank=True)
    body = models.TextField(help_text='Plain text. "## " starts a heading, "- " a bullet, "1. " a numbered step.')
    module = models.CharField(max_length=30, choices=MODULES, default='other')
    kind = models.CharField(max_length=10, choices=KINDS, default='guide')
    roles = models.JSONField(default=list, blank=True, help_text='Who sees it; empty = everyone.')
    video_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=100)
    published = models.BooleanField(default=True)
    helpful_yes = models.PositiveIntegerField(default=0)
    helpful_no = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['module', 'order', 'title']

    def __str__(self):
        return self.title


class SupportTicket(models.Model):
    CATEGORIES = [('question', 'How do I…?'), ('problem', 'Something is not working'), ('billing', 'Plan and billing'),
                  ('data', 'Data, import or export'), ('feature', 'Idea or request'), ('other', 'Other')]
    PRIORITIES = [('low', 'Low'), ('normal', 'Normal'), ('high', 'High'), ('urgent', 'Urgent: the school cannot work')]
    STATUSES = [('open', 'New'), ('waiting_support', 'Waiting for support'), ('waiting_school', 'Waiting for your reply'),
                ('resolved', 'Resolved'), ('closed', 'Closed')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.PositiveIntegerField(unique=True, editable=False)
    school = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.SET_NULL, related_name='support_tickets')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='support_tickets')
    subject = models.CharField(max_length=200)
    category = models.CharField(max_length=12, choices=CATEGORIES, default='question')
    priority = models.CharField(max_length=8, choices=PRIORITIES, default='normal')
    status = models.CharField(max_length=16, choices=STATUSES, default='open', db_index=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='assigned_support_tickets')
    page = models.CharField(max_length=300, blank=True)  # where in the app the person was
    reply_due_at = models.DateTimeField(null=True, blank=True)  # the first-reply promise for its priority
    first_reply_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'#{self.number} {self.subject}'


class TicketMessage(models.Model):
    """The ticket's history: replies from either side, the support team's internal notes, and changes."""
    KINDS = [('reply', 'Reply'), ('note', 'Internal note'), ('event', 'Change')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+')
    from_support = models.BooleanField(default=False)
    kind = models.CharField(max_length=6, choices=KINDS, default='reply')
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class CannedResponse(models.Model):
    """Saved replies for the support team."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=120)
    body = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']
