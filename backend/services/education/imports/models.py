"""A record of each spreadsheet import (P10)."""
import uuid

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel


class ImportRun(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20)
    file_name = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    rows = models.PositiveIntegerField(default=0)
    added = models.PositiveIntegerField(default=0)
    skipped = models.PositiveIntegerField(default=0)
    failed = models.PositiveIntegerField(default=0)
    problems = models.JSONField(default=list, blank=True)  # [{row, messages}] for the error report
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.kind} import {self.created_at:%Y-%m-%d} ({self.added} added)'
