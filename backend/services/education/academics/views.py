from services.core.accounts.decorators import is_admin
from django.utils.decorators import method_decorator
from django.db.models import Q
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from services.core.accounts.permissions import IsSchoolAdmin
from rest_framework.response import Response
from rest_framework import generics, status, viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
import uuid as _uuid
from services.education.students.permissions import IsStaffOrReadOnly
from services.core.utils.cache import get_timeout
from .models import (
    AcademicYear, SchoolClass, Section, Subject, ClassSubject,
    GradeScale, AssessmentType, AssessmentWeightage,
    Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic,
    LearningResource, Teacher, TeacherSubjectAssignment, TeacherAvailability, TeacherDailyAvailability, TeacherAttendance,
    Period, Classroom, TimetableEntry, TeacherLeave, TimetableSubstitution, LeaveBalance, Homework,
    LessonPlan, TopicCoverage, StudentTopicProgress, TeacherFeedback, LiveMeeting
)
from .serializers import (
    AcademicYearSerializer, SchoolClassSerializer, 
    SectionSerializer, SubjectSerializer, ClassSubjectSerializer,
    GradeScaleSerializer, AssessmentTypeSerializer, AssessmentWeightageSerializer,
    SyllabusSerializer, SyllabusUnitSerializer, SyllabusTopicSerializer, SyllabusSubTopicSerializer,
    LearningResourceSerializer, TeacherSerializer, TeacherSubjectAssignmentSerializer, TeacherAvailabilitySerializer, TeacherDailyAvailabilitySerializer, TeacherAttendanceSerializer,
    PeriodSerializer, ClassroomSerializer, TimetableEntrySerializer,
    LessonPlanSerializer, TopicCoverageSerializer, StudentTopicProgressSerializer, TeacherFeedbackSerializer,
    TeacherLeaveSerializer, TimetableSubstitutionSerializer, LeaveBalanceSerializer, HomeworkSerializer,
    LiveMeetingSerializer
)


class AcademicYearListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer


# Cache per signed-in user and school (Vary), never shared between schools.
@method_decorator([cache_page(get_timeout('class_list')), vary_on_headers('Authorization', 'X-Tenant-ID')], name='get')
class SchoolClassListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer


class SchoolClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer
    lookup_field = 'id'

    def destroy(self, request, *args, **kwargs):
        """Handle delete with graceful error reporting instead of 500."""
        try:
            instance = self.get_object()
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'error': f'Cannot delete class: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

class SectionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Section.objects.all()
    serializer_class = SectionSerializer


class SubjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    lookup_field = 'id'


class ClassSubjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ClassSubject.objects.all()
    serializer_class = ClassSubjectSerializer

    def create(self, request, *args, **kwargs):
        """Override create to provide better error messages and handle UUID validation."""
        try:
            class_ref_id = request.data.get('class_ref')
            subject_id = request.data.get('subject')
            
            if not class_ref_id:
                return Response(
                    {'error': 'class_ref is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not subject_id:
                return Response(
                    {'error': 'subject is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                school_class = SchoolClass.objects.get(id=class_ref_id)
            except SchoolClass.DoesNotExist:
                return Response(
                    {'error': f'Class with id {class_ref_id} does not exist'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            try:
                subject = Subject.objects.get(id=subject_id)
            except Subject.DoesNotExist:
                return Response(
                    {'error': f'Subject with id {subject_id} does not exist'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if ClassSubject.objects.filter(class_ref_id=class_ref_id, subject_id=subject_id).exists():
                return Response(
                    {'error': 'This subject is already assigned to this class'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            class_subject = ClassSubject.objects.create(
                class_ref=school_class,
                subject=subject
            )
            
            serializer = self.get_serializer(class_subject)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ClassSubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = ClassSubject.objects.all()
    serializer_class = ClassSubjectSerializer
    lookup_field = 'id'


class ClassSectionsView(generics.ListAPIView):
    """Get all sections for a specific class"""
    permission_classes = [IsAuthenticated]
    serializer_class = SectionSerializer
    
    def get_queryset(self):
        class_id = self.kwargs.get('class_id')
        return Section.objects.filter(class_ref_id=class_id)


# LEVEL 2: ASSESSMENT & GRADING
class GradeScaleListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = GradeScale.objects.all()
    serializer_class = GradeScaleSerializer


class GradeScaleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = GradeScale.objects.all()
    serializer_class = GradeScaleSerializer
    lookup_field = 'id'


class AssessmentTypeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AssessmentType.objects.all()
    serializer_class = AssessmentTypeSerializer


class AssessmentTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AssessmentType.objects.all()
    serializer_class = AssessmentTypeSerializer
    lookup_field = 'id'


class AssessmentWeightageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AssessmentWeightage.objects.all()
    serializer_class = AssessmentWeightageSerializer


class AssessmentWeightageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AssessmentWeightage.objects.all()
    serializer_class = AssessmentWeightageSerializer
    lookup_field = 'id'


# LEVEL 3: SYLLABUS & RESOURCES
class SyllabusListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SyllabusSerializer

    def get_queryset(self):
        queryset = Syllabus.objects.all()
        class_subject_id = self.request.query_params.get('class_subject_id')
        if class_subject_id:
            queryset = queryset.filter(class_subject_id=class_subject_id)
        return queryset


class SyllabusDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Syllabus.objects.all()
    serializer_class = SyllabusSerializer
    lookup_field = 'id'


class SyllabusUnitListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SyllabusUnitSerializer

    def get_queryset(self):
        queryset = SyllabusUnit.objects.all()
        syllabus_id = self.request.query_params.get('syllabus_id')
        if syllabus_id:
            queryset = queryset.filter(syllabus_id=syllabus_id)
        return queryset


class SyllabusUnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusUnit.objects.all()
    serializer_class = SyllabusUnitSerializer
    lookup_field = 'id'


class SyllabusTopicListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SyllabusTopicSerializer

    def get_queryset(self):
        queryset = SyllabusTopic.objects.all()
        unit_id = self.request.query_params.get('unit_id')
        if unit_id:
            queryset = queryset.filter(unit_id=unit_id)
        return queryset


class SyllabusTopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusTopic.objects.all()
    serializer_class = SyllabusTopicSerializer
    lookup_field = 'id'


class SyllabusSubTopicListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusSubTopic.objects.all()
    serializer_class = SyllabusSubTopicSerializer


class SyllabusSubTopicDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusSubTopic.objects.all()
    serializer_class = SyllabusSubTopicSerializer
    lookup_field = 'id'


class LearningResourceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LearningResource.objects.all()
    serializer_class = LearningResourceSerializer


class LearningResourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LearningResource.objects.all()
    serializer_class = LearningResourceSerializer
    lookup_field = 'id'


# LEVEL 4: TEACHER MANAGEMENT
PUBLIC_TEACHER_FIELDS = ('id', 'employee_id', 'full_name', 'role', 'department', 'specializations', 'is_active', 'profile_picture')


class TeacherPrivacyMixin:
    """The office sees whole staff records; everyone else sees a short public profile, and a teacher their own record."""

    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        user = self.request.user
        if is_admin(user):
            return serializer
        own_email = (getattr(user, 'email', '') or '').lower()
        target = serializer.child if hasattr(serializer, 'child') else serializer
        original = target.to_representation

        def limited(instance):
            data = original(instance)
            if (getattr(instance, 'email', '') or '').lower() == own_email:
                return data
            return {k: v for k, v in data.items() if k in PUBLIC_TEACHER_FIELDS}

        target.to_representation = limited
        return serializer


class TeacherListCreateView(TeacherPrivacyMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    
    def dispatch(self, request, *args, **kwargs):
        print(f"[DEBUG] TeacherListCreateView DISPATCH called! Path: {request.path}")
        return super().dispatch(request, *args, **kwargs)

        
                
class TeacherDetailView(TeacherPrivacyMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    lookup_field = 'id'

    def destroy(self, request, *args, **kwargs):
        """Try hard delete first to completely remove the record; fallback to soft deactivation if cascade constraint errors occur."""
        try:
            instance = self.get_object()
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            try:
                instance = self.get_object()
                instance.is_active = False
                instance.save()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )


def _resolve_current_teacher(user):
    """Map the authenticated user to their Teacher record (by name/email)."""
    from django.db.models import Q

    full_name = (getattr(user, 'get_full_name', lambda: '')() or '').strip()
    email = getattr(user, 'email', '') or ''
    if not full_name and not email:
        return None
    try:
        return Teacher.objects.filter(
            Q(full_name__iexact=full_name) | Q(email__iexact=email)
        ).first()
    except Exception:
        return None


class TeacherLeaveListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherLeaveSerializer

    def get_queryset(self):
        queryset = TeacherLeave.objects.all()
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
            return queryset
        applicant_email = self.request.query_params.get('applicant_email')
        if applicant_email:
            queryset = queryset.filter(applicant_email=applicant_email)
            return queryset

        # Default-scope to the current employee unless an admin/staff is
        # explicitly requesting all leaves. Prevents leaking everyone's leave.
        user = self.request.user
        if not is_admin(user):
            teacher = _resolve_current_teacher(user)
            if teacher is not None:
                queryset = queryset.filter(
                    Q(teacher_id=teacher.id) | Q(applicant_email__iexact=user.email)
                )
            else:
                queryset = queryset.filter(applicant_email__iexact=user.email)
        return queryset

    def perform_create(self, serializer):
        created_by = ''
        user = getattr(self.request, 'user', None)
        if user and getattr(user, 'is_authenticated', False):
            created_by = getattr(user, 'email', '') or getattr(user, 'username', '') or ''
        # Prefer an explicitly supplied teacher (e.g. admin applying on behalf
        # of a teacher); otherwise resolve the current user's Teacher record.
        teacher = serializer.validated_data.get('teacher') or (
            _resolve_current_teacher(user) if user else None
        )
        # Keep applicant name/email in sync with the linked teacher so the
        # leave always displays the correct staff member (not the requester).
        if teacher is not None:
            serializer.save(
                created_by=created_by,
                teacher=teacher,
                applicant_name=teacher.full_name,
                applicant_email=teacher.email or '',
            )
        else:
            serializer.save(created_by=created_by)


class TeacherLeaveDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherLeave.objects.all()
    serializer_class = TeacherLeaveSerializer
    lookup_field = 'id'

    def get_queryset(self):
        queryset = TeacherLeave.objects.all()
        user = self.request.user
        
        is_authorized = False
        if user and user.is_authenticated:
            if is_admin(user):
                is_authorized = True
            else:
                user_role = getattr(user, 'role', None)
                if user_role in ('admin', 'manager', 'hr'):
                    is_authorized = True
                    
        if not is_authorized:
            teacher = _resolve_current_teacher(user)
            if teacher is not None:
                queryset = queryset.filter(
                    Q(teacher_id=teacher.id) | Q(applicant_email__iexact=user.email)
                )
            else:
                queryset = queryset.filter(applicant_email__iexact=user.email)
        return queryset

    def perform_destroy(self, instance):
        from .substitution import revert_substitutions_for_leave
        revert_substitutions_for_leave(instance)
        instance.delete()


class TimetableSubstitutionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TimetableSubstitutionSerializer

    def get_queryset(self):
        queryset = TimetableSubstitution.objects.all().select_related(
            'original_entry__teacher',
            'original_entry__class_subject__subject',
            'original_entry__period',
            'relief_teacher',
            'leave',
        )
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            queryset = queryset.filter(
                Q(original_entry__teacher_id=teacher_id)
                | Q(relief_teacher_id=teacher_id)
            )
        leave_id = self.request.query_params.get('leave_id')
        if leave_id:
            queryset = queryset.filter(leave_id=leave_id)
        return queryset


class LeaveBalanceListView(generics.ListCreateAPIView):
    permission_classes = [IsSchoolAdmin]
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        queryset = LeaveBalance.objects.all().select_related('teacher')
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        applicant_email = self.request.query_params.get('applicant_email')
        if applicant_email:
            queryset = queryset.filter(applicant_email=applicant_email)
        return queryset

    def list(self, request, *args, **kwargs):
        # When scoped to a teacher/email, ensure a balance row exists and
        # return it as a single object so the UI can always show a balance.
        teacher_id = request.query_params.get('teacher_id')
        applicant_email = request.query_params.get('applicant_email')
        if teacher_id or applicant_email:
            if teacher_id:
                obj, _ = LeaveBalance.objects.get_or_create(teacher_id=teacher_id)
            else:
                obj, _ = LeaveBalance.objects.get_or_create(applicant_email=applicant_email)
            return Response(self.get_serializer(obj).data)
        return super().list(request, *args, **kwargs)


class LeaveBalanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSchoolAdmin]
    serializer_class = LeaveBalanceSerializer
    queryset = LeaveBalance.objects.all().select_related('teacher')
    lookup_field = 'id'
    lookup_url_kwarg = 'id'


@api_view(['POST'])
@permission_classes([IsSchoolAdmin])
def leave_balance_set_defaults(request):
    """Admin bulk action: ensure every teacher has a balance row and apply
    the default entitlements (annual=15, casual=10, others=0). Existing
    per-teacher overrides are NOT overwritten when `overwrite` is false."""
    from .models import Teacher
    overwrite = bool(request.data.get('overwrite', False))
    defaults = {
        'sick_entitlement': int(request.data.get('sick', 0)),
        'casual_entitlement': int(request.data.get('casual', 10)),
        'annual_type_entitlement': int(request.data.get('annual', 15)),
        'maternity_entitlement': int(request.data.get('maternity', 0)),
        'emergency_entitlement': int(request.data.get('emergency', 0)),
        'other_entitlement': int(request.data.get('other', 0)),
    }
    created, updated = 0, 0
    for teacher in Teacher.objects.all():
        obj, was_created = LeaveBalance.objects.get_or_create(
            teacher=teacher,
            defaults=defaults,
        )
        if was_created:
            created += 1
        elif overwrite:
            for field, value in defaults.items():
                setattr(obj, field, value)
            obj.save(update_fields=list(defaults.keys()))
            updated += 1
    return Response({
        'created': created,
        'updated': updated,
        'defaults': defaults,
    })


class TeacherSubjectAssignmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherSubjectAssignmentSerializer

    def get_queryset(self):
        queryset = TeacherSubjectAssignment.objects.all()
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        return queryset


class TeacherSubjectAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherSubjectAssignment.objects.all()
    serializer_class = TeacherSubjectAssignmentSerializer
    lookup_field = 'id'


class TeacherAvailabilityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherAvailabilitySerializer

    def get_queryset(self):
        queryset = TeacherAvailability.objects.all()
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        return queryset


class TeacherAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherAvailability.objects.all()
    serializer_class = TeacherAvailabilitySerializer
    lookup_field = 'id'


# LEVEL 5: SCHEDULING & TIMETABLE
class PeriodListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer


class PeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    lookup_field = 'id'


class ClassroomListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer


class ClassroomDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer
    lookup_field = 'id'


class TimetableEntryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    serializer_class = TimetableEntrySerializer
    pagination_class = None

    def get_queryset(self):
        queryset = TimetableEntry.objects.all()
        teacher_id = self.request.query_params.get('teacher_id')
        class_id = self.request.query_params.get('class_id')
        day = self.request.query_params.get('day')

        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if class_id:
            if _is_uuid(class_id):
                queryset = queryset.filter(class_subject__class_ref_id=class_id)
            else:
                queryset = queryset.filter(class_subject__class_ref__name__iexact=class_id)
        section_id = self.request.query_params.get('section_id')
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if day:
            queryset = queryset.filter(day_of_week__iexact=day)

        return queryset


class TimetableEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = TimetableEntry.objects.all()
    serializer_class = TimetableEntrySerializer
    lookup_field = 'id'


def _is_uuid(value):
    try:
        _uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


class AllTimetableEntriesView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TimetableEntrySerializer
    pagination_class = None
    queryset = TimetableEntry.objects.all()

    def get_queryset(self):
        queryset = TimetableEntry.objects.all()
        teacher_id = self.request.query_params.get('teacher_id')
        class_id = self.request.query_params.get('class_id')
        class_subject_id = self.request.query_params.get('class_subject_id')
        day = self.request.query_params.get('day')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if class_id:
            if _is_uuid(class_id):
                queryset = queryset.filter(class_subject__class_ref_id=class_id)
            else:
                queryset = queryset.filter(class_subject__class_ref__name__iexact=class_id)
        section_id = self.request.query_params.get('section_id')
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if class_subject_id:
            queryset = queryset.filter(class_subject_id=class_subject_id)
        if day:
            queryset = queryset.filter(day_of_week__iexact=day)
        return queryset


# LEVEL 6: PROGRESS TRACKING
class LessonPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LessonPlanSerializer

    def get_queryset(self):
        queryset = LessonPlan.objects.all()
        teacher_id = self.request.query_params.get('teacher_id')
        class_subject_id = self.request.query_params.get('class_subject_id')
        date = self.request.query_params.get('date')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if class_subject_id:
            queryset = queryset.filter(class_subject_id=class_subject_id)
        if date:
            queryset = queryset.filter(date=date)
        return queryset


class LessonPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LessonPlan.objects.all()
    serializer_class = LessonPlanSerializer
    lookup_field = 'id'


class TopicCoverageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TopicCoverageSerializer

    def get_queryset(self):
        queryset = TopicCoverage.objects.all()
        class_subject_id = self.request.query_params.get('class_subject_id')
        teacher_id = self.request.query_params.get('teacher_id')
        if class_subject_id:
            queryset = queryset.filter(class_subject_id=class_subject_id)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        return queryset


class TopicCoverageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TopicCoverage.objects.all()
    serializer_class = TopicCoverageSerializer
    lookup_field = 'id'


class StudentTopicProgressListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentTopicProgressSerializer

    def get_queryset(self):
        queryset = StudentTopicProgress.objects.all()
        student_id = self.request.query_params.get('student_id')
        class_subject_id = self.request.query_params.get('class_subject_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if class_subject_id:
            queryset = queryset.filter(class_subject_id=class_subject_id)
        return queryset


class StudentTopicProgressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = StudentTopicProgress.objects.all()
    serializer_class = StudentTopicProgressSerializer
    lookup_field = 'id'


class TeacherFeedbackListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherFeedbackSerializer

    def get_queryset(self):
        queryset = TeacherFeedback.objects.all()
        student_id = self.request.query_params.get('student_id')
        teacher_id = self.request.query_params.get('teacher_id')
        class_subject_id = self.request.query_params.get('class_subject_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if class_subject_id:
            queryset = queryset.filter(class_subject_id=class_subject_id)
        return queryset


class TeacherFeedbackDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherFeedback.objects.all()
    serializer_class = TeacherFeedbackSerializer
    lookup_field = 'id'


# ✅ FIXED: Returns ALL teachers (both active and inactive)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_teachers(request):
    """Get ALL teachers (both active and inactive)"""
    teachers = Teacher.objects.all()  # ✅ Returns ALL teachers
    serializer = TeacherSerializer(teachers, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_detail(request, pk):
    """Get single teacher details"""
    from django.shortcuts import get_object_or_404
    teacher = get_object_or_404(Teacher, pk=pk)
    serializer = TeacherSerializer(teacher)
    return Response(serializer.data)


class TeacherDailyAvailabilityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherDailyAvailabilitySerializer
    
    def get_queryset(self):
        teacher_id = self.request.query_params.get('teacher_id')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        queryset = TeacherDailyAvailability.objects.all()
        
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if year and month:
            queryset = queryset.filter(date__year=year, date__month=month)
        
        return queryset


class TeacherDailyAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherDailyAvailability.objects.all()
    serializer_class = TeacherDailyAvailabilitySerializer
    lookup_field = 'id'


def ensure_teacher_attendance_for_past_days(teacher_id, till_date, days_limit=30):
    from datetime import timedelta
    from services.education.academics.models import Teacher, TeacherAttendance
    from services.education.attendance.calendar import is_school_day
    
    try:
        teacher = Teacher.objects.get(id=teacher_id)
    except Teacher.DoesNotExist:
        return
        
    start_date = till_date - timedelta(days=days_limit)
    
    existing_dates = set(
        TeacherAttendance.objects.filter(
            teacher_id=teacher_id,
            date__gte=start_date,
            date__lte=till_date
        ).values_list('date', flat=True)
    )
    
    to_create = []
    for i in range(days_limit, -1, -1):
        day = till_date - timedelta(days=i)
        if day not in existing_dates and is_school_day(day):
            to_create.append(
                TeacherAttendance(
                    teacher=teacher,
                    date=day,
                    status='present',
                    reason='Auto-marked present'
                )
            )
            
    if to_create:
        TeacherAttendance.objects.bulk_create(to_create, ignore_conflicts=True)


class TeacherAttendanceListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    serializer_class = TeacherAttendanceSerializer
    
    def get_queryset(self):
        teacher_id = self.request.query_params.get('teacher_id')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        date_param = self.request.query_params.get('date')
        
        queryset = TeacherAttendance.objects.all()
        
        if teacher_id:
            from django.utils import timezone
            ensure_teacher_attendance_for_past_days(teacher_id, timezone.localtime().date())
            queryset = queryset.filter(teacher_id=teacher_id)
        if year and month:
            queryset = queryset.filter(date__year=year, date__month=month)
        if date_param:
            queryset = queryset.filter(date=date_param)
        
        return queryset

    def post(self, request, *args, **kwargs):
        if isinstance(request.data, list):
            import uuid as uuid_lib
            valid_status = {c[0] for c in TeacherAttendance.STATUS_CHOICES}
            existing_teacher_ids = set(
                str(tid) for tid in Teacher.objects.values_list('id', flat=True)
            )
            # Map employee_id -> real UUID so client-side teachers whose stored
            # id is a stale/non-UUID value can still be resolved to a DB record.
            employee_id_map = {
                str(emp): str(tid)
                for tid, emp in Teacher.objects.values_list('id', 'employee_id')
                if emp
            }

            response_data = []
            skipped = []
            for item in request.data:
                teacher_id = item.get('teacher')
                employee_id = item.get('employee_id')
                date_str = item.get('date')
                status_val = item.get('status')
                reason = item.get('reason', '') or ''

                # Resolve the real DB teacher id.
                resolved_id = None
                try:
                    uuid_lib.UUID(str(teacher_id))
                    if str(teacher_id) in existing_teacher_ids:
                        resolved_id = str(teacher_id)
                except (ValueError, AttributeError, TypeError):
                    pass

                if resolved_id is None and employee_id is not None:
                    resolved_id = employee_id_map.get(str(employee_id))

                if resolved_id is None:
                    skipped.append({'teacher': teacher_id, 'reason': 'not_found'})
                    continue

                teacher_id = resolved_id

                if status_val not in valid_status:
                    status_val = 'present'

                attendance, created = TeacherAttendance.objects.update_or_create(
                    teacher_id=teacher_id,
                    date=date_str,
                    defaults={
                        'status': status_val,
                        'reason': reason
                    }
                )
                serializer = self.get_serializer(attendance)
                response_data.append(serializer.data)

            return Response({'saved': response_data, 'skipped': skipped}, status=200)
        return super().post(request, *args, **kwargs)


class TeacherAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = TeacherAttendance.objects.all()
    serializer_class = TeacherAttendanceSerializer
    lookup_field = 'id'


class HomeworkListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = HomeworkSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Homework.objects.all().select_related('class_ref', 'teacher')
        class_name = self.request.query_params.get('class_name')
        teacher_name = self.request.query_params.get('teacher_name')
        subject_name = self.request.query_params.get('subject_name')
        if class_name:
            queryset = queryset.filter(class_name__iexact=class_name)
        if teacher_name:
            queryset = queryset.filter(teacher_name__iexact=teacher_name)
        if subject_name:
            queryset = queryset.filter(subject_name__iexact=subject_name)
        return queryset


class HomeworkDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Homework.objects.all()
    serializer_class = HomeworkSerializer
    lookup_field = 'id'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def grade_homework(request, homework_id):
    """Bulk grade a homework assignment.

    Body: { "submissions": [ { "student": <id>, "student_name": "...",
            "obtained_marks": 0-100, "remarks": "...", "status": "graded" } ] }
    """
    from .serializers import HomeworkSubmissionSerializer
    try:
        homework = Homework.objects.get(id=homework_id)
    except Homework.DoesNotExist:
        return Response({'error': 'Homework not found'}, status=status.HTTP_404_NOT_FOUND)

    submissions_data = request.data.get('submissions', [])
    created = []
    for sub in submissions_data:
        student_id = sub.get('student')
        student_name = sub.get('student_name') or ''
        obj, _ = HomeworkSubmission.objects.update_or_create(
            homework=homework,
            student_id=student_id,
            defaults={
                'student_name': student_name,
                'obtained_marks': sub.get('obtained_marks'),
                'remarks': sub.get('remarks', ''),
                'status': sub.get('status', 'graded'),
                'graded_at': timezone.now(),
            },
        )
        created.append(HomeworkSubmissionSerializer(obj).data)
    homework.status = 'evaluated'
    homework.save(update_fields=['status', 'updated_at'])
    return Response({'submissions': created}, status=status.HTTP_200_OK)


class LiveMeetingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LiveMeeting.objects.select_related('class_ref', 'created_by')
    serializer_class = LiveMeetingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'meeting_with', 'class_ref', 'date']
    search_fields = ['title', 'code', 'message']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['-date', '-created_at']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user.teacher_profile if hasattr(self.request.user, 'teacher_profile') else None)