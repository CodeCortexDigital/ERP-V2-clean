from django.db import models
import uuid

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


class SchoolClass(models.Model):
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
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']


class Section(models.Model):
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
class Teacher(models.Model):
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
        unique_together = ['class_subject', 'day_of_week', 'period', 'academic_year']
    
    def __str__(self):
        return f"{self.day_of_week} - {self.period} - {self.class_subject} - {self.teacher.full_name}"


# LEVEL 6: PROGRESS TRACKING
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
