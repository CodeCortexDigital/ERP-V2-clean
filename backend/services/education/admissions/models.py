from django.db import models
from django.utils import timezone
import uuid

class Applicant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')])
    nationality = models.CharField(max_length=100, default='Pakistani')
    address = models.TextField()
    father_name = models.CharField(max_length=200)
    father_phone = models.CharField(max_length=20)
    father_occupation = models.CharField(max_length=100, blank=True)
    mother_name = models.CharField(max_length=200, blank=True)
    mother_phone = models.CharField(max_length=20, blank=True)
    mother_occupation = models.CharField(max_length=100, blank=True)
    guardian_name = models.CharField(max_length=200, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    guardian_relation = models.CharField(max_length=50, blank=True)
    previous_school = models.CharField(max_length=200, blank=True)
    previous_class = models.CharField(max_length=50, blank=True)
    previous_grade = models.CharField(max_length=10, blank=True)
    applying_for_class = models.CharField(max_length=50)
    applying_for_section = models.CharField(max_length=50, blank=True)
    academic_year = models.CharField(max_length=20, default='2026-2027')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.full_name} - {self.applying_for_class}"
    
    class Meta:
        ordering = ['-created_at']


class Application(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('reviewing', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('waitlisted', 'Waitlisted'),
        ('enrolled', 'Enrolled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_no = models.CharField(max_length=50, unique=True, editable=False)
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='applications')
    program = models.CharField(max_length=100, blank=True)
    semester = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=20, default='2026-2027')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    status_notes = models.TextField(blank=True)
    interview_date = models.DateTimeField(null=True, blank=True)
    interview_notes = models.TextField(blank=True)
    interview_rating = models.IntegerField(null=True, blank=True)
    converted_to_student = models.ForeignKey('education_students.Student', on_delete=models.SET_NULL, null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.application_no:
            year = timezone.now().year
            last_app = Application.objects.filter(application_no__startswith=f'APP-{year}').order_by('-application_no').first()
            if last_app:
                last_num = int(last_app.application_no.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            self.application_no = f'APP-{year}-{str(new_num).zfill(4)}'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.application_no} - {self.applicant.full_name}"
    
    class Meta:
        ordering = ['-submitted_at']
