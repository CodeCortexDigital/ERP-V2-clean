from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.apps import apps
from django.db.models import Avg, Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return JsonResponse({"status": "ok", "message": "Server is running"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_360(request, student_id):
    """Complete student overview"""
    try:
        Student = apps.get_model('education_students', 'Student')
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        Invoice = apps.get_model('education_finance', 'Invoice')
        Payment = apps.get_model('education_finance', 'Payment')
        
        student = Student.objects.get(id=student_id)
        
        # Calculate attendance percentage
        attendance_records = Attendance.objects.filter(student=student)
        total_attendance = attendance_records.count()
        present_attendance = attendance_records.filter(status='present').count()
        attendance_percentage = round((present_attendance / total_attendance * 100), 1) if total_attendance > 0 else 0
        
        # Get recent attendance
        recent_attendance = []
        for record in attendance_records.order_by('-date')[:10]:
            recent_attendance.append({
                'date': record.date.strftime('%Y-%m-%d'),
                'status': record.status
            })
        
        # Calculate exam average
        exam_results = ExamResult.objects.filter(student=student)
        total_exams = exam_results.count()
        passed_exams = exam_results.filter(is_pass=True).count()
        avg_percentage = exam_results.aggregate(Avg('percentage'))['percentage__avg'] or 0
        
        recent_results = []
        for result in exam_results.order_by('-entered_at')[:5]:
            recent_results.append({
                'exam_title': result.exam.title,
                'marks': f"{result.obtained_marks}/{result.total_marks}",
                'percentage': result.percentage,
                'grade': result.grade,
                'status': 'Pass' if result.is_pass else 'Fail'
            })
        
        # Calculate finance
        invoices = Invoice.objects.filter(student=student)
        total_fees = sum(float(i.amount) for i in invoices)
        paid_fees = sum(float(i.paid_amount) for i in invoices)
        balance = total_fees - paid_fees
        payment_percentage = round((paid_fees / total_fees * 100), 1) if total_fees > 0 else 0
        
        # Get last payment
        last_payment = None
        last_payment_obj = Payment.objects.filter(invoice__student=student).order_by('-payment_date').first()
        if last_payment_obj:
            last_payment = {
                'amount': float(last_payment_obj.amount),
                'date': last_payment_obj.payment_date.strftime('%Y-%m-%d')
            }
        
        # Class info
        class_info = {
            'class_name': student.current_class.name if student.current_class else None,
            'section_name': student.current_section.name if student.current_section else None,
        }
        
        return Response({
            'student': {
                'id': str(student.id),
                'student_id': student.student_id,
                'full_name': student.full_name,
                'email': student.email,
                'phone': student.phone or '',
                'father_name': getattr(student, 'father_name', ''),
                'mother_name': getattr(student, 'mother_name', ''),
                'guardian_phone': getattr(student, 'guardian_phone', ''),
                'program': getattr(student, 'program', ''),
                'is_active': student.is_active
            },
            'attendance': {
                'total_days': total_attendance,
                'present': present_attendance,
                'absent': total_attendance - present_attendance,
                'attendance_rate': attendance_percentage,
                'recent_records': recent_attendance
            },
            'exams': {
                'total_exams': total_exams,
                'passed': passed_exams,
                'failed': total_exams - passed_exams,
                'average_percentage': round(avg_percentage, 1),
                'recent_results': recent_results
            },
            'finance': {
                'total_fees': round(total_fees, 2),
                'paid': round(paid_fees, 2),
                'balance': round(balance, 2),
                'payment_percentage': payment_percentage,
                'last_payment': last_payment
            },
            'class_info': class_info
        }, status=200)
        
    except Exception as e:
        return Response({'error': str(e)}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard_data(request, student_id):
    """Get dashboard data - single source of truth"""
    try:
        Student = apps.get_model('education_students', 'Student')
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        Invoice = apps.get_model('education_finance', 'Invoice')
        Payment = apps.get_model('education_finance', 'Payment')
        
        student = Student.objects.get(id=student_id)
        
        # Attendance calculation
        attendance_records = Attendance.objects.filter(student=student)
        total = attendance_records.count()
        present = attendance_records.filter(status='present').count()
        attendance_percentage = round((present / total * 100), 1) if total > 0 else 0
        
        # Attendance trend
        attendance_trend = []
        for i in range(6, -1, -1):
            week_start = timezone.now().date() - timedelta(days=i*7)
            week_end = week_start + timedelta(days=7)
            week_records = attendance_records.filter(date__gte=week_start, date__lt=week_end)
            week_total = week_records.count()
            week_present = week_records.filter(status='present').count()
            week_percentage = round((week_present / week_total * 100), 1) if week_total > 0 else 0
            attendance_trend.append(week_percentage)
        
        # Exam average
        exam_results = ExamResult.objects.filter(student=student)
        avg_percentage = exam_results.aggregate(Avg('percentage'))['percentage__avg'] or 0
        
        # Finance calculation
        invoices = Invoice.objects.filter(student=student)
        total_fees = sum(float(i.amount) for i in invoices)
        paid_fees = sum(float(i.paid_amount) for i in invoices)
        balance = total_fees - paid_fees
        
        # Fee status
        if balance <= 0:
            fee_status = 'paid'
        elif invoices.filter(status='overdue').exists():
            fee_status = 'overdue'
        elif invoices.filter(status='pending').exists():
            fee_status = 'pending'
        else:
            fee_status = 'partial'
        
        # Calculate priority
        if attendance_percentage < 70 or fee_status == 'overdue':
            priority = 'high'
        elif attendance_percentage < 85 or fee_status == 'pending':
            priority = 'medium'
        else:
            priority = 'low'
        
        # Last activities
        last_activities = []
        
        # Last payment
        last_payment = Payment.objects.filter(invoice__student=student).order_by('-payment_date').first()
        if last_payment:
            last_activities.append({
                'type': 'payment',
                'message': f'Fee payment received: Rs {last_payment.amount}',
                'time': last_payment.payment_date.isoformat()
            })
        
        # Last attendance
        last_attendance = attendance_records.order_by('-date').first()
        if last_attendance:
            last_activities.append({
                'type': 'attendance',
                'message': f'Marked {last_attendance.status}',
                'time': last_attendance.date.isoformat()
            })
        
        # Last exam
        last_exam = exam_results.order_by('-entered_at').first()
        if last_exam:
            last_activities.append({
                'type': 'exam',
                'message': f'Exam result: {last_exam.percentage}% ({last_exam.grade})',
                'time': last_exam.entered_at.isoformat()
            })
        
        return Response({
            'attendance_percentage': attendance_percentage,
            'attendance_trend': attendance_trend,
            'avg_marks': round(avg_percentage, 1),
            'balance': round(balance, 2),
            'total_fees': round(total_fees, 2),
            'paid_fees': round(paid_fees, 2),
            'fee_status': fee_status,
            'priority': priority,
            'last_activities': last_activities
        }, status=200)
        
    except Exception as e:
        return Response({'error': str(e)}, status=404)
