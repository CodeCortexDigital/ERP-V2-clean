"""Per-school connections to outside services (Microsoft sign-in, Google Classroom, the school's own email)."""
import uuid

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel


class Integration(TenantScopedModel):
    PROVIDERS = [('microsoft', 'Microsoft 365 / Entra ID sign-in'), ('google_classroom', 'Google Classroom'),
                 ('email', 'School email (SMTP)')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=30, choices=PROVIDERS)
    enabled = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)  # settings that are safe to show
    secret_blob = models.TextField(blank=True, default='')  # encrypted JSON: passwords, client secrets, tokens
    connected_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    connected_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=500, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['tenant', 'provider'], name='uniq_integration_provider')]


class ClassroomLink(TenantScopedModel):
    """A Google Classroom course matched to one of the school's classes."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_class = models.ForeignKey('education_academics.SchoolClass', on_delete=models.CASCADE, related_name='classroom_links')
    course_id = models.CharField(max_length=64)
    course_name = models.CharField(max_length=255, blank=True, default='')
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_report = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['tenant', 'course_id'], name='uniq_classroom_course')]
