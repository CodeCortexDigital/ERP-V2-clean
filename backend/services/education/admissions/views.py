from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Applicant, Application
from .serializers import ApplicantSerializer, ApplicationSerializer
import uuid

class ApplicantListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicantSerializer
    queryset = Applicant.objects.all()


class ApplicantDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicantSerializer
    lookup_field = 'id'
    queryset = Applicant.objects.all()


class ApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer
    queryset = Application.objects.all()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_to_student(request, id):
    """Convert an application to a student record"""
    try:
        application = Application.objects.get(id=id)
        student = application.convert_to_student()
        return Response({
            'message': f'Successfully converted to student: {student.full_name}',
            'student_id': str(student.id),
            'student_name': student.full_name
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
