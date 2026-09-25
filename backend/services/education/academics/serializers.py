from rest_framework import serializers
from .models import (
    TeacherAttendance,
    AcademicYear, SchoolClass, Section, Subject, ClassSubject,
    GradeScale, AssessmentType, AssessmentWeightage,
    Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic,
    LearningResource, Teacher, TeacherSubjectAssignment, TeacherAvailability, TeacherDailyAvailability,
    Period, Classroom, TimetableEntry, TeacherLeave, TimetableSubstitution, LeaveBalance, Homework,
    HomeworkSubmission,
    LessonPlan, TopicCoverage, StudentTopicProgress, TeacherFeedback, LiveMeeting
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
    homeroom_teacher_name = serializers.CharField(source='homeroom_teacher.full_name', read_only=True, default='')
    student_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = SchoolClass
        fields = ['id', 'tenant', 'name', 'code', 'academic_year', 'teacher_name',
                  'grade_level', 'homeroom_teacher', 'homeroom_teacher_name',
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
        fields = ['id', 'class_ref', 'subject', 'class_name', 'subject_name', 'marks', 'created_at']
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

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if data.get('date_of_birth') == '':
            data['date_of_birth'] = None
        return super().to_internal_value(data)


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


class TeacherLeaveSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    applicant_display = serializers.SerializerMethodField(read_only=True)
    is_currently_active = serializers.BooleanField(read_only=True)
    substitutions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TeacherLeave
        fields = [
            'id', 'teacher', 'teacher_name', 'applicant_name', 'applicant_email',
            'applicant_display', 'leave_type', 'start_date',
            'end_date', 'reason', 'status', 'substitute_assigned',
            'created_by', 'created_at', 'updated_at',
            'is_currently_active', 'substitutions',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'substitute_assigned',
                            'applicant_display']

    def get_applicant_display(self, obj):
        if obj.teacher:
            return obj.teacher.full_name
        return obj.applicant_name or obj.applicant_email or 'Staff'

    def get_substitutions(self, obj):
        return TimetableSubstitutionSerializer(
            obj.substitutions.all(), many=True, context=self.context
        ).data

    def validate(self, data):
        from django.utils import timezone
        start = data.get('start_date')
        end = data.get('end_date')
        if start and end and end < start:
            raise serializers.ValidationError("End date cannot be before start date.")
        # Reject past start dates (skip on partial updates that omit it).
        if start and start < timezone.localdate():
            raise serializers.ValidationError("Start date cannot be earlier than today.")
        # On partial updates (e.g. approving) only some fields are sent, so
        # fall back to the existing instance to satisfy the requirement.
        instance = self.instance
        has_teacher = data.get('teacher') or (instance and instance.teacher)
        has_applicant = (
            data.get('applicant_name') or data.get('applicant_email')
            or (instance and (instance.applicant_name or instance.applicant_email))
        )
        if not has_teacher and not has_applicant:
            raise serializers.ValidationError(
                "Either a teacher or applicant details must be provided."
            )
        # Block overlapping / duplicate leave for the same applicant.
        if start and end and (has_teacher or has_applicant):
            from django.db.models import Q
            overlapping = TeacherLeave.objects.filter(
                Q(start_date__lte=end) & Q(end_date__gte=start),
                status__in=['pending', 'approved'],
            )
            if has_teacher:
                overlapping = overlapping.filter(teacher=data.get('teacher') or instance.teacher)
            else:
                email = data.get('applicant_email') or (instance and instance.applicant_email)
                overlapping = overlapping.filter(applicant_email=email)
            if instance:
                overlapping = overlapping.exclude(pk=instance.pk)
            if overlapping.exists():
                raise serializers.ValidationError(
                    "A leave application already overlaps these dates."
                )
        
        # Check leave approval permissions during update
        if instance and 'status' in data:
            new_status = data['status']
            old_status = instance.status
            if new_status != old_status and new_status in ('approved', 'rejected'):
                request = self.context.get('request')
                user = request.user if request else None
                is_authorized = False
                if user and user.is_authenticated:
                    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
                        is_authorized = True
                    else:
                        user_role = getattr(user, 'role', None)
                        if user_role in ('admin', 'manager', 'hr'):
                            is_authorized = True
                
                if not is_authorized:
                    raise serializers.ValidationError(
                        "Only administrators, HR, or managers can approve or reject leave requests."
                    )
                
                # Prevent self-approval or self-rejection
                curr_teacher = None
                if user and user.is_authenticated:
                    from django.apps import apps
                    try:
                        TeacherModel = apps.get_model('education_academics', 'Teacher')
                    except LookupError:
                        TeacherModel = apps.get_model('education_teachers', 'Teacher')
                    try:
                        curr_teacher = TeacherModel.objects.filter(
                            Q(full_name__iexact=user.full_name) | Q(email__iexact=user.email)
                        ).first()
                    except Exception:
                        pass
                
                is_self = False
                if instance.teacher and curr_teacher and instance.teacher.id == curr_teacher.id:
                    is_self = True
                elif instance.applicant_email and user and instance.applicant_email.lower() == user.email.lower():
                    is_self = True
                
                if is_self:
                    raise serializers.ValidationError(
                        f"You cannot {new_status} your own leave request."
                    )
                    
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if not validated_data.get('teacher') and request and request.user.is_authenticated:
            user = request.user
            if not validated_data.get('applicant_name'):
                validated_data['applicant_name'] = getattr(user, 'full_name', '') or (getattr(user, 'get_full_name', lambda: '')() or user.email)
            if not validated_data.get('applicant_email'):
                validated_data['applicant_email'] = user.email
        # Non-admin applicants may only SUBMIT leaves; they cannot self-approve.
        # Admins/staff may create already-approved leaves on behalf of staff.
        if request and request.user.is_authenticated:
            user = request.user
            if not (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
                validated_data['status'] = 'pending'
        leave = super().create(validated_data)
        # Only restructure the timetable immediately when the leave is created
        # already approved (e.g. by an admin). Pending applications wait for
        # admin approval before substitutions are generated.
        if leave.status == 'approved':
            from .substitution import create_substitutions_for_leave
            create_substitutions_for_leave(leave)
        return leave

    def update(self, instance, validated_data):
        # Substitutions are only built once a leave is approved. Approving
        # (from pending/cancelled/rejected) restructures the timetable by
        # assigning available relief teachers; cancelling/rejecting reverts it.
        old_status = instance.status
        leave = super().update(instance, validated_data)
        from .substitution import (
            create_substitutions_for_leave,
            revert_substitutions_for_leave,
        )
        new_status = leave.status
        if new_status in ('cancelled', 'rejected'):
            revert_substitutions_for_leave(leave)
        elif new_status == 'approved' and old_status != 'approved':
            create_substitutions_for_leave(leave)
        return leave


class TimetableSubstitutionSerializer(serializers.ModelSerializer):
    original_teacher_name = serializers.CharField(
        source='original_entry.teacher.full_name', read_only=True
    )
    relief_teacher_name = serializers.CharField(
        source='relief_teacher.full_name', read_only=True
    )
    day_of_week = serializers.CharField(
        source='original_entry.day_of_week', read_only=True
    )
    period_id = serializers.CharField(
        source='original_entry.period_id', read_only=True
    )
    subject_name = serializers.CharField(
        source='original_entry.class_subject.subject.name', read_only=True
    )

    class Meta:
        model = TimetableSubstitution
        fields = [
            'id', 'leave', 'original_entry', 'relief_teacher',
            'original_teacher_name', 'relief_teacher_name',
            'day_of_week', 'period_id', 'subject_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    used_days = serializers.IntegerField(read_only=True)
    balance_days = serializers.IntegerField(read_only=True)
    used_by_type = serializers.SerializerMethodField(read_only=True)
    balance_by_type = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            'id', 'teacher', 'applicant_email',
            'annual_entitlement',
            'sick_entitlement', 'casual_entitlement', 'annual_type_entitlement',
            'maternity_entitlement', 'emergency_entitlement', 'other_entitlement',
            'used_days', 'balance_days', 'used_by_type', 'balance_by_type',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'used_days', 'balance_days',
            'used_by_type', 'balance_by_type',
        ]

    def get_used_by_type(self, obj):
        return {lt: obj.used_for(lt) for lt in LeaveBalance.LEAVE_TYPE_FIELDS}

    def get_balance_by_type(self, obj):
        return {lt: obj.balance_for(lt) for lt in LeaveBalance.LEAVE_TYPE_FIELDS}


class HomeworkSerializer(serializers.ModelSerializer):
    submissions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Homework
        fields = [
            'id', 'academic_year', 'class_ref', 'teacher',
            'class_name', 'teacher_name', 'subject_name', 'title',
            'description', 'homework_date', 'due_date',
            'attachment_name', 'attachment_data', 'max_marks', 'status',
            'submissions', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'submissions']

    def get_submissions(self, obj):
        return HomeworkSubmissionSerializer(obj.submissions.all(), many=True).data


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomeworkSubmission
        fields = [
            'id', 'homework', 'student', 'student_name',
            'obtained_marks', 'remarks', 'status',
            'submitted_at', 'graded_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LiveMeetingSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    
    class Meta:
        model = LiveMeeting
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']