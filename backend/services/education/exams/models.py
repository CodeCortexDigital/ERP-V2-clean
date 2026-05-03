from django.db import models
import uuid

class Exam(models.Model):
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    exam_date = models.DateField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=120)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    passing_marks = models.DecimalField(max_digits=5, decimal_places=2, default=40)
    status = models.CharField(max_length=20, default='scheduled')
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.title}"

class ExamResult(models.Model):
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='exam_results')
    # DEPRECATED: student_name = models.CharField(max_length=255)  # Use student.full_name instead
    roll_number = models.CharField(max_length=50, blank=True)
    obtained_marks = models.DecimalField(max_digits=5, decimal_places=2)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    grade = models.CharField(max_length=5, blank=True)
    is_pass = models.BooleanField(default=False)
    remarks = models.TextField(blank=True)
    entered_by = models.CharField(max_length=100, blank=True)
    entered_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.total_marks and self.obtained_marks:
            self.percentage = (float(self.obtained_marks) / float(self.total_marks)) * 100
            self.is_pass = self.percentage >= 40
            if self.percentage >= 80:
                self.grade = 'A+'
            elif self.percentage >= 70:
                self.grade = 'A'
            elif self.percentage >= 60:
                self.grade = 'B'
            elif self.percentage >= 50:
                self.grade = 'C'
            elif self.percentage >= 40:
                self.grade = 'D'
            else:
                self.grade = 'F'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_name} - {self.exam.title} - {self.percentage}%"

    class Meta:
        unique_together = ['exam', 'student_id']
        ordering = ['-entered_at']




