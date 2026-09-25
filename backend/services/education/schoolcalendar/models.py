"""School calendar: events, holidays and closures, deadlines, and parent-teacher meeting slots."""
import uuid

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel


class CalendarEvent(TenantScopedModel):
    KINDS = [('event', 'Event'), ('holiday', 'Holiday / no school'), ('meeting', 'Meeting'), ('deadline', 'Deadline'),
             ('exam', 'Exam period'), ('trip', 'Trip'), ('sports', 'Sports'), ('other', 'Other')]
    AUDIENCES = [('everyone', 'Everyone'), ('staff', 'Staff only'), ('families', 'Families and students'),
                 ('class', 'Chosen classes'), ('grade', 'Grade levels')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    kind = models.CharField(max_length=12, choices=KINDS, default='event')
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    start_time = models.TimeField(null=True, blank=True, help_text='Empty = all day')
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, default='')
    audience = models.CharField(max_length=10, choices=AUDIENCES, default='everyone')
    class_ids = models.JSONField(default=list, blank=True)
    grade_levels = models.JSONField(default=list, blank=True)
    closes_school = models.BooleanField(default=False, help_text='No attendance is taken on these days')
    remind_days_before = models.PositiveSmallIntegerField(null=True, blank=True)
    reminder_sent_on = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['start_date', 'start_time']


class MeetingSlot(TenantScopedModel):
    """A time a teacher offers for parent-teacher meetings; a parent books it for one child."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='meeting_slots')
    title = models.CharField(max_length=120, default='Parent-teacher meeting')
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    location = models.CharField(max_length=200, blank=True, default='', help_text='Room, or a video-call link')
    booked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='meeting_bookings')
    student = models.ForeignKey('education_students.Student', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='meetings')
    note = models.CharField(max_length=500, blank=True, default='')
    booked_at = models.DateTimeField(null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'start_time']
