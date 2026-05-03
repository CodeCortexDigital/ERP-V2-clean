from core.permissions import IsAdmin
from rest_framework.viewsets import ModelViewSet
from .models import *
from .serializers import *

class AcademicYearViewSet(ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer

class ProgramViewSet(ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer

class CourseViewSet(ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

class SemesterViewSet(ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

class ProgramCurriculumViewSet(ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = ProgramCurriculum.objects.all()
    serializer_class = ProgramCurriculumSerializer

