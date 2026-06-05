from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from rest_framework import generics
from django.apps import apps
from .serializers import UserSerializer, StudentSerializer
from services.core.utils.cache import (
    cached_api_view,
    get_dropdown_options,
    get_timeout,
)
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    identifier = (
        request.data.get('user_id')
        or request.data.get('email')
        or request.data.get('student_id')
    )
    password = request.data.get('password')

    if not identifier or not password:
        return Response({'error': 'User ID/Email/Student ID and password required'}, status=status.HTTP_400_BAD_REQUEST)

    user = None
    login_username = identifier

    from services.education.students.models import Student
    try:
        student = Student.objects.get(student_id=identifier)
        login_username = student.email
    except Student.DoesNotExist:
        pass

    try:
        user_obj = User.objects.get(email=login_username)
        user = authenticate(request, username=user_obj.email, password=password)
    except User.DoesNotExist:
        try:
            user_obj = User.objects.get(id=identifier)
            user = authenticate(request, username=user_obj.email, password=password)
        except (User.DoesNotExist, ValueError):
            user = authenticate(request, username=login_username, password=password)
    
    if user and user.is_active:
        # Activate pending accounts on first successful login
        if getattr(user, 'account_status', None) == 'pending':
            user.account_status = 'active'
            user.save(update_fields=['account_status'])

        from services.core.tenants.utils import (
            resolve_tenant_for_user,
            set_session_tenant,
        )
        from services.core.tenants.serializers import SchoolSerializer
        from .decorators import get_user_role

        refresh = RefreshToken.for_user(user)
        tenant = resolve_tenant_for_user(user)
        if tenant:
            set_session_tenant(request, tenant)

        payload = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': getattr(user, 'full_name', user.email),
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'role': get_user_role(user),
            },
        }
        if tenant:
            payload['tenant'] = SchoolSerializer(tenant).data
        return Response(payload)
    
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'})
    except Exception:
        return Response({'message': 'Logged out'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'full_name': user.full_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'role': get_user_role(user),
    })


class StudentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        Student = apps.get_model('education_students', 'Student')
        return Student.objects.all()
    
    def get_serializer_class(self):
        return StudentSerializer


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    
    def get_queryset(self):
        Student = apps.get_model('education_students', 'Student')
        return Student.objects.all()
    
    def get_serializer_class(self):
        return StudentSerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'message': 'Student deactivated'}, status=status.HTTP_200_OK)


@method_decorator(cache_page(get_timeout('class_list')), name='get')
class ClassListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        return SchoolClass.objects.all()

    def get_serializer_class(self):
        from .serializers import ClassSerializer
        return ClassSerializer


class ClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    
    def get_queryset(self):
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        return SchoolClass.objects.all()
    
    def get_serializer_class(self):
        from .serializers import ClassSerializer
        return ClassSerializer


class ParentDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        from services.education.students.models import Student
        try:
            student = Student.objects.get(email=user.email)
            data = {
                'is_student': True,
                'student_name': student.full_name,
                'class': student.current_class.name if student.current_class else None,
                'section': student.current_section.name if student.current_section else None,
                'student_id': student.student_id,
                'attendance_percentage': 85,
                'gpa': 3.8,
            }
            return Response(data)
        except Student.DoesNotExist:
            pass
        
        if hasattr(user, 'parent_profile'):
            parent = user.parent_profile
            students = parent.linked_students.all()
            
            data = {
                'is_student': False,
                'parent_name': user.full_name or user.email,
                'children_count': students.count(),
                'students': [
                    {
                        'id': str(s.id),
                        'name': s.full_name,
                        'class': s.current_class.name if s.current_class else None,
                        'attendance_percentage': 85,
                        'fee_status': 'paid'
                    }
                    for s in students
                ]
            }
            return Response(data)
        
        return Response({'error': 'No profile found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def select_options(request, option_type):
    """Cached dropdown options (classes, sections, subjects, academic_years) — TTL 1 day."""
    data = get_dropdown_options(option_type)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(timeout=get_timeout('student_list'), cache_type='student_list')
def student_list(request):
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    from .serializers import StudentSerializer
    students = Student.objects.filter(is_active=True)
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_count(request):
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    count = Student.objects.filter(is_active=True).count()
    return Response({'count': count})


# ============================================================
# ATTENDANCE VIEWS (FIXED)
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance(request):
    """Get attendance records with proper debugging and filtering"""
    date = request.GET.get('date')
    student_id = request.GET.get('student_id')
    
    from django.apps import apps
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    
    if student_id:
        from services.education.attendance.services import serialize_attendance_record

        attendance = (
            Attendance.objects.filter(student_id=student_id)
            .select_related('student', 'marked_by')
            .order_by('-date')
        )
        return Response([serialize_attendance_record(r) for r in attendance])
    
    elif date:
        from services.education.attendance.services import ensure_defaults_for_date, _students_queryset
        from services.education.attendance.calendar import parse_attendance_date

        query_date = parse_attendance_date(date)
        class_id = request.GET.get('class_id')
        section_id = request.GET.get('section_id')
        
        # Debug logging
        logger.info(f"ATTENDANCE QUERY - Date: {query_date}, Class: {class_id}, Section: {section_id}")
        
        # Get students for this class/section
        if class_id or section_id:
            student_ids = list(
                _students_queryset(class_id, section_id).values_list('id', flat=True)
            )
            logger.info(f"Found {len(student_ids)} students for class={class_id}, section={section_id}")
        else:
            student_ids = None
            logger.info("No class/section filter applied")
        
        # Ensure default attendance records exist
        ensure_defaults_for_date(query_date, class_id=class_id, section_id=section_id)
        
        # Get attendance records
        attendance = Attendance.objects.filter(date=query_date)
        if student_ids is not None:
            attendance = attendance.filter(student_id__in=student_ids)
            logger.info(f"Filtered attendance to {attendance.count()} records")
        
        # FIX: Keep actual saved attendance records.
        # Do not overwrite/filter records on holidays.
        logger.info("Returning actual saved attendance records")
        
    else:
        return Response({'error': 'Date or student_id required'}, status=400)
    
    from services.education.attendance.services import serialize_attendance_record

    attendance = attendance.select_related('student', 'marked_by').order_by('student__full_name')
    serialized_data = [serialize_attendance_record(r) for r in attendance]
    
    return Response(serialized_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_attendance(request):
    from services.education.attendance.services import bulk_save_attendance_records

    records = request.data.get('records', [])
    logger.info(f"Bulk attendance save - {len(records)} records received")
    
    result = bulk_save_attendance_records(request.user, records)
    
    if result.get('forbidden'):
        logger.warning(f"Bulk attendance forbidden: {result.get('error')}")
        return Response({'error': result['error']}, status=status.HTTP_403_FORBIDDEN)
    
    logger.info(f"Bulk attendance result - created: {result.get('created')}, updated: {result.get('updated')}")
    
    return Response(
        {
            'success': True,
            'message': result['message'],
            'created': result['created'],
            'updated': result['updated'],
            'errors': result['errors'],
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_stats(request):
    student_id = request.GET.get('student_id')
    class_id = request.GET.get('class_id')
    
    from django.apps import apps
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    Student = apps.get_model('education_students', 'Student')
    
    if student_id:
        try:
            student = Student.objects.get(id=student_id)
            total = Attendance.objects.filter(student=student).count()
            present = Attendance.objects.filter(student=student, status='present').count()
            
            stats = {
                'student_name': student.full_name,
                'student_id': student.student_id,
                'total_days': total,
                'present_days': present,
                'percentage': round((present / total * 100) if total > 0 else 0, 1)
            }
            return Response(stats)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
    
    if class_id:
        students = Student.objects.filter(current_class_id=class_id, is_active=True)
        stats = []
        for student in students:
            total = Attendance.objects.filter(student=student).count()
            present = Attendance.objects.filter(student=student, status='present').count()
            stats.append({
                'student_id': str(student.id),
                'student_name': student.full_name,
                'percentage': round((present / total * 100) if total > 0 else 0, 1)
            })
        return Response(stats)
    
    return Response({'error': 'student_id or class_id required'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_attendance(request, student_id):
    from django.apps import apps
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    
    year = request.GET.get('year')
    month = request.GET.get('month')
    
    from services.education.attendance.services import serialize_attendance_record

    attendance_records = (
        Attendance.objects.filter(student_id=student_id)
        .select_related('student', 'marked_by')
        .order_by('-date')
    )
    
    if year and month:
        attendance_records = attendance_records.filter(date__year=year, date__month=month)
    
    logger.info(f"Student attendance history - Student: {student_id}, Records: {attendance_records.count()}")
    
    return Response([serialize_attendance_record(r) for r in attendance_records])


# ============================================================
# PDF GENERATION
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_result_card(request, student_id):
    from services.pdf.pdf_generator import PDFGenerator
    
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    
    try:
        student = Student.objects.get(id=student_id)
        generator = PDFGenerator()
        pdf_buffer = generator.generate_result_card(student, [], None)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="result_card_{student.student_id}.pdf"'
        return response
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except Exception as e:
        logger.error(f"Error generating result card: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_fee_receipt(request, invoice_id):
    from services.pdf.pdf_generator import PDFGenerator
    
    try:
        generator = PDFGenerator()
        pdf_buffer = generator.generate_fee_receipt(None, None, [])
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fee_receipt_{invoice_id}.pdf"'
        return response
    except Exception as e:
        logger.error(f"Error generating fee receipt: {str(e)}")
        return Response({'error': str(e)}, status=500)


# ============================================================
# TEACHER PROFILE
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_teacher_profile(request):
    from django.apps import apps
    Teacher = apps.get_model('education_academics', 'Teacher')
    
    user = request.user
    teacher = Teacher.objects.filter(email=user.email).first()
    
    if teacher:
        return Response({
            'id': str(teacher.id),
            'full_name': teacher.full_name,
            'email': teacher.email,
            'employee_id': teacher.employee_id
        })
    return Response({'error': 'Teacher profile not found'}, status=404)


# ============================================================
# ANALYTICS & INSIGHTS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def attendance_trends(request):
    from django.apps import apps
    from datetime import datetime, timedelta
    
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    trends = []
    current_date = datetime.now()
    
    for i in range(5, -1, -1):
        month_date = current_date - timedelta(days=30*i)
        month_name = month_date.strftime('%b')
        month_start = month_date.replace(day=1)
        if month_date.month == 12:
            next_month = month_date.replace(year=month_date.year+1, month=1, day=1)
        else:
            next_month = month_date.replace(month=month_date.month+1, day=1)
        
        records = Attendance.objects.filter(date__gte=month_start, date__lt=next_month)
        total = records.count()
        present = records.filter(status='present').count()
        percentage = round((present / total * 100) if total > 0 else 0, 1)
        trends.append({'month': month_name, 'present': present, 'percentage': percentage})
    
    return Response(trends)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def fee_trends(request):
    from django.apps import apps
    from datetime import datetime, timedelta
    
    Invoice = apps.get_model('education_finance', 'Invoice')
    trends = []
    current_date = datetime.now()
    
    for i in range(5, -1, -1):
        month_date = current_date - timedelta(days=30*i)
        month_name = month_date.strftime('%b')
        month_start = month_date.replace(day=1)
        if month_date.month == 12:
            next_month = month_date.replace(year=month_date.year+1, month=1, day=1)
        else:
            next_month = month_date.replace(month=month_date.month+1, day=1)
        
        invoices = Invoice.objects.filter(created_at__date__gte=month_start, created_at__date__lt=next_month)
        collected = sum(float(inv.paid_amount or 0) for inv in invoices)
        pending = sum(float(inv.total_amount or 0) - float(inv.paid_amount or 0) for inv in invoices)
        trends.append({'month': month_name, 'collected': collected, 'pending': pending})
    
    return Response(trends)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def at_risk_students(request):
    from django.apps import apps
    
    Student = apps.get_model('education_students', 'Student')
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    risk_students = []
    
    for student in Student.objects.filter(is_active=True):
        attendance_records = Attendance.objects.filter(student=student)
        total = attendance_records.count()
        if total > 0:
            present = attendance_records.filter(status='present').count()
            pct = round((present / total * 100), 1)
            
            if pct < 75:
                risk_students.append({
                    'id': str(student.id),
                    'name': student.full_name,
                    'student_id': student.student_id,
                    'class': student.current_class.name if student.current_class else 'N/A',
                    'risk_level': 'high' if pct < 60 else 'medium',
                    'reason': f'Low attendance: {pct}%',
                    'attendance_percentage': pct
                })
    
    return Response(risk_students[:20])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def ai_insights(request):
    from django.apps import apps
    from datetime import datetime, timedelta
    
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    Student = apps.get_model('education_students', 'Student')
    Invoice = apps.get_model('education_finance', 'Invoice')
    
    insights = []
    
    # Attendance insights
    recent = Attendance.objects.filter(date__gte=datetime.now() - timedelta(days=30))
    total = recent.count()
    present = recent.filter(status='present').count()
    overall = round((present / total * 100) if total > 0 else 0, 1)
    
    insights.append({
        'type': 'attendance',
        'title': 'Attendance Overview',
        'message': f'Overall attendance rate is {overall}% for the last 30 days.',
        'priority': 'normal'
    })
    
    # Low attendance warning
    if overall < 75:
        insights.append({
            'type': 'warning',
            'title': 'Low Attendance Alert',
            'message': f'Attendance rate ({overall}%) is below the recommended 75% threshold.',
            'priority': 'high'
        })
    
    # Financial insights
    pending_invoices = Invoice.objects.filter(status__in=['issued', 'partial'])
    total_pending = sum((inv.total_amount - inv.paid_amount) for inv in pending_invoices if inv.total_amount and inv.paid_amount)
    if total_pending > 100000:
        insights.append({
            'type': 'financial',
            'title': 'High Pending Fees',
            'message': f'Total pending fees: ₹{total_pending:,.0f}. Consider sending reminders.',
            'priority': 'high'
        })
    
    return Response(insights)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def student_growth(request):
    from django.apps import apps
    from datetime import datetime, timedelta

    Student = apps.get_model('education_students', 'Student')
    growth = []
    current_date = datetime.now()
    previous_count = 0

    for i in range(5, -1, -1):
        month_date = current_date - timedelta(days=30*i)
        month_name = month_date.strftime('%b')

        count = Student.objects.filter(
            created_at__lte=month_date,
            is_active=True
        ).count()

        growth_rate = 0
        if previous_count > 0:
            growth_rate = round(((count - previous_count) / previous_count * 100), 1)

        growth.append({
            'month': month_name,
            'count': count,
            'growth': growth_rate
        })
        previous_count = count

    return Response(growth)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def teacher_performance(request):
    from django.apps import apps
    from django.db.models import Avg

    Teacher = apps.get_model('education_academics', 'Teacher')
    ExamResult = apps.get_model('education_exams', 'ExamResult')
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')

    performance = []

    for teacher in Teacher.objects.filter(is_active=True):
        assignments = teacher.subject_assignments.filter(is_active=True)
        subject_ids = [a.class_subject.subject.id for a in assignments]

        avg_score = 0
        if subject_ids:
            avg_result = ExamResult.objects.filter(
                exam__subject__id__in=subject_ids
            ).aggregate(Avg('percentage'))
            avg_score = round(avg_result['percentage__avg'] or 0, 1)

        class_ids = [a.class_subject.class_ref.id for a in assignments]
        attendance_rate = 0
        if class_ids:
            attendance_records = Attendance.objects.filter(
                student__current_class__id__in=class_ids
            )
            total = attendance_records.count()
            present = attendance_records.filter(status='present').count()
            attendance_rate = round((present / total * 100) if total > 0 else 0, 1)

        performance.append({
            'id': str(teacher.id),
            'name': teacher.full_name,
            'subject_count': len(set(subject_ids)),
            'avg_student_score': avg_score,
            'attendance_rate': attendance_rate,
            'class_count': len(set(class_ids))
        })

    performance.sort(key=lambda x: x['avg_student_score'], reverse=True)
    return Response(performance[:10])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='dashboard')
def executive_dashboard(request):
    """Get executive dashboard data with real metrics"""
    try:
        from django.apps import apps
        from django.db.models import Sum, Count, Avg, Q
        from datetime import datetime, timedelta
        from django.conf import settings
        
        Student = apps.get_model('education_students', 'Student')
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        Invoice = apps.get_model('education_finance', 'Invoice')
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        Teacher = apps.get_model('education_academics', 'Teacher')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        
        # Student Growth (last 6 months)
        monthly_growth = []
        current_date = datetime.now()
        for i in range(5, -1, -1):
            month_date = current_date - timedelta(days=30*i)
            month_name = month_date.strftime('%b')
            count = Student.objects.filter(created_at__lte=month_date, is_active=True).count()
            monthly_growth.append({'month': month_name, 'student_count': count})
        
        current_total = Student.objects.filter(is_active=True).count()
        prev_total = monthly_growth[-2]['student_count'] if len(monthly_growth) > 1 else current_total
        growth_rate = round(((current_total - prev_total) / prev_total * 100) if prev_total > 0 else 0, 1)
    
        # Attendance Trends
        last_week = Attendance.objects.filter(date__gte=datetime.now() - timedelta(days=7))
        week_before = Attendance.objects.filter(date__range=[datetime.now() - timedelta(days=14), datetime.now() - timedelta(days=7)])
        
        this_week_total = last_week.count()
        this_week_present = last_week.filter(status='present').count()
        last_week_total = week_before.count()
        last_week_present = week_before.filter(status='present').count()
        
        this_week_rate = round((this_week_present / this_week_total * 100) if this_week_total > 0 else 0, 1)
        last_week_rate = round((last_week_present / last_week_total * 100) if last_week_total > 0 else 0, 1)
        attendance_trend = round(((this_week_rate - last_week_rate) / last_week_rate * 100) if last_week_rate > 0 else 0, 1)
    
        # Revenue Trends (last 6 months)
        revenue_data = []
        for i in range(5, -1, -1):
            month_date = current_date - timedelta(days=30*i)
            month_start = month_date.replace(day=1)
            if month_date.month == 12:
                next_month = month_date.replace(year=month_date.year+1, month=1, day=1)
            else:
                next_month = month_date.replace(month=month_date.month+1, day=1)
            
            invoices = Invoice.objects.filter(created_at__date__gte=month_start, created_at__date__lt=next_month)
            revenue = sum(inv.paid_amount or 0 for inv in invoices)
            revenue_data.append({'month': month_date.strftime('%b'), 'revenue': revenue})
        
        current_month_revenue = revenue_data[-1]['revenue'] if revenue_data else 0
        last_month_revenue = revenue_data[-2]['revenue'] if len(revenue_data) > 1 else 0
        revenue_trend = round(((current_month_revenue - last_month_revenue) / last_month_revenue * 100) if last_month_revenue > 0 else 0, 1)
    
        # Fee Recovery by Class
        class_recovery = []
        classes = SchoolClass.objects.all()
        for cls in classes:
            invoices = Invoice.objects.filter(student__current_class=cls)
            total_amount = sum(inv.total_amount or 0 for inv in invoices)
            paid_amount = sum(inv.paid_amount or 0 for inv in invoices)
            recovery_rate = round((paid_amount / total_amount * 100) if total_amount > 0 else 0, 1)
            class_recovery.append({
                'class_name': cls.name,
                'total_invoices': invoices.count(),
                'total_amount': total_amount,
                'total_paid': paid_amount,
                'recovery_rate': recovery_rate
            })
        
        best_class = max(class_recovery, key=lambda x: x['recovery_rate']) if class_recovery else None
        worst_class = min(class_recovery, key=lambda x: x['recovery_rate']) if class_recovery else None
    
        # Exam Performance
        subject_performance = ExamResult.objects.values('exam__subject__name').annotate(
            avg_percentage=Avg('percentage')
        ).order_by('-avg_percentage')[:5]
        
        subject_perf_list = list(subject_performance)
        top_subject = subject_perf_list[0] if subject_perf_list else None
        lowest_subject = subject_perf_list[-1] if subject_perf_list else None
        
        # Teacher Metrics
        total_teachers = Teacher.objects.filter(is_active=True).count()
        active_assignments = sum(t.subject_assignments.filter(is_active=True).count() for t in Teacher.objects.all())
        avg_assignments = round(active_assignments / total_teachers, 1) if total_teachers > 0 else 0
        
        top_teachers = []
        for teacher in Teacher.objects.filter(is_active=True)[:3]:
            top_teachers.append({
                'teacher__full_name': teacher.full_name,
                'classes': teacher.subject_assignments.filter(is_active=True).count()
            })
    
        # Smart Insights
        smart_insights = []
        
        # Low attendance alert
        low_attendance_students = 0
        for student in Student.objects.filter(is_active=True):
            records = Attendance.objects.filter(student=student)
            total = records.count()
            if total > 0:
                present = records.filter(status='present').count()
                pct = round((present / total * 100), 1)
                if pct < 75:
                    low_attendance_students += 1
        
        if low_attendance_students > 0:
            smart_insights.append({
                'type': 'warning',
                'title': 'Low Attendance Alert',
                'description': f'{low_attendance_students} students have attendance below 75%.',
                'priority': 'high',
                'category': 'attendance'
            })
        
        # Pending fees alert
        pending_invoices = Invoice.objects.exclude(status='paid')
        pending_fees = sum((inv.total_amount - inv.paid_amount) for inv in pending_invoices if inv.total_amount and inv.paid_amount and inv.total_amount > inv.paid_amount)
        if pending_fees > 50000:
            smart_insights.append({
                'type': 'critical',
                'title': 'Pending Fees Alert',
                'description': f'Total pending fees: ₹{pending_fees:,.0f}',
                'priority': 'high',
                'category': 'finance'
            })
        
        # Teacher shortage
        if total_teachers < 10:
            smart_insights.append({
                'type': 'alert',
                'title': 'Teacher Shortage',
                'description': f'Only {total_teachers} teachers available.',
                'priority': 'medium',
                'category': 'staff'
            })
        
        return Response({
            'revenue_trends': {
                'monthly_data': revenue_data,
                'current_month': current_month_revenue,
                'last_month': last_month_revenue,
                'trend_percentage': abs(revenue_trend),
                'trend_direction': 'up' if revenue_trend >= 0 else 'down'
            },
            'attendance_trends': {
                'this_week_rate': this_week_rate,
                'last_week_rate': last_week_rate,
                'trend_percentage': abs(attendance_trend),
                'trend_direction': 'up' if attendance_trend >= 0 else 'down',
                'this_week_total': this_week_total,
                'last_week_total': last_week_total
            },
            'fee_recovery_trends': {
                'class_recovery': class_recovery,
                'worst_performing_class': worst_class,
                'best_performing_class': best_class
            },
            'student_growth': {
                'monthly_growth': monthly_growth,
                'current_total': current_total,
                'growth_rate': abs(growth_rate),
                'growth_direction': 'up' if growth_rate >= 0 else 'down'
            },
            'exam_performance_trends': {
                'subject_performance': list(subject_performance),
                'class_performance': [],
                'top_performing_subject': top_subject,
                'lowest_performing_subject': lowest_subject
            },
            'teacher_metrics': {
                'total_teachers': total_teachers,
                'active_teacher_assignments': active_assignments,
                'average_assignments_per_teacher': avg_assignments,
                'top_teachers_by_assignments': top_teachers
            },
            'smart_insights': smart_insights,
            'generated_at': datetime.now().isoformat()
        })
    except Exception as e:
        import traceback
        error_details = {
            'error': str(e),
            'traceback': traceback.format_exc(),
            'type': type(e).__name__
        }
        logger.error(f"Executive Dashboard Error: {error_details}")
        return Response({
            'error': 'Internal server error occurred while generating dashboard data',
            'details': str(e) if settings.DEBUG else 'Please contact administrator'
        }, status=500)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_attendance_working(request):
    """Simple working bulk attendance save"""
    from django.apps import apps
    
    data = request.data
    records = data.get("records", [])
    
    if not records:
        return Response({"error": "No records provided"}, status=400)
    
    Attendance = apps.get_model("education_attendance", "AttendanceRecord")
    Student = apps.get_model("education_students", "Student")
    
    created = 0
    updated = 0
    errors = []
    
    for record in records:
        student_id = record.get("student_id")
        date = record.get("date")
        status_val = record.get("status")
        
        if not student_id or not date or not status_val:
            errors.append({"error": "Missing fields", "record": record})
            continue
        
        try:
            student = Student.objects.filter(student_id=student_id).first()
            if not student:
                student = Student.objects.filter(id=student_id).first()
            
            if not student:
                errors.append({"error": f"Student not found: {student_id}", "record": record})
                continue
            
            attendance, is_new = Attendance.objects.update_or_create(
                student=student,
                date=date,
                defaults={"status": status_val}
            )
            
            if is_new:
                created += 1
            else:
                updated += 1
                
        except Exception as e:
            errors.append({"error": str(e), "record": record})
    
    return Response({
        "success": True,
        "message": f"Attendance saved: {created} created, {updated} updated",
        "created": created,
        "updated": updated,
        "errors": errors
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_attendance_working(request):
    from django.apps import apps
    from django.db import transaction
    
    data = request.data
    records = data.get('records', [])
    
    if not records:
        return Response({'error': 'No records provided'}, status=400)
    
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    Student = apps.get_model('education_students', 'Student')
    
    created = 0
    updated = 0
    errors = []
    
    for record in records:
        student_id = record.get('student_id')
        date = record.get('date')
        status_val = record.get('status')
        
        if not student_id or not date or not status_val:
            errors.append({'error': 'Missing fields', 'record': record})
            continue
        
        try:
            student = Student.objects.filter(student_id=student_id).first()
            if not student:
                student = Student.objects.filter(id=student_id).first()
            
            if not student:
                errors.append({'error': "Student not found: ", 'record': record})
                continue
            
            attendance, is_new = Attendance.objects.update_or_create(
                student=student,
                date=date,
                defaults={'status': status_val}
            )
            
            if is_new:
                created += 1
            else:
                updated += 1
                
        except Exception as e:
            errors.append({'error': str(e), 'record': record})
    
    return Response({
        'success': True,
        'message': f'Attendance saved: {created} created, {updated} updated',
        'created': created,
        'updated': updated,
        'errors': errors
    })
