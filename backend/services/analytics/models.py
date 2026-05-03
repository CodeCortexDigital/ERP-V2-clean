from django.db import models
import uuid

class StudentRisk(models.Model):
    RISK_LEVELS = [
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
        ('critical', 'Critical Risk'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='risk_assessments')
    risk_level = models.CharField(max_length=20, choices=RISK_LEVELS)
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    factors = models.JSONField(default=dict)
    recommendations = models.JSONField(default=list)
    assessed_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.student.full_name} - {self.risk_level}"

class AcademicPrediction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='predictions')
    predicted_grade = models.CharField(max_length=5)
    confidence = models.DecimalField(max_digits=5, decimal_places=2)
    factors = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.student.full_name} - Predicted: {self.predicted_grade}"

class Recommendation(models.Model):
    RECOMMENDATION_TYPES = [
        ('academic', 'Academic Support'),
        ('attendance', 'Attendance Improvement'),
        ('financial', 'Financial Assistance'),
        ('behavioral', 'Behavioral Support'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='recommendations')
    recommendation_type = models.CharField(max_length=20, choices=RECOMMENDATION_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    action_items = models.JSONField(default=list)
    is_implemented = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.student.full_name} - {self.title}"
