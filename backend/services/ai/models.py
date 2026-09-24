import uuid

from django.conf import settings
from django.db import models


class AIConversation(models.Model):
    """One chat thread between a user and the AI assistant."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.CASCADE,
                               related_name='ai_conversations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_conversations')
    role = models.CharField(max_length=20, blank=True)
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['user', '-updated_at'])]

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class AIMessage(models.Model):
    """A visible chat turn. Tool calls made while producing an assistant turn are
    kept in `tool_calls` for auditing; they are not replayed to the model."""
    ROLE_CHOICES = [('user', 'User'), ('assistant', 'Assistant')]
    FEEDBACK_CHOICES = [(1, 'Helpful'), (-1, 'Not helpful')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    tool_calls = models.JSONField(default=list, blank=True)
    provider = models.CharField(max_length=20, blank=True)
    model = models.CharField(max_length=100, blank=True)
    offline = models.BooleanField(default=False)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    cached_input_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    feedback = models.SmallIntegerField(choices=FEEDBACK_CHOICES, null=True, blank=True)
    feedback_note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class AIUsage(models.Model):
    """Daily token usage per user and feature — the basis for limits and cost reports."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.CASCADE,
                               related_name='ai_usage')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                             related_name='ai_usage')
    date = models.DateField(db_index=True)
    feature = models.CharField(max_length=40)
    provider = models.CharField(max_length=20, blank=True)
    model = models.CharField(max_length=100, blank=True)
    requests = models.PositiveIntegerField(default=0)
    input_tokens = models.PositiveBigIntegerField(default=0)
    output_tokens = models.PositiveBigIntegerField(default=0)
    cached_input_tokens = models.PositiveBigIntegerField(default=0)

    class Meta:
        # Not unique: tenant is nullable (NULLs never collide), so reports sum rows.
        indexes = [models.Index(fields=['tenant', 'date']), models.Index(fields=['user', 'date'])]
