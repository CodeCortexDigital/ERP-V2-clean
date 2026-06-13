"""
Attendance pattern detection and analytics models.
Stores AI-detected patterns and analysis results for dashboard visualization.
"""

from django.db import models
from django.conf import settings
import uuid


class AttendanceAnalytics(models.Model):
    """Daily attendance analytics snapshot for dashboard caching."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'education_students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_analytics',
        db_index=True,
    )
    date = models.DateField(db_index=True)
    
    # Period statistics (last 30 days from this date)
    total_records = models.IntegerField(default=0)
    present_count = models.IntegerField(default=0)
    absent_count = models.IntegerField(default=0)
    late_count = models.IntegerField(default=0)
    excused_count = models.IntegerField(default=0)
    holiday_count = models.IntegerField(default=0)
    
    # Calculated metrics
    attendance_rate = models.FloatField(default=0.0)  # percentage
    trend_direction = models.CharField(
        max_length=10,
        choices=[('up', 'Improving'), ('down', 'Declining'), ('stable', 'Stable')],
        default='stable'
    )
    
    # Risk assessment
    risk_level = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')],
        default='low'
    )
    risk_score = models.FloatField(default=0.0)  # 0-100
    
    # Pattern flags
    has_consecutive_absences = models.BooleanField(default=False)
    consecutive_absence_count = models.IntegerField(default=0)
    has_weekday_pattern = models.BooleanField(default=False)  # e.g., always absent on Mondays
    declining_trend = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'date']),
            models.Index(fields=['date', 'risk_level']),
            models.Index(fields=['risk_score', 'date']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['student', 'date'], name='uniq_analytics_student_date'),
        ]
        verbose_name_plural = 'Attendance Analytics'
    
    def __str__(self):
        return f"{self.student.full_name} - {self.date} - Risk: {self.risk_level}"


class AttendancePattern(models.Model):
    """
    Detected attendance patterns (machine learning results).
    One record per detected pattern per student.
    """
    
    PATTERN_TYPES = [
        ('declining', 'Declining Attendance'),
        ('weekday', 'Weekday Pattern'),
        ('consecutive', 'Consecutive Absences'),
        ('spike', 'Absence Spike'),
        ('improving', 'Improving Trend'),
        ('inconsistent', 'Inconsistent Attendance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'education_students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_patterns',
        db_index=True,
    )
    pattern_type = models.CharField(max_length=20, choices=PATTERN_TYPES)
    
    # Pattern details
    description = models.TextField()  # human-readable explanation
    severity = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')],
        default='medium'
    )
    
    # Time range this pattern was detected
    start_date = models.DateField()
    end_date = models.DateField()
    detection_date = models.DateField(auto_now_add=True)
    
    # Metrics specific to this pattern
    confidence_score = models.FloatField(default=0.0)  # 0-1, how confident the detection is
    affected_days = models.IntegerField(default=0)  # number of school days affected
    
    # Pattern specifics stored as JSON for flexibility
    metadata = models.JSONField(default=dict, blank=True)  # e.g., {'weekday': 'Monday', 'absences': 4}
    
    # Track if this pattern has been acknowledged/actioned
    is_active = models.BooleanField(default=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_patterns'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'is_active']),
            models.Index(fields=['pattern_type', 'severity']),
            models.Index(fields=['detection_date']),
        ]
        verbose_name_plural = 'Attendance Patterns'
    
    def __str__(self):
        return f"{self.student.full_name} - {self.get_pattern_type_display()} ({self.severity})"


class AttendanceAlert(models.Model):
    """
    Generated alerts based on pattern detection.
    Used for notifications and dashboard alerts.
    """
    
    ALERT_TYPES = [
        ('low_attendance', 'Low Attendance'),
        ('consecutive_absent', 'Consecutive Absences'),
        ('weekday_pattern', 'Weekday Pattern Detected'),
        ('declining', 'Declining Attendance Trend'),
        ('improvement', 'Attendance Improvement'),
        ('at_risk', 'Student At Risk'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'education_students.Student',
        on_delete=models.CASCADE,
        related_name='attendance_alerts',
        db_index=True,
    )
    pattern = models.ForeignKey(
        AttendancePattern,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alerts'
    )
    
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Priority
    priority = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
        default='medium'
    )
    
    # Action tracking
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    # Recipients and notification tracking
    created_at = models.DateTimeField(auto_now_add=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'is_resolved']),
            models.Index(fields=['alert_type', 'priority']),
            models.Index(fields=['created_at']),
        ]
        verbose_name_plural = 'Attendance Alerts'
    
    def __str__(self):
        return f"{self.student.full_name} - {self.get_alert_type_display()} - {self.priority}"
