import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('PERMISSION_DENIED', 'Permission Denied'),
        ('EXPORT', 'Export'),
        ('SECURITY', 'Security'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs')
    # The school the action was done in (Phase 21). Older rows have none and are only visible to the platform owner.
    school = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs')
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=128, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    changes = models.JSONField(null=True, blank=True, help_text="Field-level diff: {field: {old, new}}")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['resource_type']),
            models.Index(fields=['resource_id']),
            models.Index(fields=['user']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
            models.Index(fields=['school', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.action} - {self.resource_type} - {self.resource_id} - {self.user_id or 'anon'}"