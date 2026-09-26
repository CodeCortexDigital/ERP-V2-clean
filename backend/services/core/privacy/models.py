"""Privacy (P14): legal documents and acceptance, consent, privacy requests, sub-processors and incidents.

Explicit school fields (not the tenant mixin): platform documents and incidents belong to no single school.
"""
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class LegalDocument(models.Model):
    KINDS = [
        ('privacy', 'Privacy notice'),          # the platform's own notice (school=None)
        ('terms', 'Terms of use'),              # the platform's terms (school=None)
        ('school_privacy', 'School privacy notice'),  # a school's notice to its families and staff
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', null=True, blank=True, on_delete=models.CASCADE, related_name='legal_documents')
    kind = models.CharField(max_length=20, choices=KINDS)
    version = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    body = models.TextField()
    summary_of_changes = models.CharField(max_length=300, blank=True)
    published_at = models.DateTimeField(default=timezone.now)
    published_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        ordering = ['kind', '-version']
        unique_together = [('school', 'kind', 'version')]


class DocumentAcceptance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(LegalDocument, on_delete=models.CASCADE, related_name='acceptances')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='document_acceptances')
    accepted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        unique_together = [('document', 'user')]


class ConsentType(models.Model):
    SUBJECTS = [('student', 'For each child'), ('user', 'For the person themselves')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='consent_types')
    key = models.SlugField(max_length=40)
    label = models.CharField(max_length=120)
    description = models.TextField()
    subject = models.CharField(max_length=8, choices=SUBJECTS, default='student')
    is_active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)  # bumped when the wording changes; answers to older wording are flagged
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('school', 'key')]
        ordering = ['created_at']


class ConsentRecord(models.Model):
    """One answer. The latest record for (type, student or person) is the current answer; older ones are the history."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='consent_records')
    consent_type = models.ForeignKey(ConsentType, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey('education_students.Student', null=True, blank=True, on_delete=models.CASCADE, related_name='consent_records')
    subject_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='consents_about_me')
    granted = models.BooleanField()
    type_version = models.PositiveIntegerField(default=1)
    given_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='consents_given')
    given_by_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class PrivacyRequest(models.Model):
    KINDS = [
        ('access', 'See a copy of the data'),
        ('correction', 'Correct something'),
        ('restriction', 'Limit how the data is used'),
        ('erasure', 'Erase data'),
        ('objection', 'Object to a use of the data'),
    ]
    STATUSES = [('open', 'Received'), ('in_progress', 'Being handled'), ('done', 'Completed'), ('refused', 'Refused')]
    RESPONSE_DAYS = 30

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='privacy_requests')
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='privacy_requests')
    requester_email = models.CharField(max_length=255, blank=True)
    student = models.ForeignKey('education_students.Student', null=True, blank=True, on_delete=models.SET_NULL, related_name='privacy_requests')
    kind = models.CharField(max_length=12, choices=KINDS)
    details = models.TextField()
    status = models.CharField(max_length=12, choices=STATUSES, default='open')
    due_date = models.DateField()
    response = models.TextField(blank=True)
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['status', 'due_date']

    def save(self, *args, **kwargs):
        if not self.due_date:
            self.due_date = timezone.localdate() + timedelta(days=self.RESPONSE_DAYS)
        super().save(*args, **kwargs)


class SubProcessor(models.Model):
    """Companies that process school data on the platform's behalf (published on /legal/subprocessors)."""
    name = models.CharField(max_length=120)
    purpose = models.CharField(max_length=255)
    data = models.CharField(max_length=255, help_text='What data they handle')
    location = models.CharField(max_length=120, blank=True)
    optional = models.BooleanField(default=False, help_text='Only used when a school turns the feature on')
    website = models.URLField(blank=True)
    sort = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort', 'name']


class Incident(models.Model):
    """A security or privacy incident: the register, its deadlines and who was told (P14)."""
    SEVERITIES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')]
    STATUSES = [('reported', 'Reported'), ('investigating', 'Investigating'), ('contained', 'Contained'),
                ('notified', 'Notified'), ('closed', 'Closed'), ('not_a_breach', 'Not a breach')]
    REGULATOR_HOURS = 72

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITIES, default='medium')
    status = models.CharField(max_length=14, choices=STATUSES, default='reported')
    discovered_at = models.DateTimeField(default=timezone.now)
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+')
    reported_by_email = models.CharField(max_length=255, blank=True)
    schools = models.ManyToManyField('core_tenants.School', blank=True, related_name='incidents')
    data_affected = models.CharField(max_length=300, blank=True)
    people_affected = models.PositiveIntegerField(null=True, blank=True)
    personal_data = models.BooleanField(default=True, help_text='Personal data involved (a breach may need reporting)')
    regulator_notified_at = models.DateTimeField(null=True, blank=True)
    schools_notified_at = models.DateTimeField(null=True, blank=True)
    people_notified_at = models.DateTimeField(null=True, blank=True)
    checklist = models.JSONField(default=dict, blank=True)  # playbook step -> done at
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-discovered_at']

    @property
    def regulator_deadline(self):
        return self.discovered_at + timedelta(hours=self.REGULATOR_HOURS)


class IncidentUpdate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='updates')
    note = models.TextField()
    by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='+')
    by_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
