"""Application errors, grouped (P4)."""
import uuid

from django.db import models


class ErrorGroup(models.Model):
    SOURCES = [('backend', 'Server'), ('frontend', 'Browser')]
    STATUSES = [('open', 'Open'), ('resolved', 'Resolved'), ('ignored', 'Ignored')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fingerprint = models.CharField(max_length=64, unique=True)
    source = models.CharField(max_length=10, choices=SOURCES)
    kind = models.CharField(max_length=120)          # exception class, or "Error" for the browser
    message = models.CharField(max_length=500)
    location = models.CharField(max_length=300, blank=True)  # file:line / function, or page
    count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUSES, default='open')
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True, db_index=True)
    last_school = models.CharField(max_length=255, blank=True)
    last_user = models.CharField(max_length=255, blank=True)
    last_path = models.CharField(max_length=300, blank=True)
    release = models.CharField(max_length=60, blank=True)
    samples = models.JSONField(default=list, blank=True)  # the latest few occurrences, with the stack trace
    alerted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-last_seen']
