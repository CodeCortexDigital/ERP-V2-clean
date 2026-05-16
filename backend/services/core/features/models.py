from __future__ import annotations

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from services.core.tenants.models import School

DEFAULT_FEATURES = [
    ('whatsapp_integration', 'WhatsApp messaging and automation'),
    ('online_payments', 'Online payment gateway integration'),
    ('ai_insights', 'AI-powered student and risk insights'),
    ('realtime_notifications', 'WebSocket / realtime notification delivery'),
    ('advanced_analytics', 'Executive dashboards and advanced reporting'),
]


class FeatureFlag(models.Model):
    """Global or per-tenant feature toggle with optional percentage rollout."""

    name = models.CharField(max_length=64, db_index=True)
    is_enabled = models.BooleanField(default=False)
    tenant = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='feature_flags',
        help_text='Null = global default; set for per-tenant override.',
    )
    rollout_percentage = models.PositiveSmallIntegerField(
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='0–100: share of tenants/users in rollout when enabled.',
    )
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_feature_flag'
        ordering = ['name', 'tenant_id']
        constraints = [
            models.UniqueConstraint(
                fields=['name'],
                condition=models.Q(tenant__isnull=True),
                name='core_feature_flag_unique_global_name',
            ),
            models.UniqueConstraint(
                fields=['name', 'tenant'],
                condition=models.Q(tenant__isnull=False),
                name='core_feature_flag_unique_tenant_name',
            ),
        ]
        indexes = [
            models.Index(fields=['name', 'tenant']),
            models.Index(fields=['is_enabled']),
        ]

    def __str__(self):
        scope = self.tenant.tenant_code if self.tenant_id else 'global'
        state = 'on' if self.is_enabled else 'off'
        return f'{self.name} ({scope}) — {state} @ {self.rollout_percentage}%'
