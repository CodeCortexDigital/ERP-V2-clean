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
from django.db.models import Q

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

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get or update current user"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    if request.method == 'GET':
        user = request.user
        return Response({
            'id': str(user.id),
            'email': user.email,
            'full_name': user.get_full_name() or user.email,
            'role': getattr(user, 'role', 'user'),
            'is_active': user.is_active,
        })
    
    elif request.method in ['PUT', 'PATCH']:
        user = request.user
        if 'full_name' in request.data:
            parts = request.data['full_name'].split(' ', 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ''
        if 'email' in request.data:
            user.email = request.data['email']
        user.save()
        return Response({
            'id': str(user.id),
            'email': user.email,
            'full_name': user.get_full_name() or user.email,
            'role': getattr(user, 'role', 'user'),
            'is_active': user.is_active,
        })


class StudentListCreateView(VersionedViewMixin, _StudentListCreateView):
    serializer_class = StudentSerializerV1
    serializer_classes_by_version = {'v1': StudentSerializerV1}
    
    def create(self, request, *args, **kwargs):
        """Override to handle errors gracefully and strip unknown fields"""
        try:
            allowed_fields = [
                'student_id', 'full_name', 'email', 'phone', 
                'date_of_birth', 'admission_date', 'gender',
                'father_name', 'mother_name', 'guardian_name',
                'guardian_phone', 'address', 'city', 'state',
                'postal_code', 'is_active', 'profile_picture',
                'current_class', 'current_section',
                'additional_note', 'discount_in_fee', 'identification_mark',
                'blood_group', 'disease', 'birth_form_id', 'cast',
                'previous_school', 'previous_id', 'orphan_student', 'osc',
                'religion', 'select_family', 'family_type', 'total_siblings',
                'father_national_id', 'father_occupation', 'father_education',
                'father_mobile', 'father_profession', 'father_income',
                'mother_national_id', 'mother_occupation', 'mother_education',
                'mother_mobile', 'mother_profession', 'mother_income',
            ]
            
            filtered_data = {
                key: value for key, value in request.data.items() 
                if key in allowed_fields and value is not None and value != ''
            }
            
            request._full_data = filtered_data
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class StudentDetailView(VersionedViewMixin, _StudentDetailView):
    serializer_class = StudentSerializerV1
    serializer_classes_by_version = {'v1': StudentSerializerV1}
    
    def perform_update(self, serializer):
        instance = self.get_object()
        old_class = instance.current_class
        old_class_name = old_class.name if old_class else None
        old_section = instance.current_section
        old_section_name = old_section.name if old_section else None
        
        updated_instance = serializer.save()
        
        new_class = updated_instance.current_class
        new_class_name = new_class.name if new_class else None
        new_section = updated_instance.current_section
        new_section_name = new_section.name if new_section else None
        
        old_data = {
            'full_name': instance.full_name, 'email': instance.email, 'phone': instance.phone,
            'student_id': instance.student_id, 'date_of_birth': str(instance.date_of_birth) if instance.date_of_birth else None,
            'admission_date': str(instance.admission_date) if instance.admission_date else None,
            'gender': instance.gender, 'current_class': old_class_name, 'current_class_id': str(old_class.id) if old_class else None,
            'current_section': old_section_name, 'guardian_name': instance.guardian_name,
            'father_name': instance.father_name, 'mother_name': instance.mother_name,
            'guardian_phone': instance.guardian_phone, 'address': instance.address,
            'city': instance.city, 'state': instance.state, 'postal_code': instance.postal_code,
            'is_active': instance.is_active,
        }
        
        new_data = {
            'full_name': updated_instance.full_name, 'email': updated_instance.email, 'phone': updated_instance.phone,
            'student_id': updated_instance.student_id, 'date_of_birth': str(updated_instance.date_of_birth) if updated_instance.date_of_birth else None,
            'admission_date': str(updated_instance.admission_date) if updated_instance.admission_date else None,
            'gender': updated_instance.gender, 'current_class': new_class_name, 'current_class_id': str(new_class.id) if new_class else None,
            'current_section': new_section_name, 'guardian_name': updated_instance.guardian_name,
            'father_name': updated_instance.father_name, 'mother_name': updated_instance.mother_name,
            'guardian_phone': updated_instance.guardian_phone, 'address': updated_instance.address,
            'city': updated_instance.city, 'state': updated_instance.state, 'postal_code': updated_instance.postal_code,
            'is_active': updated_instance.is_active,
        }
        
        changes = []
        action_type = 'updated'
        action_description = "Student information updated"
        
        if old_class_name != new_class_name:
            changes.append(f"Class: {old_class_name or 'No Class'} → {new_class_name or 'No Class'}")
            action_type = 'class_updated'
            action_description = f"Class changed from '{old_class_name or 'No Class'}' to '{new_class_name or 'No Class'}'"
        
        if old_section_name != new_section_name:
            changes.append(f"Section: {old_section_name or 'No Section'} → {new_section_name or 'No Section'}")
            if action_type == 'updated':
                action_type = 'section_updated'
                action_description = f"Section changed"
        
        if old_data['full_name'] != new_data['full_name']:
            changes.append(f"Name: {old_data['full_name']} → {new_data['full_name']}")
            action_type = 'name_updated'
        
        if old_data['email'] != new_data['email']:
            changes.append(f"Email: {old_data['email'] or 'None'} → {new_data['email'] or 'None'}")
        
        if old_data['phone'] != new_data['phone']:
            changes.append(f"Phone: {old_data['phone'] or 'None'} → {new_data['phone'] or 'None'}")
        
        if old_data['is_active'] != new_data['is_active']:
            old_status = 'Active' if old_data['is_active'] else 'Inactive'
            new_status = 'Active' if new_data['is_active'] else 'Inactive'
            changes.append(f"Status: {old_status} → {new_status}")
            if action_type == 'updated':
                action_type = 'status_updated'
                action_description = f"Status changed from '{old_status}' to '{new_status}'"
        
        try:
            if changes:
                description = ", ".join(changes)
                if action_type == 'updated':
                    action_description = description
            else:
                description = "No changes made"
            
            AuditLog.objects.create(
                user=self.request.user, action=action_type, resource_type='Student',
                resource_id=str(updated_instance.id), old_data=old_data, new_data=new_data,
                ip_address=self.request.META.get('REMOTE_ADDR', ''),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
            print(f"✅ Audit logged: {updated_instance.full_name} - {action_description}")
        except Exception as e:
            print(f"❌ Failed to log audit: {e}")
    
    def perform_destroy(self, instance):
        try:
            old_class_name = instance.current_class.name if instance.current_class else None
            AuditLog.objects.create(
                user=self.request.user, action='deleted', resource_type='Student',
                resource_id=str(instance.id),
                old_data={'full_name': instance.full_name, 'student_id': instance.student_id,
                          'email': instance.email, 'current_class': old_class_name},
                new_data={},
                ip_address=self.request.META.get('REMOTE_ADDR', ''),
                user_agent=self.request.META.get('HTTP_USER_AGENT', '')
            )
            print(f"✅ Audit logged: Student deleted - {instance.full_name}")
        except Exception as e:
            print(f"❌ Failed to log deletion: {e}")
        instance.delete()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    try:
        student = Student.objects.select_related('current_class', 'current_section', 'tenant').get(student_id=student_id)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
    if not ensure_student_access(request.user, student):
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    ser_cls = get_serializer_class('students', getattr(request, 'version', 'v1'))
    return Response(ser_cls(student).data)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    email = request.data.get('email') or request.data.get('user_id')
    password = request.data.get('password')
    if not email or not password:
        return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active:
        return Response({'error': 'Account is disabled'}, status=status.HTTP_403_FORBIDDEN)
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token), 'refresh': str(refresh),
        'user': {'id': str(user.id), 'email': user.email, 'full_name': user.get_full_name() or user.username,
                 'role': getattr(user, 'role', 'user'), 'is_active': user.is_active}
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    return Response({
        'id': str(user.id), 'email': user.email, 'full_name': user.get_full_name() or user.username,
        'role': getattr(user, 'role', 'user'), 'is_active': user.is_active,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_teacher_profile(request):
    """Return the logged-in teacher's profile from the Teacher record."""
    from services.education.academics.models import Teacher
    from services.education.academics.serializers import TeacherSerializer

    user = request.user
    full_name = user.get_full_name() or user.username
    teacher = None
    try:
        teacher = Teacher.objects.filter(
            Q(full_name__iexact=full_name) | Q(email__iexact=user.email)
        ).first()
    except Exception:
        teacher = None

    if teacher is None:
        return Response({
            'message': 'Teacher profile',
            'id': '',
            'employee_id': '',
            'full_name': full_name,
            'email': user.email,
            'role': getattr(user, 'role', 'teacher'),
        })

    data = TeacherSerializer(teacher).data
    data['message'] = 'Teacher profile'
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_classes_list(request):
    sample_classes = [
        {'id': 'class-1', 'name': 'Grade 1A', 'code': 'GRD1A', 'teacher_name': '', 'academic_year': '2026-2027', 'is_active': True},
        {'id': 'class-2', 'name': 'Grade 1B', 'code': 'GRD1B', 'teacher_name': '', 'academic_year': '2026-2027', 'is_active': True},
        {'id': 'class-3', 'name': 'Grade 2A', 'code': 'GRD2A', 'teacher_name': '', 'academic_year': '2026-2027', 'is_active': True},
        {'id': 'class-4', 'name': 'Grade 2B', 'code': 'GRD2B', 'teacher_name': '', 'academic_year': '2026-2027', 'is_active': True},
        {'id': 'class-5', 'name': 'Grade 3A', 'code': 'GRD3A', 'teacher_name': '', 'academic_year': '2026-2027', 'is_active': True},
    ]
    return Response({'count': len(sample_classes), 'results': sample_classes})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payments_list(request):
    return Response({'count': 0, 'results': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance_dashboard_stats(request):
    """Real TODAY attendance summary for the admin dashboard (students)."""
    from django.utils import timezone
    from django.apps import apps

    today = timezone.localtime().date()
    try:
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    except LookupError:
        return Response({
            'students': {'total': 0, 'present': 0, 'late': 0, 'absent': 0, 'present_pct': 0, 'absent_list': []},
            'employees': {'total': 0, 'present': 0, 'present_pct': 0},
        })

    student_qs = (
        Attendance.objects
        .select_related('student', 'student__current_class')
        .filter(date=today)
        .exclude(status='holiday')
        .exclude(student__isnull=True)
    )

    total_s = student_qs.count()
    present_s = student_qs.filter(status='present').count()
    late_s = student_qs.filter(status='late').count()
    absent_s = student_qs.filter(status='absent').count()
    present_pct = round(((present_s + late_s) / total_s * 100)) if total_s > 0 else 0

    absent_list = []
    for rec in student_qs.filter(status='absent').select_related('student__current_class')[:10]:
        absent_list.append({
            'name': getattr(rec.student, 'full_name', '—') if rec.student else '—',
            'class': rec.student.current_class.name if rec.student and rec.student.current_class else '—',
            'student_id': str(rec.student_id),
        })

    # Employee / Teacher attendance
    try:
        TeacherAttendance = apps.get_model('education_academics', 'TeacherAttendance')
        Teacher = apps.get_model('education_academics', 'Teacher')
        total_e = Teacher.objects.filter(is_active=True).count()
        present_e = TeacherAttendance.objects.filter(date=today, status='present').count()
    except LookupError:
        total_e = 0
        present_e = 0
    employee_pct = round((present_e / total_e * 100)) if total_e > 0 else 0

    # Class-wise breakdown for today
    class_breakdown = []
    class_data = (
        Attendance.objects
        .filter(date=today)
        .exclude(status='holiday')
        .exclude(student__isnull=True)
        .values('student__current_class__name')
        .annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            late=Count('id', filter=Q(status='late')),
            absent=Count('id', filter=Q(status='absent')),
        )
        .order_by('student__current_class__name')
    )
    for cd in class_data:
        cn = cd['student__current_class__name']
        if cn is None:
            continue
        total = cd['total']
        present = cd['present']
        late = cd['late']
        absent = cd['absent']
        rate = round(((present + late) / total * 100)) if total > 0 else 0
        class_breakdown.append({
            'class_name': cn,
            'total': total,
            'present': present,
            'late': late,
            'absent': absent,
            'rate': rate,
        })

    return Response({
        'date': str(today),
        'students': {
            'total': total_s,
            'present': present_s,
            'late': late_s,
            'absent': absent_s,
            'present_pct': present_pct,
            'absent_list': absent_list,
            'class_breakdown': class_breakdown,
        },
        'employees': {'total': total_e, 'present': present_e, 'present_pct': employee_pct},
    })


# ✅ FIXED: Fee Structures - accepts frontend field names
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_fee_structures(request):
    """Get all fee structures or create a new one"""
    try:
        from services.education.finance.models import FeeStructure
    except ImportError:
        return Response({'error': 'Finance module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    if request.method == 'GET':
        fee_structures = FeeStructure.objects.all()[:100]
        data = [{
            'id': str(fs.id), 'name': fs.name, 'fee_name': fs.name,
            'class_ref': str(fs.class_ref.id) if fs.class_ref else None,
            'class_id': str(fs.class_ref.id) if fs.class_ref else None,
            'class_name': fs.class_ref.name if fs.class_ref else '',
            'amount': float(fs.amount), 'frequency': fs.frequency,
            'description': fs.description or '', 'is_active': fs.is_active,
            'created_at': fs.created_at.isoformat() if fs.created_at else None,
        } for fs in fee_structures]
        return Response({'count': len(data), 'results': data})
    
    elif request.method == 'POST':
        # Accept both frontend (fee_name, class_ref) and backend (name, class_id) naming
        fee_name = request.data.get('fee_name') or request.data.get('name', '')
        class_ref_id = request.data.get('class_ref') or request.data.get('class_id')
        amount = request.data.get('amount', 0)
        frequency = request.data.get('frequency', 'monthly')
        description = request.data.get('description', '')
        is_active = request.data.get('is_active', True)
        
        if not fee_name:
            return Response({'error': 'Fee name is required'}, status=400)
        if not class_ref_id:
            return Response({'error': 'Class is required'}, status=400)
        
        try:
            fee_structure = FeeStructure.objects.create(
                name=fee_name, class_ref_id=class_ref_id,
                amount=float(amount), frequency=frequency,
                description=description, is_active=is_active,
            )
            return Response({
                'id': str(fee_structure.id), 'name': fee_structure.name, 'fee_name': fee_structure.name,
                'class_ref': str(fee_structure.class_ref.id) if fee_structure.class_ref else None,
                'class_id': str(fee_structure.class_ref.id) if fee_structure.class_ref else None,
                'class_name': fee_structure.class_ref.name if fee_structure.class_ref else '',
                'amount': float(fee_structure.amount), 'frequency': fee_structure.frequency,
                'description': fee_structure.description or '', 'is_active': fee_structure.is_active,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_scholarships(request):
    try:
        from services.education.finance.models import Scholarship
        scholarships = Scholarship.objects.filter(is_active=True)[:100]
        if scholarships.exists():
            data = [{
                'id': str(s.id), 'name': s.name, 'code': s.code, 'description': s.description or '',
                'type': s.type, 'amount': float(s.amount),
                'eligibility_criteria': s.eligibility_criteria or {}, 'is_active': s.is_active,
                'created_at': s.created_at.isoformat() if s.created_at else None,
            } for s in scholarships]
            return Response({'count': len(data), 'results': data})
    except (ImportError, Exception):
        pass
    return Response({'count': 0, 'results': []})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subjects_list_view(request):
    try:
        from services.education.academics.models import Subject
        from services.education.academics.serializers import SubjectSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    if request.method == 'GET':
        subjects = Subject.objects.all().order_by('name')
        serializer = SubjectSerializer(subjects, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})
    
    elif request.method == 'POST':
        data = {'name': request.data.get('name', '').strip(), 'code': request.data.get('code', '').strip().upper(),
                'credits': int(request.data.get('credits', 0)), 'description': request.data.get('description', '').strip()}
        if not data['name']:
            return Response({'error': 'Subject name is required'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SubjectSerializer(data=data)
        if serializer.is_valid():
            try:
                subject = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def subject_detail_view(request, id):
    try:
        from services.education.academics.models import Subject
        from services.education.academics.serializers import SubjectSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        subject = Subject.objects.get(id=id)
    except Subject.DoesNotExist:
        return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)
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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_subjects_list_view(request):
    try:
        from services.education.academics.models import ClassSubject, SchoolClass, Subject
        from services.education.academics.serializers import ClassSubjectSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if request.method == 'GET':
        class_subjects = ClassSubject.objects.all()
        serializer = ClassSubjectSerializer(class_subjects, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})
    elif request.method == 'POST':
        class_ref_id = request.data.get('class_ref')
        subject_id = request.data.get('subject')
        if not class_ref_id:
            return Response({'error': 'class_ref is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not subject_id:
            return Response({'error': 'subject is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            school_class = SchoolClass.objects.get(id=class_ref_id)
        except SchoolClass.DoesNotExist:
            return Response({'error': f'Class with id {class_ref_id} does not exist'}, status=status.HTTP_404_NOT_FOUND)
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response({'error': f'Subject with id {subject_id} does not exist'}, status=status.HTTP_404_NOT_FOUND)
        if ClassSubject.objects.filter(class_ref_id=class_ref_id, subject_id=subject_id).exists():
            return Response({'error': 'This subject is already assigned to this class'}, status=status.HTTP_400_BAD_REQUEST)
        class_subject = ClassSubject.objects.create(class_ref=school_class, subject=subject)
        serializer = ClassSubjectSerializer(class_subject)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_subject_detail_view(request, id):
    try:
        from services.education.academics.models import ClassSubject
        from services.education.academics.serializers import ClassSubjectSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        class_subject = ClassSubject.objects.get(id=id)
    except ClassSubject.DoesNotExist:
        return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = ClassSubjectSerializer(class_subject)
        return Response(serializer.data)
    elif request.method == 'DELETE':
        class_subject.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def classes_list_view(request):
    try:
        from services.education.academics.models import SchoolClass
        from services.education.academics.serializers import SchoolClassSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if request.method == 'GET':
        classes = SchoolClass.objects.all()
        serializer = SchoolClassSerializer(classes, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})
    elif request.method == 'POST':
        serializer = SchoolClassSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_detail_view(request, id):
    try:
        from services.education.academics.models import SchoolClass
        from services.education.academics.serializers import SchoolClassSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        school_class = SchoolClass.objects.get(id=id)
    except SchoolClass.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)
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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def academic_years_list_view(request):
    try:
        from services.education.academics.models import AcademicYear
        from services.education.academics.serializers import AcademicYearSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if request.method == 'GET':
        academic_years = AcademicYear.objects.all().order_by('-start_date')
        serializer = AcademicYearSerializer(academic_years, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})
    elif request.method == 'POST':
        serializer = AcademicYearSerializer(data=request.data)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def academic_year_detail_view(request, id):
    try:
        from services.education.academics.models import AcademicYear
        from services.education.academics.serializers import AcademicYearSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        academic_year = AcademicYear.objects.get(id=id)
    except AcademicYear.DoesNotExist:
        return Response({'error': 'Academic year not found'}, status=status.HTTP_404_NOT_FOUND)
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_history(request, id):
    try:
        from services.education.students.models import Student
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        audit_logs = AuditLog.objects.filter(resource_id=str(id), resource_type='Student').order_by('-timestamp')[:100]
        history_data = []
        for log in audit_logs:
            old_data = log.old_data or {}
            new_data = log.new_data or {}
            description = f"{log.action} performed on student"
            if log.action == 'class_updated':
                old_class = old_data.get('current_class')
                new_class = new_data.get('current_class')
                description = f"Class changed from '{old_class or 'None'}' to '{new_class or 'None'}'"
            history_data.append({
                'id': str(log.id), 'action_type': log.action, 'action': log.action,
                'description': description, 'timestamp': log.timestamp.isoformat(),
                'user': log.user.username if log.user else 'System',
                'previous_value': old_data, 'new_value': new_data, 'ip_address': log.ip_address
            })
        return Response({'results': history_data, 'count': len(history_data)})
    except Exception as e:
        return Response({'results': [], 'count': 0, 'message': str(e)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_history_summary(request, id):
    try:
        try:
            Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        audit_logs = AuditLog.objects.filter(resource_id=str(id), resource_type='Student')
        action_counts = {}
        for log in audit_logs:
            action_counts[log.action] = action_counts.get(log.action, 0) + 1
        return Response({
            'total_actions': audit_logs.count(), 'action_counts': action_counts,
            'last_action': audit_logs.first().timestamp if audit_logs.exists() else None,
            'first_action': audit_logs.last().timestamp if audit_logs.exists() else None,
        })
    except Exception as e:
        return Response({'total_actions': 0, 'action_counts': {}, 'last_action': None, 'first_action': None})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_timeline(request, id):
    try:
        from django.utils import timezone
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        audit_logs = AuditLog.objects.filter(resource_id=str(id), resource_type='Student').order_by('timestamp')
        timeline = [{
            'id': f'created-{student.id}', 'type': 'created', 'title': 'Student Created',
            'description': f'Student "{student.full_name}" was added to the system',
            'timestamp': student.created_at.isoformat() if student.created_at else timezone.now().isoformat(),
            'icon': 'UserPlus', 'color': 'emerald'
        }]
        for log in audit_logs:
            timeline.append({
                'id': str(log.id), 'type': 'action', 'title': log.action.title(),
                'description': log.action, 'timestamp': log.timestamp.isoformat(),
                'icon': 'Activity', 'color': 'purple', 'user': log.user.username if log.user else 'System'
            })
        timeline.sort(key=lambda x: x['timestamp'])
        return Response({'results': timeline, 'count': len(timeline)})
    except Exception as e:
        return Response({'results': [], 'count': 0, 'message': str(e)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_student_action(request, id):
    try:
        try:
            student = Student.objects.get(id=id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action', '')
        if not action:
            return Response({'error': 'Action is required'}, status=status.HTTP_400_BAD_REQUEST)
        audit_log = AuditLog.objects.create(
            user=request.user, action=action, resource_type='Student', resource_id=str(id),
            old_data=request.data.get('previous_value', {}), new_data=request.data.get('new_value', {}),
            ip_address=request.META.get('REMOTE_ADDR', ''), user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        return Response({'id': str(audit_log.id), 'action': action, 'timestamp': audit_log.timestamp.isoformat(),
                         'message': 'Action logged successfully'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e), 'message': 'Failed to log action'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teachers_list_view(request):
    try:
        from services.education.academics.models import Teacher
        from services.education.academics.serializers import TeacherSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if request.method == 'GET':
        queryset = Teacher.objects.all()
        is_active = request.query_params.get('is_active')
        search = request.query_params.get('search')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if search:
            queryset = queryset.filter(Q(full_name__icontains=search) | Q(email__icontains=search) | Q(employee_id__icontains=search))
        queryset = queryset.order_by('full_name')
        serializer = TeacherSerializer(queryset, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})
    elif request.method == 'POST':
        serializer = TeacherSerializer(data=request.data)
        if serializer.is_valid():
            try:
                teacher = serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def teacher_detail_view(request, id):
    try:
        from services.education.academics.models import Teacher
        from services.education.academics.serializers import TeacherSerializer
    except ImportError:
        return Response({'error': 'Academics module not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        teacher = Teacher.objects.get(id=id)
    except Teacher.DoesNotExist:
        return Response({'error': 'Teacher not found'}, status=status.HTTP_404_NOT_FOUND)
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
        teacher.is_active = False
        teacher.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def invoices_list_view(request):
    from services.education.finance.models import Invoice
    from services.education.finance.serializers import InvoiceSerializer
    if request.method == 'GET':
        queryset = Invoice.objects.all()
        student_id = request.query_params.get('student_id') or request.query_params.get('student')
        status_filter = request.query_params.get('status')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            if status_filter and status_filter != 'all':
                queryset = queryset.filter(status=status_filter)
        else:
            if status_filter:
                if status_filter != 'all':
                    queryset = queryset.filter(status=status_filter)
            else:
                queryset = queryset.filter(status__in=['unpaid', 'pending', 'draft', 'issued', 'partial', 'overdue', 'paid'])
        queryset = queryset.order_by('-created_at')
        serializer = InvoiceSerializer(queryset, many=True)
        return Response({'count': len(serializer.data), 'results': serializer.data})
    elif request.method == 'POST':
        serializer = InvoiceSerializer(data=request.data)
        if serializer.is_valid():
            invoice = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def invoice_detail_view(request, id):
    from services.education.finance.models import Invoice
    from services.education.finance.serializers import InvoiceSerializer
    try:
        invoice = Invoice.objects.get(id=id)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data)
    elif request.method in ['PUT', 'PATCH']:
        serializer = InvoiceSerializer(invoice, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        invoice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


__all__ = [
    'StudentListCreateView', 'StudentDetailView', 'get_student_by_id',
    'student_360', 'update_student_activity', 'force_update_activity',
    'login_view', 'logout_view', 'get_current_user', 'get_my_teacher_profile',
    'get_classes_list', 'get_payments_list', 'get_attendance_dashboard_stats',
    'get_fee_structures', 'get_scholarships',
    'subjects_list_view', 'subject_detail_view',
    'class_subjects_list_view', 'class_subject_detail_view',
    'classes_list_view', 'class_detail_view',
    'academic_years_list_view', 'academic_year_detail_view',
    'get_student_history', 'get_student_history_summary',
    'get_student_timeline', 'log_student_action',
    'teachers_list_view', 'teacher_detail_view',
    'invoices_list_view', 'invoice_detail_view',
    'current_user_view',
]