from django.db import models
import uuid

class Message(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    sender = models.CharField(max_length=100)
    recipient = models.CharField(max_length=100)
    recipient_phone = models.CharField(max_length=20, blank=True)
    recipient_email = models.EmailField(blank=True)
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    channel = models.CharField(max_length=20)
    template_name = models.CharField(max_length=100, blank=True)
    delivery_status = models.CharField(max_length=50, default='pending')
    retry_count = models.PositiveSmallIntegerField(default=0)
    external_id = models.CharField(max_length=255, blank=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    # Free-text school code used by the WhatsApp integration (predates `tenant`).
    legacy_tenant_code = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender} -> {self.recipient}"

class Notification(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    recipient_type = models.CharField(max_length=20, default='all')
    recipient_id = models.CharField(max_length=100, blank=True)
    channel = models.CharField(max_length=20, default='all')
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    # Free-text school code used by the WhatsApp integration (predates `tenant`).
    legacy_tenant_code = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class MessageTemplate(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=50)
    subject = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    is_active = models.BooleanField(default=True)
    # Free-text school code used by the WhatsApp integration (predates `tenant`).
    legacy_tenant_code = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def render(self, context=None):
        rendered = self.body
        context = context or {}
        for key, value in context.items():
            placeholder = f'{{{{ {key} }}}}'
            rendered = rendered.replace(placeholder, str(value))
            rendered = rendered.replace(f'{{{key}}}', str(value))
        return rendered

    def __str__(self):
        return self.name

class AutoTrigger(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    trigger_event = models.CharField(max_length=50)
    template = models.ForeignKey(MessageTemplate, on_delete=models.CASCADE, null=True, blank=True)
    channel = models.CharField(max_length=20, default='whatsapp')
    is_active = models.BooleanField(default=True)
    days_before = models.IntegerField(default=0)
    # Free-text school code used by the WhatsApp integration (predates `tenant`).
    legacy_tenant_code = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class WhatsAppConfig(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number_id = models.CharField(max_length=100, blank=True)
    access_token = models.TextField(blank=True)
    business_account_id = models.CharField(max_length=100, blank=True)
    webhook_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    # Free-text school code used by the WhatsApp integration (predates `tenant`).
    legacy_tenant_code = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"WhatsApp Configuration ({self.legacy_tenant_code or 'default'})"
