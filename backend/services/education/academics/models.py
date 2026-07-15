from django.db import models
import uuid
from services.core.tenants.mixins import SchoolAliasMixin

class AcademicYear(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-start_date']




class SchoolClass(SchoolAliasMixin, models.Model):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='classes',
        null=True,
        blank=True,
        db_index=True,
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, null=True, blank=True)
    teacher_name = models.CharField(max_length=200, blank=True)
    classroom = models.ForeignKey('Classroom', on_delete=models.SET_NULL, null=True, blank=True, related_name='classes')
    max_students = models.PositiveIntegerField(default=30)
    tuition_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']







class Section(SchoolAliasMixin, models.Model):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='sections',
        null=True,
        blank=True,
        db_index=True,
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=20)
    capacity = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def class_obj(self):
        return self.class_ref

    @class_obj.setter
    def class_obj(self, value):
        self.class_ref = value

    def __str__(self):
        return f"{self.class_ref.name} - {self.name}"
    
    class Meta:
        ordering = ['name']


class Subject(models.Model):
    """Subject/Course model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    credits = models.IntegerField(default=3)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']


class ClassSubject(models.Model):
    """Assign subjects to classes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='classes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['class_ref', 'subject']
    
    def __str__(self):
        return f"{self.class_ref.name} - {self.subject.name}"


# LEVEL 2: GRADE SCALE & ASSESSMENT RULES
class GradeScale(models.Model):
    """Grade scale with percentage ranges"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grade = models.CharField(max_length=5)  # A+, A, B+, B, C, D, F
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    max_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    points = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    description = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.grade} ({self.min_percentage}% - {self.max_percentage}%)"
    
    class Meta:
        ordering = ['-max_percentage']


class AssessmentType(models.Model):
    """Types of assessments (Midterm, Final, Quiz, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']


class AssessmentWeightage(models.Model):
    """Weightage rules for different assessment types per subject/class"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE, related_name='weightages')
    assessment_type = models.ForeignKey(AssessmentType, on_delete=models.CASCADE)
    weightage_percentage = models.DecimalField(max_digits=5, decimal_places=2)  # e.g., 30.00 for 30%
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['class_subject', 'assessment_type', 'academic_year']
    
    def __str__(self):
        return f"{self.class_subject} - {self.assessment_type}: {self.weightage_percentage}%"


# LEVEL 3: CURRICULUM & SYLLABUS
class Syllabus(models.Model):
    """Syllabus for a specific class and subject"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE, related_name='syllabi')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    total_hours = models.IntegerField(default=0)
    version = models.CharField(max_length=20, default='1.0')
    is_active = models.BooleanField(default=True)
    created_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.class_subject} - {self.title} (v{self.version})"
    
    class Meta:
        unique_together = ['class_subject', 'academic_year', 'version']


class SyllabusUnit(models.Model):
    """Units/Chapters in a syllabus"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    syllabus = models.ForeignKey(Syllabus, on_delete=models.CASCADE, related_name='units')
    unit_number = models.IntegerField()
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    estimated_hours = models.IntegerField(default=0)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Unit {self.unit_number}: {self.title}"
    
    class Meta:
        ordering = ['order', 'unit_number']


class SyllabusTopic(models.Model):
    """Topics within a unit"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit = models.ForeignKey(SyllabusUnit, on_delete=models.CASCADE, related_name='topics')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    estimated_hours = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    order = models.IntegerField(default=0)
    learning_objectives = models.JSONField(default=list, blank=True)  # List of learning objectives
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['order']


