from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SchoolClass, Section, AcademicYear, Course, Program
from .serializers import SchoolClassSerializer, SectionSerializer

class ClassListCreateView(generics.ListCreateAPIView):
    """List all classes or create a new class"""
    permission_classes = [IsAuthenticated]
    serializer_class = SchoolClassSerializer
    queryset = SchoolClass.objects.filter(is_active=True)


class ClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a class"""
    permission_classes = [IsAuthenticated]
    serializer_class = SchoolClassSerializer
    lookup_field = 'id'
    queryset = SchoolClass.objects.all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sections(request, class_id):
    """Get sections for a specific class"""
    try:
        sections = Section.objects.filter(class_ref_id=class_id, is_active=True)
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
