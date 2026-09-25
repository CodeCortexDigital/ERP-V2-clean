from django.conf import settings
from django.db import models
import uuid

from services.core.db.softdelete import SoftDeleteModel
from services.core.tenants.mixins import SchoolAliasMixin


class AttendanceRecord(SchoolAliasMixin, SoftDeleteModel):
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
        ('early_dismissal', 'Early dismissal'),
    ])
    # 'excused' (absent, excused) is kept for older records; new records use is_excused.
    is_excused = models.BooleanField(default=False)
    reason = models.CharField(max_length=20, blank=True, default='', choices=[
        ('illness', 'Illness'), ('medical', 'Medical appointment'), ('family', 'Family matter'),
        ('religious', 'Religious observance'), ('school_activity', 'School activity'),
        ('transport', 'Transport'), ('unknown', 'No reason given'), ('other', 'Other'),
    ])
    minutes_late = models.PositiveSmallIntegerField(null=True, blank=True)
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


class StudentFaceEncoding(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    student = models.OneToOneField(
        'education_students.Student',
        on_delete=models.CASCADE,
        related_name='face_encoding',
    )
    encoding = models.JSONField()  # List of 128 or 512 floats representing face embedding
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Face Encoding for {self.student.full_name}"


# Import analytics models
from .analytics_models import AttendanceAnalytics, AttendancePattern, AttendanceAlert

__all__ = [
    'AttendanceRecord',
    'AttendanceAnalytics',
    'AttendancePattern',
    'AttendanceAlert',
    'StudentFaceEncoding',
]



REASONS = AttendanceRecord._meta.get_field('reason').choices
MARK_STATUSES = [('present', 'Present'), ('absent', 'Absent'), ('late', 'Tardy'), ('excused', 'Excused')]


class PeriodAttendance(models.Model):
    """Attendance for one lesson (period) of the day, marked by the subject teacher."""
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='period_attendance')
    date = models.DateField(db_index=True)
    period_number = models.PositiveSmallIntegerField()
    period = models.ForeignKey('education_academics.Period', on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='+')
    subject_name = models.CharField(max_length=120, blank=True, default='')
    status = models.CharField(max_length=20, choices=MARK_STATUSES, default='present')
    is_excused = models.BooleanField(default=False)
    minutes_late = models.PositiveSmallIntegerField(null=True, blank=True)
    remarks = models.CharField(max_length=255, blank=True, default='')
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'period_number']
        constraints = [models.UniqueConstraint(fields=['student', 'date', 'period_number'],
                                               name='uniq_period_attendance')]


class AbsenceReport(models.Model):
    """A parent tells the school about an absence (past or planned); the office approves it."""
    STATUSES = [('pending', 'Waiting for review'), ('approved', 'Approved'), ('declined', 'Declined')]

    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='absence_reports')
    start_date = models.DateField()
    end_date = models.DateField()
    kind = models.CharField(max_length=20, default='absent',
                            choices=[('absent', 'Absent all day'), ('late', 'Arriving late'),
                                     ('early_dismissal', 'Leaving early')])
    reason = models.CharField(max_length=20, choices=REASONS, default='illness')
    note = models.TextField(blank=True, default='')
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='+')
    submitted_by_name = models.CharField(max_length=200, blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUSES, default='pending')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='+')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    response = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class AttendanceNotice(models.Model):
    """Alerts sent to families, so each one goes out once."""
    KINDS = [('absent', 'Absence'), ('late', 'Tardy'), ('early_dismissal', 'Early dismissal'),
             ('chronic', 'Frequent absences'), ('report', 'Absence report received')]

    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='attendance_notices')
    date = models.DateField()
    kind = models.CharField(max_length=20, choices=KINDS)
    message = models.TextField(blank=True, default='')
    sent_to = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['student', 'date', 'kind'], name='uniq_attendance_notice')]
