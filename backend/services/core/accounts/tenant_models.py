from django.db import models
import uuid

class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    subdomain = models.CharField(max_length=100, unique=True, db_index=True)
    domain = models.CharField(max_length=200, blank=True)
    logo = models.ImageField(upload_to='tenants/logos/', null=True, blank=True)
    timezone = models.CharField(max_length=50, default='Asia/Karachi')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    settings = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        indexes = [
            models.Index(fields=['subdomain']),
        ]