class SyllabusSubTopic(models.Model):
    """Sub-topics within a topic"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE, related_name='subtopics')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    estimated_hours = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['order']


class LearningResource(models.Model):
    """Resources for syllabus topics (books, references, materials)"""
    RESOURCE_TYPES = [
        ('book', 'Book'),
        ('reference', 'Reference Material'),
        ('video', 'Video'),
        ('website', 'Website'),
        ('document', 'Document'),
        ('software', 'Software'),
        ('other', 'Other')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    syllabus = models.ForeignKey(Syllabus, on_delete=models.CASCADE, related_name='resources')
    topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE, null=True, blank=True, related_name='resources')
    title = models.CharField(max_length=200)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPES)
    author = models.CharField(max_length=100, blank=True)
    publisher = models.CharField(max_length=100, blank=True)
    url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title


# LEVEL 4: TEACHER MANAGEMENT
class Teacher(SchoolAliasMixin, models.Model):
    """Teacher profile and information"""
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='teachers',
        null=True,
        blank=True,
        db_index=True,
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_id = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    qualifications = models.JSONField(default=list, blank=True)  # List of qualifications
    specializations = models.JSONField(default=list, blank=True)  # List of subject specializations
    experience_years = models.IntegerField(default=0)
    joining_date = models.DateField()
    is_active = models.BooleanField(default=True)
    profile_picture = models.ImageField(upload_to='teacher_photos/', null=True, blank=True)

    # Teacher classification: regular staff vs relief/substitute pool
    TEACHER_TYPES = [
        ('regular', 'Regular'),
        ('relief', 'Relief'),
    ]
    teacher_type = models.CharField(
        max_length=20,
        choices=TEACHER_TYPES,
        default='regular',
        db_index=True,
        help_text="Relief teachers are kept available to cover regular teachers on leave",
    )

    # HR / employee details
    role = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    shift = models.CharField(max_length=50, blank=True, default='')
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    father_husband_name = models.CharField(max_length=255, blank=True, default='')
    gender = models.CharField(
        max_length=10,
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')],
        blank=True,
        default='',
    )
    national_id = models.CharField(max_length=50, blank=True, default='', db_index=True)
    religion = models.CharField(max_length=100, blank=True, default='')
    education = models.CharField(max_length=200, blank=True, default='')
    blood_group = models.CharField(max_length=10, blank=True, default='')
    home_address = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.full_name} ({self.employee_id})"
    
    class Meta:
        ordering = ['full_name']


class TeacherSubjectAssignment(models.Model):
    """Assign teachers to specific subjects and classes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='subject_assignments')
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE, related_name='teacher_assignments')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    is_primary = models.BooleanField(default=True)  # Primary teacher for this subject
    assigned_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['teacher', 'class_subject', 'academic_year']
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.class_subject}"


class TeacherAvailability(models.Model):
    """Teacher availability schedule"""
    DAYS_OF_WEEK = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='availability')
    day_of_week = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['teacher', 'day_of_week', 'academic_year']
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.day_of_week}: {self.start_time}-{self.end_time}"


# LEVEL 5: SCHEDULING & TIMETABLE
class Period(models.Model):
    """Period configuration for timetable"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    period_number = models.IntegerField()
    name = models.CharField(max_length=50, blank=True)  # e.g., "Period 1", "Break", "Lunch"
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField()
    is_break = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name or f'Period {self.period_number}'} ({self.start_time}-{self.end_time})"
    
    class Meta:
        unique_together = ['academic_year', 'period_number']
        ordering = ['period_number']


class Classroom(models.Model):
    """Classroom/Room information"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    capacity = models.IntegerField(default=30)
    location = models.CharField(max_length=100, blank=True)
    floor = models.CharField(max_length=20, blank=True)  # ground, first, second, third, outdoor
    category = models.CharField(max_length=20, blank=True)  # classroom, lab, office, sports, hall, other
    facilities = models.JSONField(default=list, blank=True)  # List of facilities
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']


class TimetableEntry(models.Model):
    """Individual timetable entry"""
    DAYS_OF_WEEK = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE)
    day_of_week = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    period = models.ForeignKey(Period, on_delete=models.CASCADE)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['class_subject', 'day_of_week', 'period', 'academic_year', 'section']

    
    def __str__(self):
        return f"{self.day_of_week} - {self.period} - {self.class_subject} - {self.teacher.full_name}"


