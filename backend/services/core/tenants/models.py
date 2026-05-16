"""
School (tenant) model and per-tenant user membership.
"""

from __future__ import annotations

import re
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction

TENANT_CODE_RE = re.compile(r'^[A-Z]{3}$')

ROLE_CHOICES = [
    ('admin', 'Admin'),
    ('staff', 'Staff'),
    ('teacher', 'Teacher'),
    ('parent', 'Parent'),
    ('student', 'Student'),
    ('accountant', 'Accountant'),
]


class School(models.Model):
    """
    SaaS tenant — one school per row.
    `tenant_code`: 3-letter code (SPR). `school_id`: human id (SPR-001).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_code = models.CharField(
        max_length=3,
        unique=True,
        db_index=True,
        help_text='Three-letter code, e.g. SPR, GRD, RIV',
    )
    school_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
        help_text='Auto-generated, e.g. SPR-001',
    )
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, unique=True, db_index=True)
    email_domain = models.CharField(
        max_length=255,
        blank=True,
        help_text='Optional email domain for auto-tenant routing',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    settings_json = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'tenants_school'
        ordering = ['tenant_code']
        indexes = [
            models.Index(fields=['subdomain']),
            models.Index(fields=['is_active', 'tenant_code']),
        ]

    def __str__(self):
        return f'{self.school_id} — {self.name}'

    def clean(self):
        code = (self.tenant_code or '').upper()
        if not TENANT_CODE_RE.match(code):
            raise ValidationError({'tenant_code': 'Must be exactly 3 uppercase letters (A-Z).'})
        self.tenant_code = code

    def save(self, *args, **kwargs):
        self.clean()
        if not self.school_id:
            self.school_id = self._generate_school_id()
        super().save(*args, **kwargs)

    def _generate_school_id(self) -> str:
        with transaction.atomic():
            last = (
                School.objects.select_for_update()
                .filter(tenant_code=self.tenant_code)
                .order_by('-school_id')
                .first()
            )
            if last and last.school_id and '-' in last.school_id:
                try:
                    seq = int(last.school_id.split('-')[-1]) + 1
                except ValueError:
                    seq = 1
            else:
                count = School.objects.filter(tenant_code=self.tenant_code).count()
                seq = count + 1
            return f'{self.tenant_code}-{seq:03d}'


class TenantMembership(models.Model):
    """User membership in a school with role per tenant."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tenant_memberships',
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default='staff')
    rbac_role = models.ForeignKey(
        'rbac_models.Role',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tenant_memberships',
    )
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tenants_membership'
        unique_together = [['user', 'school']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['school', 'role']),
        ]

    def __str__(self):
        return f'{self.user_id} @ {self.school.tenant_code} ({self.role})'
