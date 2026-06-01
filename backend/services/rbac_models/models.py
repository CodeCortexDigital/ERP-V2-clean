import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _

class Role(models.Model):
    """Role model for Role-Based Access Control"""

    class RoleType(models.TextChoices):
        SUPER_ADMIN = 'super_admin', _('Super Admin')
        SCHOOL_ADMIN = 'school_admin', _('School Admin')
        TEACHER = 'teacher', _('Teacher')
        STUDENT = 'student', _('Student')
        PARENT = 'parent', _('Parent')
        STAFF = 'staff', _('Staff')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    role_type = models.CharField(
        max_length=20,
        choices=RoleType.choices,
        default=RoleType.STAFF
    )
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'rbac_role'
        indexes = [
            models.Index(fields=['role_type']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name