class TeacherLeave(models.Model):
    """Leave record for a teacher. Creating one can trigger automatic
    substitution of the teacher's timetable periods by an available relief
    teacher (matched by subject specialisation)."""
    LEAVE_TYPES = [
        ('sick', 'Sick'),
        ('casual', 'Casual'),
        ('annual', 'Annual'),
        ('maternity', 'Maternity'),
        ('emergency', 'Emergency'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, related_name='leaves', null=True, blank=True
    )
    # Applicant details so non-teaching staff can also apply for leave even
    # when no Teacher record is linked (used when `teacher` is null).
    applicant_name = models.CharField(max_length=255, blank=True, default='')
    applicant_email = models.CharField(max_length=255, blank=True, default='')
    leave_type = models.CharField(max_length=20, choices=LEAVE_TYPES, default='sick')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='approved')
    substitute_assigned = models.BooleanField(default=False)
    created_by = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.teacher.full_name} leave ({self.start_date} - {self.end_date})"

    @property
    def is_active(self):
        from django.utils import timezone
        today = timezone.localdate()
        return self.status in ('approved', 'pending') and self.start_date <= today <= self.end_date


class TimetableSubstitution(models.Model):
    """A single timetable period reassigned from an absent (regular) teacher
    to a relief teacher for the duration of a leave. The original
    TimetableEntry is never modified; this record is the source of truth for
    coverage and is removed automatically when the leave ends/cancels."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    leave = models.ForeignKey(
        TeacherLeave, on_delete=models.CASCADE, related_name='substitutions'
    )
    original_entry = models.ForeignKey(
        TimetableEntry, on_delete=models.CASCADE, related_name='substitutions'
    )
    relief_teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, related_name='substitute_assignments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['leave', 'original_entry']

    def __str__(self):
        return f"{self.original_entry} -> {self.relief_teacher.full_name}"


class LeaveBalance(models.Model):
    """Annual leave entitlement for a teacher or non-teaching staff member.

    The remaining balance is derived (entitlement minus approved leave days),
    so no field needs updating when leaves are approved/cancelled.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE, related_name='leave_balance', null=True, blank=True
    )
    applicant_email = models.CharField(max_length=255, blank=True, default='')
    annual_entitlement = models.IntegerField(default=0, help_text="Total leave days allowed per year")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['teacher'],
                name='uniq_leave_balance_teacher',
                condition=models.Q(teacher__isnull=False),
            ),
            models.UniqueConstraint(
                fields=['applicant_email'],
                name='uniq_leave_balance_email',
                condition=models.Q(applicant_email__gt=''),
            ),
        ]

    def __str__(self):
        who = self.teacher.full_name if self.teacher else self.applicant_email
        return f"Leave balance for {who}: {self.annual_entitlement} days"

    def _approved_days(self):
        from django.db.models import Q
        leaves = TeacherLeave.objects.filter(
            Q(teacher=self.teacher) if self.teacher else Q(applicant_email=self.applicant_email),
            status='approved',
        )
        total = 0
        for lv in leaves:
            total += (lv.end_date - lv.start_date).days + 1
        return total

    @property
    def used_days(self):
        return self._approved_days()

    @property
    def balance_days(self):
        return max(self.annual_entitlement - self.used_days, 0)


class Homework(models.Model):
    """Homework assignment given to a class by a teacher."""
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('collected', 'Collected'),
        ('evaluated', 'Evaluated'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, null=True, blank=True)
    class_ref = models.ForeignKey(SchoolClass, on_delete=models.SET_NULL, null=True, blank=True, related_name='homeworks')
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='homeworks')
    class_name = models.CharField(max_length=100, blank=True, default='')
    teacher_name = models.CharField(max_length=255, blank=True, default='')
    subject_name = models.CharField(max_length=100, blank=True, default='')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    homework_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default='')
    attachment_data = models.TextField(blank=True, default='')  # base64 data URL
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-homework_date', '-created_at']

    def __str__(self):
        return f"{self.class_name} - {self.subject_name}: {self.title}"


