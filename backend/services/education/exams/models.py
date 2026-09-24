from django.db import models
from django.utils import timezone
import uuid
from services.core.tenants.mixins import SchoolAliasMixin

class Exam(SchoolAliasMixin, models.Model):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='exams',
        null=True,
        blank=True,
        db_index=True,
    )
    EXAM_TYPES = [
        ('midterm', 'Mid Term Examination'),
        ('final', 'Final Term Examination'),
        ('quiz', 'Quiz'),
        ('test', 'Unit Test'),
        ('assignment', 'Assignment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam_code = models.CharField(max_length=50, unique=True, editable=False)
    title = models.CharField(max_length=200)
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPES)
    
    # Relationships (using strings to avoid circular imports)
    class_ref = models.ForeignKey('education_academics.SchoolClass', on_delete=models.CASCADE, related_name='exams')
    section = models.ForeignKey('education_academics.Section', on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.ForeignKey('education_academics.Subject', on_delete=models.CASCADE, related_name='exams')
    
    # Exam details
    total_marks = models.IntegerField()
    passing_marks = models.IntegerField()
    exam_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True, help_text="Duration in minutes")
    
    # Academic info
    academic_year = models.CharField(max_length=20, default='2026-2027')
    term = models.CharField(max_length=20, choices=[('first', 'First Term'), ('second', 'Second Term')], default='first')
    description = models.TextField(blank=True)
    
    # Status
    is_published = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.exam_code:
            year = timezone.now().year
            # exam_code is unique across all schools, so number against every school's exams.
            last_exam = Exam._base_manager.filter(exam_code__startswith=f'EXM-{year}').order_by('-exam_code').first()
            if last_exam:
                last_num = int(last_exam.exam_code.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            self.exam_code = f'EXM-{year}-{str(new_num).zfill(4)}'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.exam_code} - {self.title} ({self.subject.name})"
    
    class Meta:
        ordering = ['-exam_date']


class ExamResult(SchoolAliasMixin, models.Model):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='exam_results',
        null=True,
        blank=True,
        db_index=True,
    )
    GRADE_CHOICES = [
        ('A+', 'A+ (90-100%)'), ('A', 'A (80-89%)'), ('B+', 'B+ (70-79%)'),
        ('B', 'B (60-69%)'), ('C+', 'C+ (50-59%)'), ('C', 'C (40-49%)'),
        ('D', 'D (33-39%)'), ('F', 'F (Below 33%)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='exam_results')
    
    # Marks
    obtained_marks = models.DecimalField(max_digits=5, decimal_places=2)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, editable=False)
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, editable=False)
    
    # Status
    is_pass = models.BooleanField(default=False, editable=False)
    remarks = models.TextField(blank=True)
    
    # Entry info
    entered_by = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    entered_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # Calculate percentage
        self.percentage = (self.obtained_marks / self.exam.total_marks) * 100
        
        # Determine grade
        if self.percentage >= 90:
            self.grade = 'A+'
            self.is_pass = True
        elif self.percentage >= 80:
            self.grade = 'A'
            self.is_pass = True
        elif self.percentage >= 70:
            self.grade = 'B+'
            self.is_pass = True
        elif self.percentage >= 60:
            self.grade = 'B'
            self.is_pass = True
        elif self.percentage >= 50:
            self.grade = 'C+'
            self.is_pass = True
        elif self.percentage >= 40:
            self.grade = 'C'
            self.is_pass = True
        elif self.percentage >= 33:
            self.grade = 'D'
            self.is_pass = True
        else:
            self.grade = 'F'
            self.is_pass = False
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.exam.title} - {self.student.full_name}: {self.percentage}% ({self.grade})"
    
    class Meta:
        unique_together = ['exam', 'student']
        ordering = ['-exam__exam_date']


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, null=True, blank=True)
    subject = models.ForeignKey('education_academics.Subject', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    topic = models.CharField(max_length=200)
    difficulty = models.CharField(max_length=20, choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')])
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.topic} ({self.difficulty})"

    class Meta:
        ordering = ['-created_at']


class QuizQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=[('mcq', 'Multiple Choice'), ('true_false', 'True/False'), ('short_answer', 'Short Answer')])
    question_text = models.TextField()
    options = models.JSONField(null=True, blank=True)  # List of choices for MCQ
    correct_answer = models.TextField()
    explanation = models.TextField(blank=True)

    def __str__(self):
        return f"Question for {self.quiz.title} ({self.question_type})"


class ExamSchedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='schedules')
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    venue = models.CharField(max_length=100, default='Main Hall')
    room = models.CharField(max_length=50, default='Hall A')
    status = models.CharField(max_length=20, choices=[('scheduled', 'Scheduled'), ('ongoing', 'Ongoing'), ('completed', 'Completed')], default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Schedule for {self.exam.title} on {self.date}"


class ExamRegistration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='registrations')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='exam_registrations')
    fee_status = models.CharField(max_length=20, choices=[('paid', 'Paid'), ('pending', 'Pending')], default='paid')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['exam', 'student']

    def __str__(self):
        return f"{self.student.full_name} registered for {self.exam.title}"

