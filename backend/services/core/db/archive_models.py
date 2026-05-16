"""
Cold-storage archive tables for high-growth data.
"""

import uuid

from django.conf import settings
from django.db import models


class AttendanceRecordArchive(models.Model):
    id = models.UUIDField(primary_key=True)
    student_id = models.UUIDField(db_index=True)
    course_id = models.CharField(max_length=50, blank=True)
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20)
    remarks = models.TextField(blank=True)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    source_created_at = models.DateTimeField(null=True, blank=True)
    source_updated_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'archive_attendance_record'
        indexes = [
            models.Index(fields=['student_id', 'date']),
        ]


class NotificationArchive(models.Model):
    id = models.UUIDField(primary_key=True)
    recipient_id = models.UUIDField(db_index=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50)
    is_read = models.BooleanField(default=False)
    source_created_at = models.DateTimeField(db_index=True)
    archived_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'archive_notification'


class AuditLogArchive(models.Model):
    id = models.UUIDField(primary_key=True)
    user_id = models.UUIDField(null=True, blank=True, db_index=True)
    action = models.CharField(max_length=32)
    resource_type = models.CharField(max_length=128, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)
    source_timestamp = models.DateTimeField(db_index=True)
    archived_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'archive_audit_log'


class InvoiceArchive(models.Model):
    id = models.UUIDField(primary_key=True)
    invoice_number = models.CharField(max_length=50, db_index=True)
    student_id = models.UUIDField(db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField(db_index=True)
    issue_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20)
    partition_year = models.PositiveSmallIntegerField(db_index=True)
    source_created_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'archive_invoice'
        indexes = [
            models.Index(fields=['partition_year', 'student_id']),
        ]
