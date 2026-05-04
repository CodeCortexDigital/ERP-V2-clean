from django.db import models
import uuid

class Student(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=50, unique=True, blank=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    father_name = models.CharField(max_length=255, blank=True)
    mother_name = models.CharField(max_length=255, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    guardian_email = models.EmailField(blank=True)
    enrollment_date = models.DateField(null=True, blank=True)
    program = models.CharField(max_length=100, blank=True)
    current_semester = models.IntegerField(default=1)
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    current_class = models.ForeignKey('education_academics.SchoolClass', on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    current_section = models.ForeignKey('education_academics.Section', on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    current_academic_year = models.ForeignKey('education_academics.AcademicYear', on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    is_active = models.BooleanField(default=True)
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.student_id} - {self.full_name}"
