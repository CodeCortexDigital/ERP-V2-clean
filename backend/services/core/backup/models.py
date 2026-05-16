"""
Backup tracking models for disaster recovery logging.
"""
import uuid
from django.db import models
from django.contrib.postgres.fields import JSONField
from django.utils import timezone


class BackupLog(models.Model):
    """Track all backup operations for audit and recovery."""
    
    BACKUP_TYPE_CHOICES = [
        ('full', 'Full Backup'),
        ('incremental', 'Incremental Backup'),
        ('differential', 'Differential Backup'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('verified', 'Verified'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Backup metadata
    backup_type = models.CharField(
        max_length=20,
        choices=BACKUP_TYPE_CHOICES,
        default='full'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Location and size
    backup_path = models.CharField(
        max_length=500,
        help_text="Path to backup file or directory"
    )
    size_bytes = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Size of backup in bytes"
    )
    
    # Components backed up
    database_backed_up = models.BooleanField(default=True)
    media_backed_up = models.BooleanField(default=True)
    config_backed_up = models.BooleanField(default=False)
    redis_backed_up = models.BooleanField(default=False)
    
    # Verification
    checksum = models.CharField(
        max_length=256,
        null=True,
        blank=True,
        help_text="SHA256 checksum of backup"
    )
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Retention
    retention_days = models.IntegerField(
        default=30,
        help_text="Days to retain this backup"
    )
    expires_at = models.DateTimeField()
    cleanup_completed = models.BooleanField(default=False)
    
    # Metadata
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(null=True, blank=True)
    error_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Detailed error information"
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional backup metadata"
    )
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['status', '-started_at']),
            models.Index(fields=['backup_type', '-started_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.backup_type.upper()} backup ({self.status}) - {self.started_at.strftime('%Y-%m-%d %H:%M:%S')}"
    
    def mark_success(self, size_bytes=None, duration_seconds=None):
        """Mark backup as successfully completed."""
        self.status = 'success'
        self.completed_at = timezone.now()
        if size_bytes:
            self.size_bytes = size_bytes
        if duration_seconds:
            self.duration_seconds = duration_seconds
        self.save(update_fields=['status', 'completed_at', 'size_bytes', 'duration_seconds'])
    
    def mark_failed(self, error_message, error_details=None):
        """Mark backup as failed."""
        self.status = 'failed'
        self.error_message = error_message
        if error_details:
            self.error_details = error_details
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'error_details', 'completed_at'])
    
    def mark_verified(self, checksum=None):
        """Mark backup as verified."""
        self.status = 'verified'
        self.verified = True
        self.verified_at = timezone.now()
        if checksum:
            self.checksum = checksum
        self.save(update_fields=['status', 'verified', 'verified_at', 'checksum'])
    
    def get_size_mb(self):
        """Get backup size in MB."""
        if self.size_bytes:
            return round(self.size_bytes / (1024 * 1024), 2)
        return None
    
    def get_size_gb(self):
        """Get backup size in GB."""
        if self.size_bytes:
            return round(self.size_bytes / (1024 * 1024 * 1024), 2)
        return None


class BackupRestoreLog(models.Model):
    """Track all restore operations for audit trail."""
    
    RESTORE_TYPE_CHOICES = [
        ('full', 'Full System Restore'),
        ('database', 'Database Only'),
        ('media', 'Media Files Only'),
        ('config', 'Configuration Only'),
        ('pitr', 'Point-in-Time Recovery'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('validated', 'Validated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Restore metadata
    restore_type = models.CharField(
        max_length=20,
        choices=RESTORE_TYPE_CHOICES
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Source backup
    source_backup = models.ForeignKey(
        BackupLog,
        on_delete=models.SET_NULL,
        null=True,
        related_name='restore_operations'
    )
    recovery_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Target recovery time for PITR"
    )
    
    # Target environment
    target_database = models.CharField(
        max_length=200,
        help_text="Target database name or environment"
    )
    target_environment = models.CharField(
        max_length=50,
        choices=[('dev', 'Development'), ('staging', 'Staging'), ('production', 'Production')],
        help_text="Target environment"
    )
    
    # Restore details
    restored_records = models.IntegerField(
        null=True,
        blank=True,
        help_text="Number of records restored"
    )
    
    # Timeline
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    # Validation
    validated = models.BooleanField(default=False)
    validation_errors = models.JSONField(
        default=list,
        blank=True,
        help_text="List of validation errors if any"
    )
    
    # Approval workflow
    requested_by = models.CharField(max_length=200, help_text="User who requested restore")
    approved_by = models.CharField(max_length=200, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(null=True, blank=True)
    error_details = models.JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['status', '-started_at']),
            models.Index(fields=['target_environment', '-started_at']),
        ]
    
    def __str__(self):
        return f"{self.restore_type.upper()} restore to {self.target_environment} ({self.status})"
    
    def is_approved(self):
        """Check if restore has been approved."""
        return self.approved_by is not None and self.approved_at is not None


class DisasterRecoveryPlan(models.Model):
    """Configuration for disaster recovery procedures."""
    
    TIER_CHOICES = [
        ('tier1', 'Tier 1 - Critical (RTO: 4h, RPO: 1h)'),
        ('tier2', 'Tier 2 - Important (RTO: 8h, RPO: 4h)'),
        ('tier3', 'Tier 3 - Standard (RTO: 24h, RPO: 24h)'),
    ]
    
    # Configuration
    name = models.CharField(max_length=200, unique=True)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)
    is_active = models.BooleanField(default=True)
    
    # RTO and RPO targets
    recovery_time_objective_hours = models.IntegerField(
        help_text="Maximum acceptable downtime in hours"
    )
    recovery_point_objective_hours = models.IntegerField(
        help_text="Maximum acceptable data loss in hours"
    )
    
    # Backup strategy
    backup_frequency_hours = models.IntegerField(
        help_text="Backup frequency in hours"
    )
    full_backup_day = models.CharField(
        max_length=20,
        default='Sunday',
        help_text="Day of week for full backups"
    )
    
    # Retention
    daily_backup_retention_days = models.IntegerField(default=30)
    monthly_backup_retention_days = models.IntegerField(default=365)
    yearly_backup_retention_days = models.IntegerField(default=2555)
    
    # Failover
    enable_automatic_failover = models.BooleanField(default=False)
    failover_timeout_minutes = models.IntegerField(default=30)
    
    # Notification
    notification_emails = models.JSONField(
        default=list,
        blank=True,
        help_text="List of emails to notify on restore"
    )
    slack_webhook_url = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Slack webhook for alerts"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Disaster Recovery Plans"
    
    def __str__(self):
        return f"{self.name} ({self.tier})"
