"""School data export and end-of-contract deletion (P13). Platform-level records: not scoped to a school."""
import uuid

from django.conf import settings
from django.db import models


class SchoolExport(models.Model):
    FORMATS = [('csv', 'CSV files (zip)'), ('json', 'JSON (zip)'), ('xlsx', 'Excel workbook')]
    STATUSES = [('ready', 'Ready'), ('failed', 'Failed'), ('expired', 'Expired')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='exports')
    format = models.CharField(max_length=5, choices=FORMATS)
    status = models.CharField(max_length=8, choices=STATUSES, default='ready')
    file = models.FileField(upload_to='school-exports/%Y/%m/', blank=True)
    size = models.PositiveBigIntegerField(default=0)
    counts = models.JSONField(default=dict, blank=True)  # {model label: rows}
    error = models.CharField(max_length=300, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']


class SchoolDeletion(models.Model):
    """A request to delete a school's data when its contract ends, and afterwards the proof it was done."""
    STATUSES = [('scheduled', 'Scheduled'), ('cancelled', 'Cancelled'), ('done', 'Deleted')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Kept after the deletion: the school row itself stays as an empty, inactive tombstone for invoices and this proof.
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='deletions')
    school_name = models.CharField(max_length=255)
    school_code = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=STATUSES, default='scheduled')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    requested_by_email = models.CharField(max_length=255, blank=True)  # kept after the requester's account is deleted too
    requested_at = models.DateTimeField(auto_now_add=True)
    scheduled_for = models.DateTimeField()
    reason = models.CharField(max_length=300, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.CharField(max_length=255, blank=True)  # an email, or "daily job"
    counts = models.JSONField(default=dict, blank=True)  # {what: rows deleted}
    files_deleted = models.PositiveIntegerField(default=0)
    users_deleted = models.PositiveIntegerField(default=0)
    last_export_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
