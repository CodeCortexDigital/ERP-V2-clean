from django.db import models
import uuid


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


class Skill(models.Model):
    """Skills that can be rated"""
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


class Observation(models.Model):
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
