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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_fee_structures(request):
    """Get fee structures - returns sample data or empty list"""
    try:
        from services.education.finance.models import FeeStructure
        fee_structures = FeeStructure.objects.filter(is_active=True)[:100]
        
        if fee_structures.exists():
            data = [{
                'id': str(fs.id),
                'name': fs.name,
                'class_id': str(fs.class_ref.id) if fs.class_ref else None,
                'class_name': fs.class_ref.name if fs.class_ref else '',
                'amount': float(fs.amount),
                'frequency': fs.frequency,
                'description': fs.description or '',
                'is_active': fs.is_active,
                'created_at': fs.created_at.isoformat() if fs.created_at else None,
            } for fs in fee_structures]
            return Response({
                'count': len(data),
                'results': data
            })
    except (ImportError, Exception):
        pass
    
    return Response({
        'count': 0,
        'results': []
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_scholarships(request):
    """Get scholarships - returns sample data or empty list"""
    try:
        from services.education.finance.models import Scholarship
        scholarships = Scholarship.objects.filter(is_active=True)[:100]
        
        if scholarships.exists():
            data = [{
                'id': str(s.id),
                'name': s.name,
                'code': s.code,
                'description': s.description or '',
                'type': s.type,
                'amount': float(s.amount),
                'eligibility_criteria': s.eligibility_criteria or {},
                'is_active': s.is_active,
                'created_at': s.created_at.isoformat() if s.created_at else None,
            } for s in scholarships]
            return Response({
                'count': len(data),
                'results': data
            })
    except (ImportError, Exception):
        pass
    
    return Response({
        'count': 0,
        'results': []
    })


# ============================================================
# SUBJECTS - FULL CRUD WITH PROPER DECORATORS
# ============================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subjects_list_view(request):
    """Get all subjects or create a new subject"""
    print(f"🔵 subjects_list_view called with method: {request.method}")
    
    try:
        from services.education.academics.models import Subject
        from services.education.academics.serializers import SubjectSerializer
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    if request.method == 'GET':
        subjects = Subject.objects.all().order_by('name')
        serializer = SubjectSerializer(subjects, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        print(f"📥 POST data: {request.data}")
        
        # Create data dict with proper values
        data = {
            'name': request.data.get('name', '').strip(),
            'code': request.data.get('code', '').strip().upper(),
            'credits': int(request.data.get('credits', 0)),
            'description': request.data.get('description', '').strip(),
        }
        
        print(f"📦 Processed data: {data}")
        
        # Validate
        if not data['name']:
            return Response(
                {'error': 'Subject name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubjectSerializer(data=data)
        if serializer.is_valid():
            try:
                subject = serializer.save()
                print(f"✅ Subject created: {subject.name} (ID: {subject.id})")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"❌ Save error: {e}")
                import traceback
                traceback.print_exc()
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            print(f"❌ Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def subject_detail_view(request, id):
    """Get, update or delete a specific subject"""
    try:
        from services.education.academics.models import Subject
        from services.education.academics.serializers import SubjectSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        subject = Subject.objects.get(id=id)
    except Subject.DoesNotExist:
        return Response(
            {'error': 'Subject not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = SubjectSerializer(subject)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = SubjectSerializer(subject, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        subject.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# CLASS SUBJECTS - Full CRUD support
# ============================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_subjects_list_view(request):
    """Get all class-subject assignments or create a new one"""
    try:
        from services.education.academics.models import ClassSubject, SchoolClass, Subject
        from services.education.academics.serializers import ClassSubjectSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    if request.method == 'GET':
        class_subjects = ClassSubject.objects.all()
        serializer = ClassSubjectSerializer(class_subjects, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        class_ref_id = request.data.get('class_ref')
        subject_id = request.data.get('subject')
        
        if not class_ref_id:
            return Response(
                {'error': 'class_ref is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not subject_id:
            return Response(
                {'error': 'subject is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if class exists
        try:
            school_class = SchoolClass.objects.get(id=class_ref_id)
        except SchoolClass.DoesNotExist:
            return Response(
                {'error': f'Class with id {class_ref_id} does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if subject exists
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response(
                {'error': f'Subject with id {subject_id} does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already assigned
        if ClassSubject.objects.filter(class_ref_id=class_ref_id, subject_id=subject_id).exists():
            return Response(
                {'error': 'This subject is already assigned to this class'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the assignment
        class_subject = ClassSubject.objects.create(
            class_ref=school_class,
            subject=subject
        )
        
        serializer = ClassSubjectSerializer(class_subject)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_subject_detail_view(request, id):
    """Get or delete a specific class-subject assignment"""
    try:
        from services.education.academics.models import ClassSubject
        from services.education.academics.serializers import ClassSubjectSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        class_subject = ClassSubject.objects.get(id=id)
    except ClassSubject.DoesNotExist:
        return Response(
            {'error': 'Assignment not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = ClassSubjectSerializer(class_subject)
        return Response(serializer.data)
    
    elif request.method == 'DELETE':
        class_subject.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# CLASSES - Full CRUD support
# ============================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def classes_list_view(request):
    """Get all classes or create a new one"""
    try:
        from services.education.academics.models import SchoolClass
        from services.education.academics.serializers import SchoolClassSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    if request.method == 'GET':
        classes = SchoolClass.objects.all()
        serializer = SchoolClassSerializer(classes, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        serializer = SchoolClassSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_detail_view(request, id):
    """Get, update or delete a specific class"""
    try:
        from services.education.academics.models import SchoolClass
        from services.education.academics.serializers import SchoolClassSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        school_class = SchoolClass.objects.get(id=id)
    except SchoolClass.DoesNotExist:
        return Response(
            {'error': 'Class not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = SchoolClassSerializer(school_class)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = SchoolClassSerializer(school_class, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        school_class.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
    'get_fee_structures',
    'get_scholarships',
    'subjects_list_view',
    'subject_detail_view',
    'class_subjects_list_view',
    'class_subject_detail_view',
    'classes_list_view',
    'class_detail_view',
]