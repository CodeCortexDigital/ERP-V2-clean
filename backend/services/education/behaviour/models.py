from django.conf import settings
from django.db import models
import uuid

from services.core.tenants.mixins import TenantScopedModel


class BehaviourRating(models.Model):
    """Behaviour ratings for students (Affective Domain)"""
    DOMAIN_CHOICES = [
        ('affective', 'Affective Domain'),
        ('psychomotor', 'Psychomotor Domain'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='behaviour_ratings')
    class_ref = models.ForeignKey('education_academics.SchoolClass', on_delete=models.CASCADE, related_name='behaviour_ratings')
    teacher = models.ForeignKey('education_academics.Teacher', on_delete=models.CASCADE, related_name='behaviour_ratings', null=True, blank=True)
    domain = models.CharField(max_length=20, choices=DOMAIN_CHOICES, default='affective')
    term = models.CharField(max_length=20, default='first')
    month = models.CharField(max_length=20, blank=True, default='')
    academic_year = models.CharField(max_length=20, default='2026-2027')
    
    # Rating fields
    ratings = models.JSONField(default=dict, blank=True)  # {skill_name: rating_value}
    not_observed = models.JSONField(default=dict, blank=True)  # {skill_name: bool}
    rewards = models.JSONField(default=list, blank=True)  # List of reward names
    plans = models.JSONField(default=list, blank=True)  # List of improvement plans
    ai_teacher_rec = models.TextField(blank=True, default='')
    ai_parent_rec = models.TextField(blank=True, default='')
    comments = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.student.full_name} - {self.domain} - {self.term}"
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['student', 'class_ref', 'domain', 'term', 'academic_year', 'month']


class Skill(TenantScopedModel):
    """Skills that can be rated (each school keeps its own list)"""
    DOMAIN_CHOICES = [
        ('affective', 'Affective Domain'),
        ('psychomotor', 'Psychomotor Domain'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    domain = models.CharField(max_length=20, choices=DOMAIN_CHOICES, default='affective')
    description = models.TextField(blank=True, default='')
    max_rating = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.domain})"
    
    class Meta:
        ordering = ['order', 'name']


class Observation(TenantScopedModel):
    """Observations - incidents, meetings, counselling"""
    TYPE_CHOICES = [
        ('incident', 'Incident'),
        ('meeting', 'Meeting'),
        ('counselling', 'Counselling'),
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    observation_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='observations', null=True, blank=True)
    class_ref = models.ForeignKey('education_academics.SchoolClass', on_delete=models.CASCADE, related_name='observations', null=True, blank=True)
    teacher = models.ForeignKey('education_academics.Teacher', on_delete=models.CASCADE, related_name='observations', null=True, blank=True)
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    date = models.DateField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='low')
    
    # Additional fields
    status = models.CharField(max_length=20, default='Pending')  # Pending, Resolved, Scheduled, Completed, Cancelled
    parent_notified = models.BooleanField(default=False)
    action_taken = models.TextField(blank=True, default='')
    follow_up_date = models.DateField(null=True, blank=True)
    participants = models.JSONField(default=list, blank=True)  # List of participant names
    outcome = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.observation_type}: {self.title} - {self.date}"
    
    class Meta:
        ordering = ['-date', '-created_at']


# ---------------------------------------------------------------------------
# Discipline and positive behaviour (Phase 9)
# ---------------------------------------------------------------------------

class BehaviourCategory(TenantScopedModel):
    """What can be logged: a merit (positive points) or an incident type (negative points)."""
    KINDS = [('positive', 'Positive'), ('negative', 'Incident')]
    SEVERITIES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=10, choices=KINDS, default='positive')
    points = models.IntegerField(default=1, help_text='Positive for merits, negative for incidents')
    severity = models.CharField(max_length=10, choices=SEVERITIES, default='low')
    notify_family = models.BooleanField(default=False, help_text='Tell the family by portal notice and email')
    is_active = models.BooleanField(default=True)
    order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['kind', 'order', 'name']
        constraints = [models.UniqueConstraint(fields=['tenant', 'name'], name='uniq_behaviour_category')]

    def __str__(self):
        return self.name


class BehaviourIncident(TenantScopedModel):
    """One logged behaviour for one student: a merit or a discipline incident."""
    STATUSES = [('open', 'Open'), ('in_review', 'In review'), ('resolved', 'Resolved')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='behaviour_incidents')
    category = models.ForeignKey(BehaviourCategory, on_delete=models.PROTECT, related_name='incidents')
    kind = models.CharField(max_length=10, choices=BehaviourCategory.KINDS)
    points = models.IntegerField(default=0)
    severity = models.CharField(max_length=10, choices=BehaviourCategory.SEVERITIES, default='low')
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=120, blank=True, default='')
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUSES, default='open')
    follow_up_date = models.DateField(null=True, blank=True)
    visible_to_family = models.BooleanField(default=True)
    family_notified_at = models.DateTimeField(null=True, blank=True)
    group = models.UUIDField(null=True, blank=True, db_index=True, help_text='Rows logged together for several students')
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [models.Index(fields=['student', 'date'])]


class BehaviourAction(TenantScopedModel):
    """What the school did about an incident: warnings, detentions, suspensions, meetings, follow-ups, rewards."""
    TYPES = [('verbal_warning', 'Verbal warning'), ('written_warning', 'Written warning'), ('detention', 'Detention'),
             ('parent_meeting', 'Parent meeting'), ('counselling', 'Counselling'), ('loss_of_privilege', 'Loss of privilege'),
             ('community_service', 'Community service'), ('in_school_suspension', 'In-school suspension'),
             ('suspension', 'Suspension'), ('reward', 'Reward / certificate'), ('follow_up', 'Follow-up note'), ('other', 'Other')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(BehaviourIncident, on_delete=models.CASCADE, related_name='actions')
    action_type = models.CharField(max_length=24, choices=TYPES)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    completed = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class BehaviourSettings(TenantScopedModel):
    """Per-school rules: reward milestones for positive points."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    milestones = models.JSONField(default=list, blank=True, help_text='[{"points": 50, "name": "Bronze award"}]')
    notify_milestones = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)


class MilestoneAward(TenantScopedModel):
    """A student reached a points milestone (kept so it is awarded once)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='behaviour_awards')
    points = models.IntegerField()
    name = models.CharField(max_length=100)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-awarded_at']
        constraints = [models.UniqueConstraint(fields=['student', 'points'], name='uniq_behaviour_milestone')]
