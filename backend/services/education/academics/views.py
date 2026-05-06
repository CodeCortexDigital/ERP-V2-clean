from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import AcademicYear, SchoolClass, Section, Subject, ClassSubject
from .serializers import (
    AcademicYearSerializer, SchoolClassSerializer, 
    SectionSerializer, SubjectSerializer, ClassSubjectSerializer
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

class ClassSectionsView(generics.ListAPIView):
    """Get all sections for a specific class"""
    permission_classes = [IsAuthenticated]
    serializer_class = SectionSerializer
    
    def get_queryset(self):
        class_id = self.kwargs.get('class_id')
        return Section.objects.filter(class_ref_id=class_id)
