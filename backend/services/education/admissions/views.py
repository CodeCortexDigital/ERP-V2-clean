from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.apps import apps
from django.contrib.auth import get_user_model
import uuid
from datetime import datetime

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def applicant_list(request):
    """Get all applicants"""
    try:
        Applicant = apps.get_model('education_admissions', 'Applicant')
        applicants = Applicant.objects.all().order_by('-created_at')
        
        data = []
        for applicant in applicants:
            data.append({
                'id': str(applicant.id),
                'applicant_id': applicant.applicant_id,
                'full_name': f"{applicant.first_name} {applicant.last_name}",
                'first_name': applicant.first_name,
                'last_name': applicant.last_name,
                'email': applicant.email,
                'phone': applicant.phone,
                'applying_for': applicant.applying_for,
                'status': applicant.status,
                'created_at': applicant.created_at.isoformat(),
                'date_of_birth': applicant.date_of_birth.isoformat() if applicant.date_of_birth else None,
            })
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint for online applications
def applicant_create(request):
    """Create new applicant (public form)"""
    try:
        Applicant = apps.get_model('education_admissions', 'Applicant')
        
        data = request.data
        applicant = Applicant.objects.create(
            applicant_id=f"APP{str(uuid.uuid4())[:8].upper()}",
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            email=data.get('email'),
            phone=data.get('phone'),
            date_of_birth=data.get('date_of_birth'),
            gender=data.get('gender', 'other'),
            address=data.get('address', ''),
            city=data.get('city', ''),
            state=data.get('state', ''),
            country=data.get('country', 'Pakistan'),
            previous_institution=data.get('previous_institution', ''),
            previous_qualification=data.get('previous_qualification', ''),
            previous_percentage=data.get('previous_percentage'),
            applying_for=data.get('applying_for'),
            status='new'
        )
        
        return Response({
            'message': 'Application submitted successfully',
            'id': str(applicant.id),
            'applicant_id': applicant.applicant_id
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def convert_to_student(request, applicant_id):
    """Convert applicant to student"""
    try:
        Applicant = apps.get_model('education_admissions', 'Applicant')
        Student = apps.get_model('education_students', 'Student')
        
        applicant = Applicant.objects.get(id=applicant_id)
        
        # Check if already converted
        if applicant.status == 'enrolled':
            return Response({'error': 'Applicant already converted to student'}, status=400)
        
        # Create student
        student = Student.objects.create(
            student_id=f"STU{str(uuid.uuid4())[:8].upper()}",
            full_name=f"{applicant.first_name} {applicant.last_name}",
            email=applicant.email,
            phone=applicant.phone,
            enrollment_date=datetime.now().date(),
            program=applicant.applying_for,
            is_active=True
        )
        
        # Update applicant status
        applicant.status = 'enrolled'
        applicant.save()
        
        return Response({
            'message': 'Applicant converted to student successfully',
            'student_id': str(student.id),
            'student_name': student.full_name
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_applicant_status(request, applicant_id):
    """Update applicant status (review, accept, reject)"""
    try:
        Applicant = apps.get_model('education_admissions', 'Applicant')
        
        applicant = Applicant.objects.get(id=applicant_id)
        new_status = request.data.get('status')
        
        valid_statuses = ['new', 'reviewed', 'accepted', 'rejected', 'enrolled']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=400)
        
        applicant.status = new_status
        applicant.save()
        
        return Response({
            'message': f'Applicant status updated to {new_status}',
            'status': applicant.status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def applicant_detail(request, applicant_id):
    """Get single applicant details"""
    try:
        Applicant = apps.get_model('education_admissions', 'Applicant')
        applicant = Applicant.objects.get(id=applicant_id)
        
        data = {
            'id': str(applicant.id),
            'applicant_id': applicant.applicant_id,
            'first_name': applicant.first_name,
            'last_name': applicant.last_name,
            'full_name': f"{applicant.first_name} {applicant.last_name}",
            'email': applicant.email,
            'phone': applicant.phone,
            'date_of_birth': applicant.date_of_birth.isoformat() if applicant.date_of_birth else None,
            'gender': applicant.gender,
            'address': applicant.address,
            'city': applicant.city,
            'state': applicant.state,
            'postal_code': applicant.postal_code,
            'country': applicant.country,
            'previous_institution': applicant.previous_institution,
            'previous_qualification': applicant.previous_qualification,
            'previous_percentage': float(applicant.previous_percentage) if applicant.previous_percentage else None,
            'applying_for': applicant.applying_for,
            'status': applicant.status,
            'created_at': applicant.created_at.isoformat(),
            'updated_at': applicant.updated_at.isoformat()
        }
        return Response(data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_applicant(request, applicant_id):
    """Delete applicant"""
    try:
        Applicant = apps.get_model('education_admissions', 'Applicant')
        applicant = Applicant.objects.get(id=applicant_id)
        applicant.delete()
        return Response({'message': 'Applicant deleted successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
