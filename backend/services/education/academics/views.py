from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import generics, status
from services.education.students.permissions import IsStaffOrReadOnly
from services.core.utils.cache import get_timeout
from .models import (
    AcademicYear, SchoolClass, Section, Subject, ClassSubject,
    GradeScale, AssessmentType, AssessmentWeightage,
    Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic,
    LearningResource, Teacher, TeacherSubjectAssignment, TeacherAvailability, TeacherDailyAvailability, TeacherAttendance,
    Period, Classroom, TimetableEntry,
    LessonPlan, TopicCoverage, StudentTopicProgress, TeacherFeedback
)
from .serializers import (
    AcademicYearSerializer, SchoolClassSerializer, 
    SectionSerializer, SubjectSerializer, ClassSubjectSerializer,
    GradeScaleSerializer, AssessmentTypeSerializer, AssessmentWeightageSerializer,
    SyllabusSerializer, SyllabusUnitSerializer, SyllabusTopicSerializer, SyllabusSubTopicSerializer,
    LearningResourceSerializer, TeacherSerializer, TeacherSubjectAssignmentSerializer, TeacherAvailabilitySerializer, TeacherDailyAvailabilitySerializer, TeacherAttendanceSerializer,
    PeriodSerializer, ClassroomSerializer, TimetableEntrySerializer,
    LessonPlanSerializer, TopicCoverageSerializer, StudentTopicProgressSerializer, TeacherFeedbackSerializer
)


class AcademicYearListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer


@method_decorator(cache_page(get_timeout('class_list')), name='get')
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
class TeacherListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer


class TeacherDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    lookup_field = 'id'

    def destroy(self, request, *args, **kwargs):
        """Soft delete: mark teacher as inactive instead of hard delete to avoid cascade errors."""
        try:
            instance = self.get_object()
            instance.is_active = False
            instance.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            # Fallback: try hard delete if soft delete fails
            try:
                instance = self.get_object()
                instance.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Exception:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )


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
    permission_classes = [AllowAny]
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
            queryset = queryset.filter(class_subject__class_ref_id=class_id)
        if day:
            queryset = queryset.filter(day_of_week__iexact=day)
            
        return queryset


class TimetableEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = TimetableEntry.objects.all()
    serializer_class = TimetableEntrySerializer
    lookup_field = 'id'


class AllTimetableEntriesView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = TimetableEntrySerializer
    pagination_class = None
    queryset = TimetableEntry.objects.all()


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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_teachers(request):
    """Get all teachers from education_academics"""
    teachers = Teacher.objects.filter(is_active=True)
    serializer = TeacherSerializer(teachers, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_detail(request, pk):
    """Get single teacher details"""
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
            response_data = []
            for item in request.data:
                teacher_id = item.get('teacher')
                date_str = item.get('date')
                status = item.get('status')
                reason = item.get('reason', '')
                
                attendance, created = TeacherAttendance.objects.update_or_create(
                    teacher_id=teacher_id,
                    date=date_str,
                    defaults={
                        'status': status,
                        'reason': reason
                    }
                )
                serializer = self.get_serializer(attendance)
                response_data.append(serializer.data)
            return Response(response_data, status=200)
        return super().post(request, *args, **kwargs)

class TeacherAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsStaffOrReadOnly]
    queryset = TeacherAttendance.objects.all()
    serializer_class = TeacherAttendanceSerializer
    lookup_field = 'id'


