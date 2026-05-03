"""
Account models for user management - Clean version.
"""

import uuid
import secrets
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    """Custom user model with extended fields."""
    
    class AccountStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        SUSPENDED = 'suspended', _('Suspended')
        LOCKED = 'locked', _('Locked')
        PENDING = 'pending', _('Pending Verification')
        DELETED = 'deleted', _('Deleted')
    
    # Remove username field
    username = None
    email = models.EmailField(_('email address'), unique=True)
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/%Y/%m/', blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    
    # Verification Status
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    phone_verified = models.BooleanField(default=False)
    phone_verification_code = models.CharField(max_length=6, blank=True)
    phone_verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Account Management
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.PENDING
    )
    account_locked_until = models.DateTimeField(null=True, blank=True)
    account_lock_reason = models.TextField(blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_agent = models.TextField(blank=True)
    
    # Account Linking (Social)
    google_id = models.CharField(max_length=255, blank=True, null=True)
    github_id = models.CharField(max_length=255, blank=True, null=True)
    microsoft_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Account Expiration
    account_expires_at = models.DateTimeField(null=True, blank=True)
    
    # User Preferences
    preferred_language = models.CharField(max_length=10, default='en')
    preferred_timezone = models.CharField(max_length=50, default='UTC')
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    marketing_emails = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=100, blank=True)
    
    # Communication Preferences
    communication_channels = models.JSONField(default=dict)
    
    # GDPR and Consent Tracking
    consent_tracking = models.JSONField(default=dict)
    data_portability_requests = models.JSONField(default=list)
    gdpr_deletion_requested = models.BooleanField(default=False)
    gdpr_deletion_requested_at = models.DateTimeField(null=True, blank=True)
    gdpr_data_exported_at = models.DateTimeField(null=True, blank=True)
    
    # Delegated Management
    delegated_users = models.ManyToManyField('self', symmetrical=False, blank=True)
    delegated_permissions = models.JSONField(default=dict)
    
    # User Tags and Segments
    tags = models.JSONField(default=list)
    segments = models.JSONField(default=list)
    
    # Notes and Metadata
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()
    
    class Meta:
        db_table = 'accounts_user'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['account_status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        if not self.full_name:
            self.full_name = self.email.split('@')[0]
        super().save(*args, **kwargs)
    
    def is_account_active(self):
        if self.account_status != self.AccountStatus.ACTIVE:
            return False
        if self.account_locked_until and self.account_locked_until > timezone.now():
            return False
        if self.account_expires_at and self.account_expires_at < timezone.now():
            return False
        return True
    
    def lock_account(self, reason, duration_minutes=30):
        self.account_status = self.AccountStatus.LOCKED
        self.account_locked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.account_lock_reason = reason
        self.save()
    
    def unlock_account(self):
        self.account_status = self.AccountStatus.ACTIVE
        self.account_locked_until = None
        self.account_lock_reason = ''
        self.failed_login_attempts = 0
        self.save()
    
    def increment_failed_attempts(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.lock_account('Too many failed login attempts', 30)
        self.save()
    
    def reset_failed_attempts(self):
        self.failed_login_attempts = 0
        self.save()
    
    def generate_email_verification_token(self):
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_sent_at = timezone.now()
        self.save()
        return self.email_verification_token
    
    def verify_email(self):
        self.email_verified = True
        self.email_verification_token = ''
        if self.account_status == self.AccountStatus.PENDING:
            self.account_status = self.AccountStatus.ACTIVE
        self.save()
    
    def generate_phone_verification_code(self):
        self.phone_verification_code = str(secrets.randbelow(1000000)).zfill(6)
        self.phone_verification_sent_at = timezone.now()
        self.save()
        return self.phone_verification_code
    
    def verify_phone(self, code):
        if self.phone_verification_code == code:
            self.phone_verified = True
            self.phone_verification_code = ''
            self.save()
            return True
        return False

class UserActivity(models.Model):
    """Track user activities for audit and history."""
    
    class ActionType(models.TextChoices):
        LOGIN = 'login', _('Login')
        LOGOUT = 'logout', _('Logout')
        REGISTER = 'register', _('Register')
        UPDATE_PROFILE = 'update_profile', _('Update Profile')
        CHANGE_PASSWORD = 'change_password', _('Change Password')
        VERIFY_EMAIL = 'verify_email', _('Verify Email')
        VERIFY_PHONE = 'verify_phone', _('Verify Phone')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=50, choices=ActionType.choices)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'accounts_user_activity'
        ordering = ['-created_at']

class UserConsent(models.Model):
    """Track user consent for GDPR compliance."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consents')
    consent_type = models.CharField(max_length=100)
    version = models.CharField(max_length=20)
    given = models.BooleanField(default=False)
    given_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'accounts_user_consent'
        unique_together = ['user', 'consent_type']
    
    def __str__(self):
        return f"{self.user.email} - {self.consent_type}"

class AccountDeletionRequest(models.Model):
    """Track GDPR right to be forgotten requests."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='deletion_requests')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'accounts_deletion_requests'

class DataExport(models.Model):
    """Track GDPR data export requests."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='data_exports')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    export_url = models.URLField(blank=True)
    format = models.CharField(max_length=20, default='json')
    
    class Meta:
        db_table = 'accounts_data_exports'

class UserNote(models.Model):
    """Internal notes about users."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_notes')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='authored_notes')
    note = models.TextField()
    is_private = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_user_notes'
        ordering = ['-created_at']










