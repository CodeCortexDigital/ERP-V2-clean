from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.apps import apps

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_dashboard(request, student_id):
    """Get complete student 360 view with all related data"""
    try:
        Student = apps.get_model('education_students', 'Student')
        student = Student.objects.get(id=student_id)
        
        # Get Attendance Records
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        attendance_records = Attendance.objects.filter(student_id=student_id)
        
        attendance_summary = {
            'total': attendance_records.count(),
            'present': attendance_records.filter(status='present').count(),
            'absent': attendance_records.filter(status='absent').count(),
            'late': attendance_records.filter(status='late').count(),
            'attendance_rate': 0
        }
        if attendance_summary['total'] > 0:
            attendance_summary['attendance_rate'] = round(
                (attendance_summary['present'] / attendance_summary['total']) * 100, 1
            )
        
        # Get Exam Results
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        exam_results = ExamResult.objects.filter(student_id=student_id)
        exam_summary = {
            'total_exams': exam_results.count(),
            'passed': exam_results.filter(is_pass=True).count(),
            'average_percentage': 0,
            'results': []
        }
        
        if exam_results.exists():
            avg = exam_results.aggregate(avg_percentage=models.Avg('percentage'))['avg_percentage']
            exam_summary['average_percentage'] = round(avg, 1) if avg else 0
            
            for result in exam_results[:5]:
                exam_summary['results'].append({
                    'exam_title': result.exam.title if result.exam else 'N/A',
                    'marks': f"{result.obtained_marks}/{result.total_marks}",
                    'percentage': result.percentage,
                    'grade': result.grade,
                    'status': 'Pass' if result.is_pass else 'Fail'
                })
        
        # Get Fee/Financial Status
        Invoice = apps.get_model('education_finance', 'Invoice')
        Payment = apps.get_model('education_finance', 'Payment')
        invoices = Invoice.objects.filter(student_id=student_id)
        
        total_amount = sum(float(inv.amount) for inv in invoices)
        total_paid = sum(float(inv.paid_amount) for inv in invoices)
        
        fee_summary = {
            'total_invoices': invoices.count(),
            'total_amount': total_amount,
            'total_paid': total_paid,
            'balance_due': total_amount - total_paid,
            'overdue': invoices.filter(status='overdue').count()
        }
        
        # Get Notifications
        Notification = apps.get_model('education_communication', 'Notification')
        notifications = Notification.objects.filter(recipient_id=student_id, is_sent=True)[:10]
        
        # Build complete response
        response_data = {
            'student': {
                'id': str(student.id),
                'student_id': student.student_id,
                'full_name': student.full_name,
                'email': student.email,
                'phone': student.phone,
                'father_name': getattr(student, 'father_name', ''),
                'mother_name': getattr(student, 'mother_name', ''),
                'guardian_phone': getattr(student, 'guardian_phone', ''),
                'enrollment_date': getattr(student, 'enrollment_date', None),
                'program': getattr(student, 'program', ''),
                'current_semester': getattr(student, 'current_semester', 1),
                'is_active': student.is_active
            },
            'attendance': attendance_summary,
            'exams': exam_summary,
            'finance': fee_summary,
            'recent_notifications': [
                {'title': n.title, 'message': n.message[:100], 'sent_at': n.sent_at}
                for n in notifications
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

from django.apps import apps
from django.db.models import Avg, Sum
from decimal import Decimal

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_360(request, student_id):
    """Complete student overview - Attendance, Exams, Fees, Alerts, Communications"""
    try:
        Student = apps.get_model('education_students', 'Student')
        student = Student.objects.get(id=student_id)
        
        # 1. Attendance Overview
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        attendance_records = Attendance.objects.filter(student=student)
        total_attendance = attendance_records.count()
        present = attendance_records.filter(status='present').count()
        attendance_rate = round((present / total_attendance * 100), 1) if total_attendance > 0 else 0
        
        # Attendance trend (last 30 days)
        from datetime import timedelta
        from django.utils import timezone
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        recent_attendance = attendance_records.filter(date__gte=thirty_days_ago)
        recent_present = recent_attendance.filter(status='present').count()
        recent_rate = round((recent_present / recent_attendance.count() * 100), 1) if recent_attendance.count() > 0 else 0
        
        # 2. Exams Overview
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        exam_results = ExamResult.objects.filter(student=student)
        total_exams = exam_results.count()
        passed = exam_results.filter(is_pass=True).count()
        avg_percentage = exam_results.aggregate(Avg('percentage'))['percentage__avg'] or 0
        
        # Recent exam results
        recent_results = [
            {
                'exam': r.exam.title,
                'subject': r.exam.course_name or 'General',
                'marks': f"{r.obtained_marks}/{r.total_marks}",
                'percentage': r.percentage,
                'grade': r.grade,
                'status': 'Pass' if r.is_pass else 'Fail',
                'date': r.entered_at.date()
            }
            for r in exam_results.order_by('-entered_at')[:5]
        ]
        
        # 3. Finance Overview
        Invoice = apps.get_model('education_finance', 'Invoice')
        invoices = Invoice.objects.filter(student=student)
        total_fees = sum(float(i.amount) for i in invoices)
        paid_fees = sum(float(i.paid_amount) for i in invoices)
        balance = total_fees - paid_fees
        
        # Pending/Overdue invoices
        pending_invoices = [
            {
                'invoice_number': inv.invoice_number,
                'amount': float(inv.amount),
                'due_date': inv.due_date,
                'balance': float(inv.amount) - float(inv.paid_amount),
                'status': inv.status
            }
            for inv in invoices.filter(status__in=['pending', 'overdue'])
        ]
        
        # 4. Alerts & Risks
        from services.analytics.engine import InsightsEngine
        engine = InsightsEngine(student)
        risk_data = engine.calculate_risk_score()
        recommendations = engine.generate_recommendations(risk_data)
        
        # 5. Communications
        Message = apps.get_model('education_communication', 'Message')
        recent_messages = [
            {
                'title': msg.subject,
                'message': msg.message[:150],
                'date': msg.created_at,
                'channel': msg.channel
            }
            for msg in Message.objects.filter(recipient=student.full_name).order_by('-created_at')[:10]
        ]
        
        # 6. Academic Info
        class_info = {
            'class_name': student.current_class.name if student.current_class else None,
            'section': student.current_section.name if student.current_section else None,
            'academic_year': student.current_academic_year.name if student.current_academic_year else None,
            'program': student.program,
            'enrollment_date': student.enrollment_date
        }
        
        # Build complete response
        response_data = {
            'student': {
                'id': str(student.id),
                'student_id': student.student_id,
                'name': student.full_name,
                'email': student.email,
                'phone': student.phone,
                'guardian_phone': student.guardian_phone,
                'father_name': student.father_name,
                'mother_name': student.mother_name,
                'is_active': student.is_active
            },
            'academic_info': class_info,
            'attendance': {
                'total_days': total_attendance,
                'present': present,
                'absent': total_attendance - present,
                'attendance_rate': attendance_rate,
                'last_30_days_rate': recent_rate,
                'recent_records': [
                    {'date': r.date, 'status': r.status}
                    for r in attendance_records.order_by('-date')[:10]
                ]
            },
            'exams': {
                'total_exams': total_exams,
                'passed': passed,
                'failed': total_exams - passed,
                'average_percentage': round(avg_percentage, 1),
                'recent_results': recent_results
            },
            'finance': {
                'total_fees': total_fees,
                'paid': paid_fees,
                'balance': balance,
                'payment_percentage': round((paid_fees / total_fees * 100), 1) if total_fees > 0 else 0,
                'pending_invoices': pending_invoices
            },
            'alerts': {
                'risk_level': risk_data['level'],
                'risk_score': risk_data['score'],
                'risk_factors': risk_data['factors'],
                'recommendations': recommendations
            },
            'communications': {
                'recent_messages': recent_messages,
                'total_messages': len(recent_messages)
            }
        }
        
        return Response(response_data, status=200)
        
    except Exception as e:
        return Response({'error': str(e)}, status=404)
