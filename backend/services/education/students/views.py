from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.apps import apps
from django.db.models import Avg
from django.shortcuts import get_object_or_404

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_360(request, student_id):
    """Get complete student 360° dashboard data"""
    try:
        Student = apps.get_model('education_students', 'Student')
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        Invoice = apps.get_model('education_finance', 'Invoice')
        
        student = get_object_or_404(Student, id=student_id)
        
        # Student Basic Info
        student_data = {
            'id': str(student.id),
            'student_id': student.student_id,
            'full_name': student.full_name,
            'email': student.email,
            'phone': student.phone or '',
            'father_name': student.father_name or '',
            'mother_name': student.mother_name or '',
            'guardian_phone': student.guardian_phone or '',
            'program': student.program or '',
            'enrollment_date': str(student.enrollment_date) if student.enrollment_date else None,
            'is_active': student.is_active,
            'current_class': student.current_class.name if student.current_class else None,
            'current_section': student.current_section.name if student.current_section else None,
        }
        
        # Attendance Summary
        attendance_records = Attendance.objects.filter(student=student)
        total = attendance_records.count()
        present = attendance_records.filter(status='present').count()
        absent = attendance_records.filter(status='absent').count()
        late = attendance_records.filter(status='late').count()
        attendance_rate = round((present / total * 100), 1) if total > 0 else 0
        
        attendance_data = {
            'total_days': total,
            'present': present,
            'absent': absent,
            'late': late,
            'attendance_rate': attendance_rate,
            'recent_records': [
                {'date': str(r.date), 'status': r.status, 'status_display': r.get_status_display()}
                for r in attendance_records.order_by('-date')[:10]
            ]
        }
        
        # Exam Results
        exam_results = ExamResult.objects.filter(student=student)
        total_exams = exam_results.count()
        passed = exam_results.filter(is_pass=True).count()
        avg_percentage = exam_results.aggregate(Avg('percentage'))['percentage__avg'] or 0
        
        exams_data = {
            'total_exams': total_exams,
            'passed': passed,
            'failed': total_exams - passed,
            'average_percentage': round(avg_percentage, 1),
            'results': [
                {
                    'exam_title': r.exam.title,
                    'exam_code': r.exam.code,
                    'marks': f"{r.obtained_marks}/{r.total_marks}",
                    'percentage': r.percentage,
                    'grade': r.grade,
                    'status': 'Pass' if r.is_pass else 'Fail'
                }
                for r in exam_results.order_by('-entered_at')[:10]
            ]
        }
        
        # Finance Summary
        invoices = Invoice.objects.filter(student=student)
        total_amount = sum(float(i.amount) for i in invoices)
        total_paid = sum(float(i.paid_amount) for i in invoices)
        balance_due = total_amount - total_paid
        
        finance_data = {
            'total_invoices': invoices.count(),
            'total_amount': round(total_amount, 2),
            'total_paid': round(total_paid, 2),
            'balance_due': round(balance_due, 2),
            'payment_percentage': round((total_paid / total_amount * 100), 1) if total_amount > 0 else 0,
            'pending_invoices': [
                {
                    'invoice_number': inv.invoice_number,
                    'amount': float(inv.amount),
                    'balance': float(inv.amount) - float(inv.paid_amount),
                    'due_date': str(inv.due_date),
                    'status': inv.status
                }
                for inv in invoices.filter(status__in=['pending', 'overdue'])
            ]
        }
        
        # Performance Summary
        performance_summary = {
            'attendance_grade': 'Good' if attendance_rate >= 80 else 'Average' if attendance_rate >= 60 else 'Poor',
            'academic_grade': 'Excellent' if avg_percentage >= 80 else 'Good' if avg_percentage >= 60 else 'Needs Improvement',
            'overall_status': 'On Track' if attendance_rate >= 75 and avg_percentage >= 60 else 'Needs Attention'
        }
        
        return Response({
            'student': student_data,
            'attendance': attendance_data,
            'exams': exams_data,
            'finance': finance_data,
            'performance_summary': performance_summary
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

