from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import AcademicYear, Program, Course, SchoolClass, Section
from .serializers import (
    AcademicYearSerializer, ProgramSerializer, CourseSerializer,
    SchoolClassSerializer, SectionSerializer
)

# Academic Year Views
class AcademicYearListCreateView(generics.ListCreateAPIView):
    queryset = AcademicYear.objects.filter(is_active=True)
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

class AcademicYearDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

# Program Views
class ProgramListCreateView(generics.ListCreateAPIView):
    queryset = Program.objects.filter(is_active=True)
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated]

class ProgramDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [IsAuthenticated]

# Course Views
class CourseListCreateView(generics.ListCreateAPIView):
    queryset = Course.objects.filter(is_active=True)
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

# Class Views
class SchoolClassListCreateView(generics.ListCreateAPIView):
    queryset = SchoolClass.objects.filter(is_active=True)
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]

class SchoolClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]

# Section Views
class SectionListCreateView(generics.ListCreateAPIView):
    queryset = Section.objects.filter(is_active=True)
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

class SectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

# Custom API endpoint for class list (used by frontend)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_list(request):
    """Get all classes for dropdown"""
    classes = SchoolClass.objects.filter(is_active=True).order_by('code')
    serializer = SchoolClassSerializer(classes, many=True)
    return Response(serializer.data)
