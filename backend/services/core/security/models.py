"""Privacy & security records (Phase 21)."""
import uuid

from django.conf import settings
from django.db import models


class SignInEvent(models.Model):
    """One sign-in attempt. Written before anyone is signed in, so the school is set explicitly (not tenant-scoped)."""

    OUTCOMES = [
        ('success', 'Signed in'),
        ('failed', 'Wrong password'),
        ('locked', 'Blocked: too many wrong passwords'),
        ('disabled', 'Blocked: account switched off'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.SET_NULL, related_name='sign_in_events')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='sign_in_events')
    email = models.CharField(max_length=255, blank=True)
    outcome = models.CharField(max_length=12, choices=OUTCOMES)
    method = models.CharField(max_length=20, default='password')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['school', 'created_at']), models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f'{self.email} {self.outcome} {self.created_at:%Y-%m-%d %H:%M}'


class EmailLog(models.Model):
    """Every system email: what, to whom, and whether it went (P3)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.SET_NULL, related_name='email_logs')
    kind = models.CharField(max_length=40)
    to = models.CharField(max_length=500)
    subject = models.CharField(max_length=200)
    status = models.CharField(max_length=10)  # sent / failed
    error = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']


class TwoFactor(models.Model):
    """Two-step sign-in with an authenticator app (P8). The secret is stored encrypted; recovery codes only as hashes."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='two_factor')
    secret = models.TextField()
    confirmed_at = models.DateTimeField(null=True, blank=True)  # set once the first code was entered: then it is on
    last_step = models.BigIntegerField(default=0)  # the last 30-second step used, so a code can't be used twice
    recovery_hashes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user_id} two-step {"on" if self.confirmed_at else "being set up"}'
