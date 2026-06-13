from django.conf import settings
from django.db import models
import uuid

from services.core.db.softdelete import SoftDeleteModel


class AttendanceRecord(SoftDeleteModel):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        null=True,
        blank=True,
        db_index=True,
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'education_students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        db_index=True,
    )
    course_id = models.CharField(max_length=50, null=True, blank=True)
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=[
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
        ('holiday', 'Holiday'),
    ])
    remarks = models.TextField(blank=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_marked',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['student', 'date']),
            models.Index(fields=['tenant', 'date']),
            models.Index(fields=['created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'date'],
                name='uniq_attendance_student_date',
            ),
        ]

    def __str__(self):
        return f"{self.student.full_name} - {self.date} - {self.status}"


# Import analytics models
from .analytics_models import AttendanceAnalytics, AttendancePattern, AttendanceAlert

__all__ = [
    'AttendanceRecord',
    'AttendanceAnalytics',
    'AttendancePattern',
    'AttendanceAlert',
]
