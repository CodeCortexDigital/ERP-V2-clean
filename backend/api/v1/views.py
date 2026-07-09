"""
API v1 views — versioned serializers on top of existing student endpoints.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken

from api.versioning import VersionedViewMixin, get_serializer_class
from api.v1.serializers import StudentSerializerV1
from services.core.accounts.decorators import ensure_student_access
from services.education.students.models import Student
from services.education.students.views import (
    StudentDetailView as _StudentDetailView,
    StudentListCreateView as _StudentListCreateView,
    force_update_activity,
    last_registration,
    student_360,
    update_student_activity,
)


class StudentListCreateView(VersionedViewMixin, _StudentListCreateView):
    serializer_class = StudentSerializerV1
    serializer_classes_by_version = {'v1': StudentSerializerV1}


class StudentDetailView(VersionedViewMixin, _StudentDetailView):
    serializer_class = StudentSerializerV1
    serializer_classes_by_version = {'v1': StudentSerializerV1}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    try:
        student = Student.objects.select_related('current_class', 'current_section', 'tenant').get(
            student_id=student_id,
        )
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
    denied = ensure_student_access(request.user, student)
    if denied:
        return denied
    ser_cls = get_serializer_class('students', getattr(request, 'version', 'v1'))
    return Response(ser_cls(student).data)


# ============================================================
# AUTHENTICATION VIEWS
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    """Login endpoint that accepts email/username and password."""
    email = request.data.get('email') or request.data.get('user_id')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'Account is disabled'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': str(user.id),
            'email': user.email,
            'full_name': user.get_full_name() or user.username,
            'role': getattr(user, 'role', 'user'),
            'is_active': user.is_active,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout endpoint"""
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current user information"""
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'full_name': user.get_full_name() or user.username,
        'role': getattr(user, 'role', 'user'),
        'is_active': user.is_active,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_teacher_profile(request):
    """Get teacher profile for current user"""
    return Response({
        'message': 'Teacher profile',
        'user': {
            'id': str(request.user.id),
            'full_name': request.user.get_full_name() or request.user.username,
        }
    })


# ============================================================
# PLACEHOLDER ENDPOINTS FOR MISSING BACKEND
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_classes_list(request):
    """Get classes list - placeholder that returns sample data"""
    # Return sample class data so the frontend has something to show
    sample_classes = [
        {
            'id': 'class-1',
            'name': 'Grade 1A',
            'code': 'GRD1A',
            'teacher_name': '',
            'academic_year': '2026-2027',
            'is_active': True,
        },
        {
            'id': 'class-2',
            'name': 'Grade 1B',
            'code': 'GRD1B',
            'teacher_name': '',
            'academic_year': '2026-2027',
            'is_active': True,
        },
        {
            'id': 'class-3',
            'name': 'Grade 2A',
            'code': 'GRD2A',
            'teacher_name': '',
            'academic_year': '2026-2027',
            'is_active': True,
        },
        {
            'id': 'class-4',
            'name': 'Grade 2B',
            'code': 'GRD2B',
            'teacher_name': '',
            'academic_year': '2026-2027',
            'is_active': True,
        },
        {
            'id': 'class-5',
            'name': 'Grade 3A',
            'code': 'GRD3A',
            'teacher_name': '',
            'academic_year': '2026-2027',
            'is_active': True,
        },
    ]
    return Response({
        'count': len(sample_classes),
        'results': sample_classes
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payments_list(request):
    """Placeholder for payments endpoint - returns empty list"""
    return Response({
        'count': 0,
        'results': []
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance_dashboard_stats(request):
    """Placeholder for attendance dashboard stats - returns empty data"""
    return Response({
        'students': {
            'total': 0,
            'present': 0,
            'late': 0,
            'absent': 0,
            'present_pct': 0,
            'absent_list': []
        },
        'employees': {
            'total': 0,
            'present': 0,
            'present_pct': 0
        }
    })


__all__ = [
    'StudentListCreateView',
    'StudentDetailView',
    'get_student_by_id',
    'student_360',
    'update_student_activity',
    'force_update_activity',
    'login_view',
    'logout_view',
    'get_current_user',
    'get_my_teacher_profile',
    'get_classes_list',
    'get_payments_list',
    'get_attendance_dashboard_stats',
]