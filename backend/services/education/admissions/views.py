from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from .models import Applicant, Application
from .serializers import ApplicantSerializer, ApplicationSerializer
from django.apps import apps
import uuid

Student = apps.get_model('education_students', 'Student')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')

class ApplicantListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer


class ApplicantDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer
    lookup_field = 'id'


class ApplicationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer
    
    def get_queryset(self):
        queryset = Application.objects.select_related('applicant').all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-submitted_at')
    
    def perform_create(self, serializer):
        applicant_id = self.request.data.get('applicant_id')
        if applicant_id:
            serializer.save(applicant_id=applicant_id)
        else:
            serializer.save()


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.select_related('applicant').all()
    serializer_class = ApplicationSerializer
    lookup_field = 'id'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_application_status(request, id):
    """Update application status"""
    try:
        application = Application.objects.get(id=id)
        new_status = request.data.get('status')
        
        valid_statuses = ['pending', 'reviewing', 'approved', 'rejected', 'waitlisted', 'enrolled']
        if new_status not in valid_statuses:
            return Response({'error': f'Invalid status'}, status=400)
        
        application.status = new_status
        application.save()
        
        return Response({'success': True, 'status': new_status})
        
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_to_student(request, id):
    """Convert approved application to a student"""
    try:
        application = Application.objects.select_related('applicant').get(id=id)
        
        if application.status != 'approved':
            return Response(
                {'error': f'Only approved applications can be converted. Status: {application.status}'},
                status=400
            )
        
        applicant = application.applicant
        
        # Get class
        school_class = None
        try:
            school_class = SchoolClass.objects.filter(name=applicant.applying_for_class).first()
        except:
            pass
        
        # Generate student ID
        student_id = f"STU-{uuid.uuid4().hex[:8].upper()}"
        
        with transaction.atomic():
            # Create student - only use fields that exist in the model
            student = Student.objects.create(
                student_id=student_id,
                full_name=applicant.full_name,
                email=applicant.email,
                phone=applicant.phone,
                # Note: father_name exists, father_phone may not exist
                father_name=applicant.father_name,
                mother_name=applicant.mother_name or '',
                current_class=school_class,
                is_active=True
            )
            
            # Update application
            application.status = 'enrolled'
            application.save()
        
        return Response({
            'success': True,
            'message': f'Successfully converted {applicant.full_name} to student',
            'student_id': str(student.id),
            'student_name': student.full_name
        })
        
    except Application.DoesNotExist:
        return Response({'error': 'Application not found'}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=400)
