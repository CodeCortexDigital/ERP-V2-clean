import uuid

from django.conf import settings
from django.db import models


class StoredFile(models.Model):
    BUCKET_CHOICES = [
        ('media', 'Media'),
        ('backups', 'Backups'),
        ('reports', 'Reports'),
        ('public', 'Public'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_code = models.CharField(max_length=100, db_index=True)
    storage_key = models.CharField(max_length=512, unique=True)
    bucket_type = models.CharField(max_length=20, choices=BUCKET_CHOICES, default='media')
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128, blank=True)
    size_bytes = models.BigIntegerField(default=0)
    is_public = models.BooleanField(default=False)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='uploaded_files',
    )
    related_model = models.CharField(max_length=128, blank=True)
    related_id = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['tenant_code', 'related_model']),
            models.Index(fields=['bucket_type', 'created_at']),
        ]

    def __str__(self):
        return self.storage_key
