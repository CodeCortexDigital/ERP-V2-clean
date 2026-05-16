from django.db import models
from django.conf import settings
import uuid

from services.core.db.softdelete import SoftDeleteModel


class Notification(SoftDeleteModel):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        db_index=True,
    )
    NOTIFICATION_TYPES = [
        ('attendance', 'Attendance'),
        ('finance', 'Finance'),
        ('exam', 'Exam'),
        ('admission', 'Admission'),
        ('announcement', 'Announcement'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['recipient', 'is_read', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email}"
