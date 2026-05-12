from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import (
    AcademicYear, SchoolClass, Section, Subject, ClassSubject,
    GradeScale, AssessmentType, AssessmentWeightage,
    Syllabus, SyllabusUnit, SyllabusTopic, SyllabusSubTopic,
    LearningResource, Teacher, TeacherSubjectAssignment, TeacherAvailability,
    Period, Classroom, TimetableEntry,
    LessonPlan, TopicCoverage, StudentTopicProgress, TeacherFeedback
)
from .serializers import (
    AcademicYearSerializer, SchoolClassSerializer, 
    SectionSerializer, SubjectSerializer, ClassSubjectSerializer,
    GradeScaleSerializer, AssessmentTypeSerializer, AssessmentWeightageSerializer,
    SyllabusSerializer, SyllabusUnitSerializer, SyllabusTopicSerializer, SyllabusSubTopicSerializer,
    LearningResourceSerializer, TeacherSerializer, TeacherSubjectAssignmentSerializer, TeacherAvailabilitySerializer,
    PeriodSerializer, ClassroomSerializer, TimetableEntrySerializer,
    LessonPlanSerializer, TopicCoverageSerializer, StudentTopicProgressSerializer, TeacherFeedbackSerializer
)


class AcademicYearListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer


class SchoolClassListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer


class SchoolClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer
    lookup_field = 'id'


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
    queryset = Syllabus.objects.all()
    serializer_class = SyllabusSerializer


class SyllabusDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Syllabus.objects.all()
    serializer_class = SyllabusSerializer
    lookup_field = 'id'


class SyllabusUnitListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusUnit.objects.all()
    serializer_class = SyllabusUnitSerializer


class SyllabusUnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusUnit.objects.all()
    serializer_class = SyllabusUnitSerializer
    lookup_field = 'id'


class SyllabusTopicListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SyllabusTopic.objects.all()
    serializer_class = SyllabusTopicSerializer


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


class TeacherSubjectAssignmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherSubjectAssignment.objects.all()
    serializer_class = TeacherSubjectAssignmentSerializer


class TeacherSubjectAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherSubjectAssignment.objects.all()
    serializer_class = TeacherSubjectAssignmentSerializer
    lookup_field = 'id'


class TeacherAvailabilityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherAvailability.objects.all()
    serializer_class = TeacherAvailabilitySerializer


class TeacherAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherAvailability.objects.all()
    serializer_class = TeacherAvailabilitySerializer
    lookup_field = 'id'


# LEVEL 5: SCHEDULING & TIMETABLE
class PeriodListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer


class PeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    lookup_field = 'id'


class ClassroomListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer


class ClassroomDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Classroom.objects.all()
    serializer_class = ClassroomSerializer
    lookup_field = 'id'


class TimetableEntryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TimetableEntry.objects.all()
    serializer_class = TimetableEntrySerializer


class TimetableEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TimetableEntry.objects.all()
    serializer_class = TimetableEntrySerializer
    lookup_field = 'id'


# LEVEL 6: PROGRESS TRACKING
class LessonPlanListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LessonPlan.objects.all()
    serializer_class = LessonPlanSerializer


class LessonPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = LessonPlan.objects.all()
    serializer_class = LessonPlanSerializer
    lookup_field = 'id'


class TopicCoverageListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TopicCoverage.objects.all()
    serializer_class = TopicCoverageSerializer


class TopicCoverageDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TopicCoverage.objects.all()
    serializer_class = TopicCoverageSerializer
    lookup_field = 'id'


class StudentTopicProgressListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = StudentTopicProgress.objects.all()
    serializer_class = StudentTopicProgressSerializer


class StudentTopicProgressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = StudentTopicProgress.objects.all()
    serializer_class = StudentTopicProgressSerializer
    lookup_field = 'id'


class TeacherFeedbackListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = TeacherFeedback.objects.all()
    serializer_class = TeacherFeedbackSerializer


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



