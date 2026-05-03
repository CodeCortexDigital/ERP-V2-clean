from django.db import models
import uuid

class AuditLog(models.Model):
    ACTION_TYPES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('payment', 'Payment'),
        ('attendance', 'Attendance'),
        ('result', 'Result'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.CharField(max_length=100)
    user_email = models.CharField(max_length=255)
    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    module = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    object_name = models.CharField(max_length=255, blank=True)
    old_value = models.JSONField(default=dict, blank=True)
    new_value = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user_email} - {self.action} - {self.module} - {self.created_at}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'action']),
            models.Index(fields=['module', 'created_at']),
        ]

def log_action(user, action, module, object_id='', object_name='', old_value=None, new_value=None, request=None):
    """Helper function to log actions"""
    try:
        ip = None
        user_agent = ''
        if request:
            ip = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        AuditLog.objects.create(
            user_id=str(user.id) if user else 'system',
            user_email=user.email if user else 'system@erp.com',
            action=action,
            module=module,
            object_id=str(object_id),
            object_name=object_name[:255],
            old_value=old_value or {},
            new_value=new_value or {},
            ip_address=ip,
            user_agent=user_agent
        )
    except Exception as e:
        print(f"Audit log error: {e}")