class LessonPlan(models.Model):
    """Daily/weekly lesson plans"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE)
    syllabus_topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE)
    date = models.DateField()
    period = models.ForeignKey(Period, on_delete=models.CASCADE)
    objectives = models.JSONField(default=list, blank=True)  # Learning objectives for the lesson
    activities = models.JSONField(default=list, blank=True)  # Planned activities
    resources_needed = models.JSONField(default=list, blank=True)  # Resources required
    homework = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('planned', 'Planned'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('postponed', 'Postponed')
    ], default='planned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['teacher', 'class_subject', 'date', 'period']
    
    def __str__(self):
        return f"{self.date} - {self.class_subject} - {self.syllabus_topic.title}"


class TopicCoverage(models.Model):
    """Track syllabus coverage progress"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    syllabus_topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    coverage_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    completed_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('review', 'Under Review')
    ], default='not_started')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['syllabus_topic', 'class_subject', 'academic_year']
    
    def __str__(self):
        return f"{self.syllabus_topic} - {self.coverage_percentage}% complete"


class StudentTopicProgress(models.Model):
    """Track individual student progress on topics"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE)
    syllabus_topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('needs_help', 'Needs Help')
    ], default='not_started')
    grade = models.CharField(max_length=5, blank=True)  # Grade received for this topic
    feedback = models.TextField(blank=True)
    completed_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['student', 'syllabus_topic', 'academic_year']
    
    def __str__(self):
        return f"{self.student.full_name} - {self.syllabus_topic} - {self.progress_percentage}%"


class TeacherFeedback(models.Model):
    """Teacher feedback and notes for students/topics"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, null=True, blank=True)
    syllabus_topic = models.ForeignKey(SyllabusTopic, on_delete=models.CASCADE, null=True, blank=True)
    class_subject = models.ForeignKey(ClassSubject, on_delete=models.CASCADE)
    feedback_type = models.CharField(max_length=20, choices=[
        ('general', 'General'),
        ('academic', 'Academic'),
        ('behavior', 'Behavior'),
        ('progress', 'Progress'),
        ('concern', 'Concern')
    ], default='general')
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_private = models.BooleanField(default=False)  # Only visible to teachers/admins
    date = models.DateField(default=models.functions.Now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.title} ({self.date})"

# Teacher Daily Availability (Date-based)
class TeacherDailyAvailability(models.Model):
    """Teacher daily availability schedule"""
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='daily_availabilities')
    date = models.DateField()
    is_available = models.BooleanField(default=True)
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['teacher', 'date']
        ordering = ['date']
    
    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.teacher.full_name} - {self.date} ({status})"

class TeacherAttendance(models.Model):
    """Teacher attendance record - respectful tracking"""
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('on_leave', 'On Leave'),
        ('absent', 'Absent'),
    ]
    
    teacher = models.ForeignKey('Teacher', on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['teacher', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.date} ({self.get_status_display()})"


class SectionTeacherAssignment(models.Model):
    section = models.ForeignKey('Section', on_delete=models.CASCADE, related_name='teacher_assignments')
    teacher = models.ForeignKey('Teacher', on_delete=models.CASCADE, related_name='section_assignments')
    academic_year = models.ForeignKey('AcademicYear', on_delete=models.CASCADE)
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    assigned_date = models.DateField(auto_now_add=True)
    
    class Meta:
        db_table = 'education_academics_section_teacher'
        unique_together = ['section', 'academic_year']
    
    def __str__(self):
        return f"{self.section.class_ref.name} - Section {self.section.name} -> {self.teacher.full_name}"
