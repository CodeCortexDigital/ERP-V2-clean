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
from services.core.audit.models import AuditLog
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
    
    def perform_update(self, serializer):
        """Override to add audit logging when student is updated"""
        # Get the instance before update
        instance = self.get_object()
        
        # Get old class and section names
        old_class = instance.current_class
        old_class_name = old_class.name if old_class else None
        old_section = instance.current_section
        old_section_name = old_section.name if old_section else None
        
        # Save the updated instance
        updated_instance = serializer.save()
        
        # Get new class and section names
        new_class = updated_instance.current_class
        new_class_name = new_class.name if new_class else None
        new_section = updated_instance.current_section
        new_section_name = new_section.name if new_section else None
        
        # Build old data with human-readable values
        old_data = {
            'full_name': instance.full_name,
            'email': instance.email,
            'phone': instance.phone,
            'student_id': instance.student_id,
            'date_of_birth': str(instance.date_of_birth) if instance.date_of_birth else None,
            'admission_date': str(instance.admission_date) if instance.admission_date else None,
            'gender': instance.gender,
            'current_class': old_class_name,
            'current_class_id': str(old_class.id) if old_class else None,
            'current_section': old_section_name,
            'guardian_name': instance.guardian_name,
            'father_name': instance.father_name,
            'mother_name': instance.mother_name,
            'guardian_phone': instance.guardian_phone,
            'address': instance.address,
            'city': instance.city,
            'state': instance.state,
            'postal_code': instance.postal_code,
            'is_active': instance.is_active,
        }
        
        # Build new data with human-readable values
        new_data = {
            'full_name': updated_instance.full_name,
            'email': updated_instance.email,
            'phone': updated_instance.phone,
            'student_id': updated_instance.student_id,
            'date_of_birth': str(updated_instance.date_of_birth) if updated_instance.date_of_birth else None,
            'admission_date': str(updated_instance.admission_date) if updated_instance.admission_date else None,
            'gender': updated_instance.gender,
            'current_class': new_class_name,
            'current_class_id': str(new_class.id) if new_class else None,
            'current_section': new_section_name,
            'guardian_name': updated_instance.guardian_name,
            'father_name': updated_instance.father_name,
            'mother_name': updated_instance.mother_name,
            'guardian_phone': updated_instance.guardian_phone,
            'address': updated_instance.address,
            'city': updated_instance.city,
            'state': updated_instance.state,
            'postal_code': updated_instance.postal_code,
            'is_active': updated_instance.is_active,
        }
        
        # Find what changed with user-friendly descriptions
        changes = []
        action_type = 'updated'
        action_description = "Student information updated"
        
        # Check for class change
        if old_class_name != new_class_name:
            old_display = old_class_name or 'No Class'
            new_display = new_class_name or 'No Class'
            changes.append(f"Class: {old_display} → {new_display}")
            action_type = 'class_updated'
            action_description = f"Class changed from '{old_display}' to '{new_display}'"
        
        # Check for section change
        if old_section_name != new_section_name:
            old_display = old_section_name or 'No Section'
            new_display = new_section_name or 'No Section'
            changes.append(f"Section: {old_display} → {new_display}")
            if action_type == 'updated':
                action_type = 'section_updated'
                action_description = f"Section changed from '{old_display}' to '{new_display}'"
        
        # Check for name change
        if old_data['full_name'] != new_data['full_name']:
            changes.append(f"Name: {old_data['full_name']} → {new_data['full_name']}")
            action_type = 'name_updated'
            action_description = f"Name changed from '{old_data['full_name']}' to '{new_data['full_name']}'"
        
        # Check for email change
        if old_data['email'] != new_data['email']:
            old_display = old_data['email'] or 'None'
            new_display = new_data['email'] or 'None'
            changes.append(f"Email: {old_display} → {new_display}")
            if action_type == 'updated':
                action_type = 'email_updated'
                action_description = f"Email changed from '{old_display}' to '{new_display}'"
        
        # Check for phone change
        if old_data['phone'] != new_data['phone']:
            old_display = old_data['phone'] or 'None'
            new_display = new_data['phone'] or 'None'
            changes.append(f"Phone: {old_display} → {new_display}")
            if action_type == 'updated':
                action_type = 'phone_updated'
                action_description = f"Phone changed from '{old_display}' to '{new_display}'"
        
        # Check for guardian changes
        if old_data['guardian_name'] != new_data['guardian_name']:
            old_display = old_data['guardian_name'] or 'None'
            new_display = new_data['guardian_name'] or 'None'
            changes.append(f"Guardian: {old_display} → {new_display}")
            if action_type == 'updated':
                action_type = 'guardian_updated'
                action_description = f"Guardian changed from '{old_display}' to '{new_display}'"
        
        # Check for father name change
        if old_data['father_name'] != new_data['father_name']:
            old_display = old_data['father_name'] or 'None'
            new_display = new_data['father_name'] or 'None'
            changes.append(f"Father: {old_display} → {new_display}")
        
        # Check for mother name change
        if old_data['mother_name'] != new_data['mother_name']:
            old_display = old_data['mother_name'] or 'None'
            new_display = new_data['mother_name'] or 'None'
            changes.append(f"Mother: {old_display} → {new_display}")
        
        # Check for address change
        if old_data['address'] != new_data['address']:
            old_display = old_data['address'] or 'None'
            new_display = new_data['address'] or 'None'
            changes.append(f"Address: {old_display} → {new_display}")
            if action_type == 'updated':
                action_type = 'address_updated'
                action_description = f"Address updated"
        
        # Check for status change
        if old_data['is_active'] != new_data['is_active']:
            old_status = 'Active' if old_data['is_active'] else 'Inactive'
            new_status = 'Active' if new_data['is_active'] else 'Inactive'
            changes.append(f"Status: {old_status} → {new_status}")
            if action_type == 'updated':
                action_type = 'status_updated'
                action_description = f"Status changed from '{old_status}' to '{new_status}'"
        
        # Check for gender change
        if old_data['gender'] != new_data['gender']:
            old_display = old_data['gender'] or 'None'
            new_display = new_data['gender'] or 'None'
            changes.append(f"Gender: {old_display} → {new_display}")
        
        # Log the update to AuditLog
        try:
            # Create a description
            if changes:
                description = ", ".join(changes)
                if action_type == 'updated':
                    action_description = description
            else:
                description = "No changes made"
            
            audit_log = AuditLog.objects.create(
                user=self.request.user,
                action=action_type,
                resource_type='Student',
                resource_id=str(updated_instance.id),
                old_data=old_data,
                new_data=new_data,
                ip_address=self.request.META.get('REMOTE_ADDR', ''),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Log what happened
            print(f"✅ Audit logged: {updated_instance.full_name} - {action_description}")
                
        except Exception as e:
            print(f"❌ Failed to log audit: {e}")
    
    def perform_destroy(self, instance):
        """Override to add audit logging when student is deleted"""
        try:
            old_class_name = instance.current_class.name if instance.current_class else None
            
            AuditLog.objects.create(
                user=self.request.user,
                action='deleted',
                resource_type='Student',
                resource_id=str(instance.id),
                old_data={
                    'full_name': instance.full_name,
                    'student_id': instance.student_id,
                    'email': instance.email,
                    'current_class': old_class_name,
                },
                new_data={},
                ip_address=self.request.META.get('REMOTE_ADDR', ''),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
            print(f"✅ Audit logged: Student deleted - {instance.full_name}")
        except Exception as e:
            print(f"❌ Failed to log deletion: {e}")
        
        instance.delete()


# ============================================================
# STUDENT BY ID VIEW
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    """Get student by student_id field"""
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
    try:
        from services.education.academics.models import Subject
        from services.education.academics.serializers import SubjectSerializer
    except ImportError as e:
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
        data = {
            'name': request.data.get('name', '').strip(),
            'code': request.data.get('code', '').strip().upper(),
            'credits': int(request.data.get('credits', 0)),
            'description': request.data.get('description', '').strip(),
        }
        
        if not data['name']:
            return Response(
                {'error': 'Subject name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubjectSerializer(data=data)
        if serializer.is_valid():
            try:
                subject = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
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
        
        try:
            school_class = SchoolClass.objects.get(id=class_ref_id)
        except SchoolClass.DoesNotExist:
            return Response(
                {'error': f'Class with id {class_ref_id} does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response(
                {'error': f'Subject with id {subject_id} does not exist'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if ClassSubject.objects.filter(class_ref_id=class_ref_id, subject_id=subject_id).exists():
            return Response(
                {'error': 'This subject is already assigned to this class'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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


# ============================================================
# ACADEMIC YEARS - Full CRUD support
# ============================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def academic_years_list_view(request):
    """Get all academic years or create a new one"""
    try:
        from services.education.academics.models import AcademicYear
        from services.education.academics.serializers import AcademicYearSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    if request.method == 'GET':
        academic_years = AcademicYear.objects.all().order_by('-start_date')
        serializer = AcademicYearSerializer(academic_years, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        serializer = AcademicYearSerializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def academic_year_detail_view(request, id):
    """Get, update or delete a specific academic year"""
    try:
        from services.education.academics.models import AcademicYear
        from services.education.academics.serializers import AcademicYearSerializer
    except ImportError:
        return Response(
            {'error': 'Academics module not available'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        academic_year = AcademicYear.objects.get(id=id)
    except AcademicYear.DoesNotExist:
        return Response(
            {'error': 'Academic year not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = AcademicYearSerializer(academic_year)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = AcademicYearSerializer(academic_year, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        academic_year.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# STUDENT HISTORY & TIMELINE VIEWS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_history(request, id):
    """Get student's action history"""
    try:
        from services.education.students.models import Student
        from services.core.audit.models import AuditLog
        
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        audit_logs = AuditLog.objects.filter(
            resource_id=str(id),
            resource_type='Student'
        ).order_by('-timestamp')[:100]
        
        history_data = []
        for log in audit_logs:
            # Format old and new data for display
            old_data = log.old_data or {}
            new_data = log.new_data or {}
            
            # Get the class names if present
            old_class = old_data.get('current_class') if old_data else None
            new_class = new_data.get('current_class') if new_data else None
            
            # Create a description based on the action
            if log.action == 'class_updated':
                description = f"Class changed from '{old_class or 'None'}' to '{new_class or 'None'}'"
            elif log.action == 'updated':
                # Find what changed
                changes = []
                for key in ['full_name', 'email', 'phone', 'guardian_name']:
                    if old_data.get(key) != new_data.get(key):
                        old_val = old_data.get(key) or 'None'
                        new_val = new_data.get(key) or 'None'
                        changes.append(f"{key}: {old_val} → {new_val}")
                description = ", ".join(changes) if changes else "Student updated"
            else:
                description = f"{log.action} performed on student"
            
            history_data.append({
                'id': str(log.id),
                'action_type': log.action,
                'action': log.action,
                'description': description,
                'timestamp': log.timestamp.isoformat(),
                'user': log.user.username if log.user else 'System',
                'previous_value': old_data,
                'new_value': new_data,
                'ip_address': log.ip_address
            })
        
        return Response({
            'results': history_data,
            'count': len(history_data)
        })
        
    except Exception as e:
        return Response({
            'results': [],
            'count': 0,
            'message': str(e)
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_history_summary(request, id):
    """Get student history summary statistics"""
    try:
        from services.education.students.models import Student
        from services.core.audit.models import AuditLog
        
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        audit_logs = AuditLog.objects.filter(
            resource_id=str(id),
            resource_type='Student'
        )
        
        total_actions = audit_logs.count()
        action_counts = {}
        for log in audit_logs:
            action = log.action
            action_counts[action] = action_counts.get(action, 0) + 1
        
        return Response({
            'total_actions': total_actions,
            'action_counts': action_counts,
            'last_action': audit_logs.first().timestamp if audit_logs.exists() else None,
            'first_action': audit_logs.last().timestamp if audit_logs.exists() else None,
        })
        
    except Exception as e:
        return Response({
            'total_actions': 0,
            'action_counts': {},
            'last_action': None,
            'first_action': None,
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_timeline(request, id):
    """Get student timeline (all events in chronological order)"""
    try:
        from services.education.students.models import Student
        from services.core.audit.models import AuditLog
        from django.utils import timezone
        
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        audit_logs = AuditLog.objects.filter(
            resource_id=str(id),
            resource_type='Student'
        ).order_by('timestamp')
        
        timeline = []
        
        # Add creation event
        timeline.append({
            'id': f'created-{student.id}',
            'type': 'created',
            'title': 'Student Created',
            'description': f'Student "{student.full_name}" was added to the system',
            'timestamp': student.created_at.isoformat() if student.created_at else timezone.now().isoformat(),
            'icon': 'UserPlus',
            'color': 'emerald'
        })
        
        # Add audit events
        for log in audit_logs:
            timeline.append({
                'id': str(log.id),
                'type': 'action',
                'title': log.action.title(),
                'description': log.action,
                'timestamp': log.timestamp.isoformat(),
                'icon': 'Activity',
                'color': 'purple',
                'user': log.user.username if log.user else 'System'
            })
        
        timeline.sort(key=lambda x: x['timestamp'])
        
        return Response({
            'results': timeline,
            'count': len(timeline)
        })
        
    except Exception as e:
        return Response({
            'results': [],
            'count': 0,
            'message': str(e)
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_student_action(request, id):
    """Log a custom action for a student"""
    try:
        from services.education.students.models import Student
        from services.core.audit.models import AuditLog
        
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action', '')
        if not action:
            return Response(
                {'error': 'Action is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        audit_log = AuditLog.objects.create(
            user=request.user,
            action=action,
            resource_type='Student',
            resource_id=str(id),
            old_data=request.data.get('previous_value', {}),
            new_data=request.data.get('new_value', {}),
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'id': str(audit_log.id),
            'action': action,
            'timestamp': audit_log.timestamp.isoformat(),
            'message': 'Action logged successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Failed to log action'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# TEACHER VIEWS
# ============================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teachers_list_view(request):
    """Get all teachers or create a new teacher"""
    try:
        from services.education.academics.models import Teacher
        from services.education.academics.serializers import TeacherSerializer
        from django.db.models import Q
    except ImportError as e:
        return Response(
            {'error': f'Academics module not available: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    if request.method == 'GET':
        # Get query params for filtering
        is_active = request.query_params.get('is_active')
        search = request.query_params.get('search')
        
        queryset = Teacher.objects.all()
        
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(employee_id__icontains=search)
            )
        
        queryset = queryset.order_by('full_name')
        
        serializer = TeacherSerializer(queryset, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data
        })
    
    elif request.method == 'POST':
        serializer = TeacherSerializer(data=request.data)
        if serializer.is_valid():
            try:
                teacher = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def teacher_detail_view(request, id):
    """Get, update or delete a specific teacher"""
    try:
        from services.education.academics.models import Teacher
        from services.education.academics.serializers import TeacherSerializer
    except ImportError as e:
        return Response(
            {'error': f'Academics module not available: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        teacher = Teacher.objects.get(id=id)
    except Teacher.DoesNotExist:
        return Response(
            {'error': 'Teacher not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = TeacherSerializer(teacher)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = TeacherSerializer(teacher, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Soft delete
        teacher.is_active = False
        teacher.save()
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
    'academic_years_list_view',
    'academic_year_detail_view',
    'get_student_history',
    'get_student_history_summary',
    'get_student_timeline',
    'log_student_action',
    'teachers_list_view',
    'teacher_detail_view',
]