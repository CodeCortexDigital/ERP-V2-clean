from django.db import models
from django.conf import settings
import uuid

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('attendance', 'Attendance'),
        ('finance', 'Finance'),
        ('exam', 'Exam'),
        ('admission', 'Admission'),
        ('announcement', 'Announcement'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email}"
