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


# ---------------------------------------------------------------------------
# Two-way messaging, announcements and SMS (international upgrade, Phase 7)
# ---------------------------------------------------------------------------
from django.conf import settings as _settings  # noqa: E402

from services.core.tenants.mixins import TenantScopedModel  # noqa: E402


class Conversation(TenantScopedModel):
    """A private thread between staff and families (optionally about one student)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=200)
    student = models.ForeignKey('education_students.Student', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='conversations')
    created_by = models.ForeignKey(_settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-last_message_at']


class ConversationParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(_settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversation_links')
    role = models.CharField(max_length=40, blank=True, default='')
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['conversation', 'user'], name='uniq_conversation_user')]


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(_settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    body = models.TextField()
    attachment = models.FileField(upload_to='messages/%Y/%m/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']


class Announcement(TenantScopedModel):
    AUDIENCES = [('everyone', 'Everyone'), ('staff', 'All staff'), ('parents', 'All parents'),
                 ('students', 'All students'), ('class', 'One or more classes'), ('grade', 'Grade levels')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=12, choices=AUDIENCES, default='everyone')
    class_ids = models.JSONField(default=list, blank=True)
    grade_levels = models.JSONField(default=list, blank=True)
    include_parents = models.BooleanField(default=True)
    include_students = models.BooleanField(default=False)
    send_email = models.BooleanField(default=True)
    send_sms = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    recipient_count = models.PositiveIntegerField(default=0)
    email_count = models.PositiveIntegerField(default=0)
    sms_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(_settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']


class AnnouncementReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='receipts')
    user = models.ForeignKey(_settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['announcement', 'user'], name='uniq_announcement_user')]


class SmsConfig(TenantScopedModel):
    """Per-school SMS sending (Twilio). The auth token is never sent back to the browser."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=20, default='twilio')
    account_sid = models.CharField(max_length=100, blank=True, default='')
    auth_token = models.CharField(max_length=200, blank=True, default='')
    from_number = models.CharField(max_length=30, blank=True, default='')
    default_country_code = models.CharField(max_length=5, blank=True, default='',
                                            help_text='Added to local numbers that start with 0, e.g. 92 or 44')
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
