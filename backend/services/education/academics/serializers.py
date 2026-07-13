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

    class Meta:
        model = SchoolClass
        fields = ['id', 'tenant', 'name', 'code', 'academic_year', 'teacher_name',
                  'tuition_fee', 'description', 'is_active', 'created_at', 'sections']
        read_only_fields = ['id', 'created_at']


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