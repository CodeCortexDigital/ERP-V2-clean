from rest_framework import serializers
from .models import (
    TeacherAttendance,
    AcademicYear, SchoolClass, Section, Subject, ClassSubject,
    GradeScale, AssessmentType, AssessmentWeightage,
    Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic,
    LearningResource, Teacher, TeacherSubjectAssignment, TeacherAvailability, TeacherDailyAvailability,
    Period, Classroom, TimetableEntry,
    LessonPlan, TopicCoverage, StudentTopicProgress, TeacherFeedback
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'


class SchoolClassSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    tuition_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    student_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = ['id', 'tenant', 'name', 'code', 'academic_year', 'teacher_name',
                  'classroom', 'classroom_name', 'max_students', 'student_count',
                  'available_seats', 'tuition_fee', 'description', 'is_active',
                  'created_at', 'sections']
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        return obj.students.filter(is_active=True).count()

    def get_available_seats(self, obj):
        return max((obj.max_students or 0) - self.get_student_count(obj), 0)

    def validate(self, data):
        """Enforce rules:
        - a class teacher and classroom must be assigned when creating a class
        - a classroom cannot be assigned to more than one class
        - a class teacher cannot be assigned to more than one class
        """
        errors = {}

        teacher_name = data.get('teacher_name', getattr(self.instance, 'teacher_name', None))
        classroom = data.get('classroom', getattr(self.instance, 'classroom', None))

        if self.instance is None:
            if not teacher_name or not str(teacher_name).strip():
                errors['teacher_name'] = 'A class teacher must be assigned before creating a class.'
            if not classroom:
                errors['classroom'] = 'A classroom must be assigned before creating a class.'

        if classroom:
            qs = SchoolClass.objects.filter(classroom=classroom)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                errors['classroom'] = 'This classroom is already assigned to another class.'

        if teacher_name and str(teacher_name).strip():
            qs = SchoolClass.objects.filter(teacher_name__iexact=str(teacher_name).strip())
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                errors['teacher_name'] = 'This teacher is already assigned as class teacher to another class.'

        if errors:
            raise serializers.ValidationError(errors)
        return data


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class ClassSubjectSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = ClassSubject
        fields = ['id', 'class_ref', 'subject', 'class_name', 'subject_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        """Validate that class_ref and subject are provided"""
        if not data.get('class_ref'):
            raise serializers.ValidationError({"class_ref": "Class is required"})
        if not data.get('subject'):
            raise serializers.ValidationError({"subject": "Subject is required"})
        
        # Check if this class-subject combination already exists
        from .models import ClassSubject
        if ClassSubject.objects.filter(
            class_ref=data['class_ref'],
            subject=data['subject']
        ).exists():
            raise serializers.ValidationError(
                "This subject is already assigned to this class"
            )
        
        return data


# LEVEL 2: ASSESSMENT & GRADING
class GradeScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradeScale
        fields = '__all__'


class AssessmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentType
        fields = '__all__'


class AssessmentWeightageSerializer(serializers.ModelSerializer):
    assessment_type_name = serializers.CharField(source='assessment_type.name', read_only=True)
    class_subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    
    class Meta:
        model = AssessmentWeightage
        fields = '__all__'


# LEVEL 3: SYLLABUS & RESOURCES
class SyllabusSubTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyllabusSubTopic
        fields = '__all__'


class SyllabusTopicSerializer(serializers.ModelSerializer):
    subtopics = SyllabusSubTopicSerializer(many=True, read_only=True)
    
    class Meta:
        model = SyllabusTopic
        fields = '__all__'


class SyllabusUnitSerializer(serializers.ModelSerializer):
    topics = SyllabusTopicSerializer(many=True, read_only=True)
    
    class Meta:
        model = SyllabusUnit
        fields = '__all__'


class SyllabusSerializer(serializers.ModelSerializer):
    units = SyllabusUnitSerializer(many=True, read_only=True)
    
    class Meta:
        model = Syllabus
        fields = '__all__'


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = '__all__'


# LEVEL 4: TEACHER MANAGEMENT
class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'


class TeacherSubjectAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    class_name = serializers.CharField(source='class_subject.class_ref.name', read_only=True)
    
    class Meta:
        model = TeacherSubjectAssignment
        fields = '__all__'


class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    
    class Meta:
        model = TeacherAvailability
        fields = '__all__'


# LEVEL 5: SCHEDULING & TIMETABLE
class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = '__all__'


class ClassroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classroom
        fields = '__all__'


class TimetableEntrySerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    class_name = serializers.CharField(source='class_subject.class_ref.name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    
    class Meta:
        model = TimetableEntry
        fields = '__all__'


# LEVEL 6: PROGRESS TRACKING
class LessonPlanSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    topic_title = serializers.CharField(source='syllabus_topic.title', read_only=True)
    
    class Meta:
        model = LessonPlan
        fields = '__all__'


class TopicCoverageSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    topic_title = serializers.CharField(source='syllabus_topic.title', read_only=True)
    
    class Meta:
        model = TopicCoverage
        fields = '__all__'


class StudentTopicProgressSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    topic_title = serializers.CharField(source='syllabus_topic.title', read_only=True)
    subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    
    class Meta:
        model = StudentTopicProgress
        fields = '__all__'


class TeacherFeedbackSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    topic_title = serializers.CharField(source='syllabus_topic.title', read_only=True)
    subject_name = serializers.CharField(source='class_subject.subject.name', read_only=True)
    
    class Meta:
        model = TeacherFeedback
        fields = '__all__'


class TeacherDailyAvailabilitySerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    
    class Meta:
        model = TeacherDailyAvailability
        fields = ['id', 'teacher', 'teacher_name', 'date', 'is_available', 'reason']


class TeacherAttendanceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    
    class Meta:
        model = TeacherAttendance
        fields = ['id', 'teacher', 'teacher_name', 'date', 'status', 'reason']

    def validate(self, data):
        record_date = data.get('date')
        status_val = data.get('status')
        from django.utils import timezone
        if record_date and record_date > timezone.localtime().date():
            if status_val in ['present', 'absent']:
                raise serializers.ValidationError(
                    "Future dates can only be marked as 'On Leave'."
                )
        return data