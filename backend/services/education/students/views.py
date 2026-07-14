from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.apps import apps
from django.db import models, IntegrityError
from .models import Student
from .serializers import StudentSerializer
from services.core.accounts.decorators import (
    filter_students_for_user,
    ensure_student_access,
)
from services.core.utils.filters import parse_status_param
from services.core.tenants.scoping import scope_queryset, save_with_tenant
from services.core.utils.cache import CachedListResponseMixin, CacheKeys
from django.core.cache import cache
from django.conf import settings
from django.views.decorators.cache import never_cache
import uuid


def _student_list_cache_prefix():
    prefix = settings.CACHES.get('default', {}).get('KEY_PREFIX', '')
    return f'{prefix}:' if prefix else ''


def invalidate_student_list_cache(user):
    """Drop cached student-list responses for a user so edits are visible immediately."""
    user_id = str(getattr(user, 'id', 'anon'))
    pattern = f'{_student_list_cache_prefix()}student_list:{user_id}:*'
    try:
        cache.delete_pattern(pattern)
    except Exception:
        pass

# Get other models dynamically
Attendance = apps.get_model('education_attendance', 'AttendanceRecord')


class StudentListCreateView(CachedListResponseMixin, generics.ListCreateAPIView):

    """List all students (both active and inactive) or create a new student"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentSerializer
    cache_type = 'student_list'
    cache_key_prefix = CacheKeys.STUDENT_LIST
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['full_name', 'student_id', 'email', 'father_national_id', 'mother_national_id', 'select_family']
    ordering_fields = ['created_at', 'full_name', 'student_id']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = scope_queryset(Student.objects.all(), self.request)
        class_filter = self.request.query_params.get('class')
        if class_filter:
            queryset = queryset.filter(current_class__id=class_filter)

        status_param = self.request.query_params.get('status')
        status_bool = parse_status_param(status_param)
        if status_bool is not None:
            queryset = queryset.filter(is_active=status_bool)

        return filter_students_for_user(self.request.user, queryset)

    def perform_create(self, serializer):
        extra = {}
        if not serializer.validated_data.get('student_id'):
            extra['student_id'] = f"STU-{uuid.uuid4().hex[:8].upper()}"
        try:
            save_with_tenant(serializer, self.request, **extra)
        except IntegrityError:
            # Extremely rare race on student_id; regenerate and retry once.
            from .serializers import generate_unique_student_id
            serializer.validated_data['student_id'] = generate_unique_student_id()
            save_with_tenant(serializer, self.request)
        invalidate_student_list_cache(self.request.user)


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a student"""
    permission_classes = [IsAuthenticated]
    serializer_class = StudentSerializer
    lookup_field = 'id'

    def perform_update(self, serializer):
        serializer.save()
        invalidate_student_list_cache(self.request.user)

    def get_queryset(self):
        qs = scope_queryset(Student.objects.all(), self.request)
        return filter_students_for_user(self.request.user, qs)

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs[lookup_url_kwarg]
        
        import uuid
        from django.db.models import Q
        is_uuid = False
        try:
            uuid.UUID(str(lookup_val))
            is_uuid = True
        except (ValueError, TypeError):
            is_uuid = False

        if is_uuid:
            obj = queryset.filter(Q(id=lookup_val) | Q(student_id=lookup_val)).first()
        else:
            obj = queryset.filter(student_id=lookup_val).first()

        if not obj:
            from django.http import Http404
            raise Http404("Student not found")

        self.check_object_permissions(self.request, obj)
        return obj

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Check for any pending or unpaid/partial invoices
        from services.education.finance.models import Invoice
        pending_invoices = Invoice.objects.filter(
            student=instance,
            status__in=['issued', 'partial', 'unpaid', 'overdue']
        )
        
        has_pending = False
        for inv in pending_invoices:
            # Check remaining balance
            balance = inv.balance_due if inv.balance_due is not None else (inv.amount - inv.paid_amount)
            if balance > 0:
                has_pending = True
                break
                
        if has_pending:
            from rest_framework.response import Response
            from rest_framework import status
            return Response(
                {
                    'error': 'Cannot delete student because they have pending/unpaid invoices. Please clear or cancel their invoices first.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return super().destroy(request, *args, **kwargs)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    """Get student by their student_id field"""
    try:
        student = Student.objects.get(student_id=student_id)
        if not ensure_student_access(request.user, student):
            return Response({'error': 'Permission denied'}, status=403)
        serializer = StudentSerializer(student)
        return Response(serializer.data)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)


def _find_student(identifier):
    import uuid
    from django.db.models import Q
    try:
        uuid.UUID(str(identifier))
        return Student.objects.filter(Q(id=identifier) | Q(student_id=identifier)).first()
    except (ValueError, TypeError):
        return Student.objects.filter(student_id=identifier).first()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@never_cache
def student_360(request, student_id):
    """Get complete student 360 data including attendance and finance"""
    try:
        student = _find_student(student_id)
        if not student:
            return Response({'error': 'Student not found'}, status=404)
        if not ensure_student_access(request.user, student):
            return Response({'error': 'Permission denied'}, status=403)
        
        # Get attendance data
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        attendance_records = Attendance.objects.filter(student=student)
        school_records = attendance_records.exclude(status='holiday')
        total = school_records.count()
        present = school_records.filter(status='present').count()
        absent = school_records.filter(status='absent').count()
        late = school_records.filter(status='late').count()
        attendance_rate = round(((present + late) / total * 100), 1) if total > 0 else 0
        
        # Get finance data
        Invoice = apps.get_model('education_finance', 'Invoice')
        student_invoices = Invoice.objects.filter(student=student)
        
        from django.utils import timezone
        today = timezone.localtime().date()
        
        if not student_invoices.exists():
            fee_status = 'paid'
            balance_due = 0
        else:
            balance_due = sum(inv.balance_due for inv in student_invoices)
            
            # Use invoice.status directly to stay consistent with Finance page
            # Priority: paid > partial > overdue > pending
            active_invoices = [inv for inv in student_invoices if inv.status != 'cancelled']
            
            if not active_invoices:
                fee_status = 'paid'
            elif all(inv.status == 'paid' for inv in active_invoices):
                fee_status = 'paid'
            elif any(inv.status == 'partial' for inv in active_invoices):
                # Some payment made - show as partial
                fee_status = 'partial'
            elif any(inv.status == 'overdue' for inv in active_invoices):
                # No payment made, past due date
                fee_status = 'overdue'
            elif balance_due > 0:
                has_any_payment = any(inv.paid_amount > 0 for inv in active_invoices)
                fee_status = 'partial' if has_any_payment else 'pending'
            else:
                fee_status = 'paid'
        
        return Response({
            'attendance': {
                'total_days': total,
                'present': present,
                'absent': absent,
                'late': late,
                'attendance_rate': attendance_rate,
            },
            'finance': {
                'balance_due': float(balance_due),
                'fee_status': fee_status,
            }
        })
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_student_activity(request, id):
    """Manually update student's last_activity (called from frontend)"""
    from django.utils import timezone
    student = _find_student(id)
    if not student:
        return Response({'error': 'Student not found'}, status=404)
    if not ensure_student_access(request.user, student):
        return Response({'error': 'Permission denied'}, status=403)
    student.last_activity = timezone.now()
    student.save(update_fields=['last_activity'])
    return Response({'success': True, 'last_activity': student.last_activity})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_update_activity(request, student_id):
    """Force update last_activity for a student"""
    from django.utils import timezone
    student = _find_student(student_id)
    if not student:
        return Response({'error': 'Student not found'}, status=404)
    if not ensure_student_access(request.user, student):
        return Response({'error': 'Permission denied'}, status=403)
    student.last_activity = timezone.now()
    student.save(update_fields=['last_activity'])
    return Response({'success': True, 'last_activity': student.last_activity})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def last_registration(request):
    """
    Returns the student_id of the most recently created student.
    Used by the Add Student form to display: LAST: <id>
    Response: { "last_id": "003b", "count": 4 }
    """
    last = Student.objects.order_by('-created_at').values('student_id').first()
    total = Student.objects.count()
    return Response({
        'last_id': last['student_id'] if last else None,
        'count': total,
    })
