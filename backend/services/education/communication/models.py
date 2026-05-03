from django.db import models
import uuid

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    sender = models.CharField(max_length=100)
    recipient = models.CharField(max_length=100)
    recipient_phone = models.CharField(max_length=20, blank=True)
    recipient_email = models.EmailField(blank=True)
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    channel = models.CharField(max_length=20)
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} -> {self.recipient}"

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    recipient_type = models.CharField(max_length=20, default='all')
    recipient_id = models.CharField(max_length=100, blank=True)
    channel = models.CharField(max_length=20, default='all')
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class MessageTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=50)
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    is_active = models.BooleanField(default=True)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class AutoTrigger(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    trigger_event = models.CharField(max_length=50)
    template = models.ForeignKey(MessageTemplate, on_delete=models.CASCADE, null=True, blank=True)
    channel = models.CharField(max_length=20, default='whatsapp')
    is_active = models.BooleanField(default=True)
    days_before = models.IntegerField(default=0)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class WhatsAppConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    api_key = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "WhatsApp Configuration"
