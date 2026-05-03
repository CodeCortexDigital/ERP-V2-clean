from django.db import models
import uuid

class Applicant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=[
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other')
    ], blank=True)
    
    # Address
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='Pakistan')
    
    # Academic Info
    previous_institution = models.CharField(max_length=200, blank=True)
    previous_qualification = models.CharField(max_length=100, blank=True)
    previous_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    applying_for = models.CharField(max_length=100, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('new', 'New Application'),
        ('review', 'Under Review'),
        ('interview', 'Interview Scheduled'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('enrolled', 'Enrolled')
    ], default='new')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.applicant_id} - {self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

class Application(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_number = models.CharField(max_length=50, unique=True)
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='applications')
    program = models.CharField(max_length=100)
    semester = models.CharField(max_length=20, blank=True)
    academic_year = models.CharField(max_length=20)
    
    # Documents
    documents = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('submitted', 'Submitted'),
        ('documents_received', 'Documents Received'),
        ('under_review', 'Under Review'),
        ('interview_scheduled', 'Interview Scheduled'),
        ('decision_pending', 'Decision Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('waitlisted', 'Waitlisted')
    ], default='submitted')
    
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.application_number} - {self.applicant.full_name}"

    def convert_to_student(self):
        """Convert this application to a Student record"""
        from services.education.students.models import Student
        import uuid
        
        student = Student.objects.create(
            student_id=f"STU{str(uuid.uuid4())[:8]}",
            full_name=self.applicant.full_name,
            email=self.applicant.email,
            phone=self.applicant.phone,
            program=self.program,
            enrollment_date=timezone.now().date(),
            is_active=True
        )
        
        # Update application status
        self.status = 'enrolled'
        self.save()
        
        # Update applicant status
        self.applicant.status = 'enrolled'
        self.applicant.save()
        
        return student


