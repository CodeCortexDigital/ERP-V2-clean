from django.apps import apps
from django.db.models import Sum, Count, Avg

def get_student_complete_data(student_id):
    """Get complete student data from all modules"""
    Student = apps.get_model('education_students', 'Student')
    
    try:
        student = Student.objects.get(id=student_id)
        
        # Get Attendance
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        attendance_records = Attendance.objects.filter(student=student)
        attendance_summary = {
            'total': attendance_records.count(),
            'present': attendance_records.filter(status='present').count(),
            'absent': attendance_records.filter(status='absent').count(),
            'late': attendance_records.filter(status='late').count(),
        }
        if attendance_summary['total'] > 0:
            attendance_summary['rate'] = round((attendance_summary['present'] / attendance_summary['total']) * 100, 1)
        else:
            attendance_summary['rate'] = 0
        
        # Get Exam Results
        ExamResult = apps.get_model('education_exams', 'ExamResult')
        exam_results = ExamResult.objects.filter(student=student)
        exam_summary = {
            'total': exam_results.count(),
            'passed': exam_results.filter(is_pass=True).count(),
            'avg_percentage': exam_results.aggregate(Avg('percentage'))['percentage__avg'] or 0,
            'results': [
                {
                    'exam': r.exam.title,
                    'marks': f"{r.obtained_marks}/{r.total_marks}",
                    'percentage': r.percentage,
                    'grade': r.grade,
                    'status': 'Pass' if r.is_pass else 'Fail'
                } for r in exam_results
            ]
        }
        
        # Get Finance
        Invoice = apps.get_model('education_finance', 'Invoice')
        invoices = Invoice.objects.filter(student=student)
        finance_summary = {
            'total_invoices': invoices.count(),
            'total_amount': sum(float(i.amount) for i in invoices),
            'total_paid': sum(float(i.paid_amount) for i in invoices),
            'balance_due': sum(float(i.amount) - float(i.paid_amount) for i in invoices),
            'overdue': invoices.filter(status='overdue').count()
        }
        
        # Get Communications
        Message = apps.get_model('education_communication', 'Message')
        messages = Message.objects.filter(recipient=student.full_name)[:10]
        
        # Get Class/Section info
        class_info = {
            'class_name': student.current_class.name if student.current_class else None,
            'section_name': student.current_section.name if student.current_section else None,
            'academic_year': student.current_academic_year.name if student.current_academic_year else None,
            'program': student.program
        }
        
        return {
            'student': student,
            'attendance': attendance_summary,
            'exams': exam_summary,
            'finance': finance_summary,
            'messages': [{'title': m.subject, 'message': m.message[:100], 'date': m.created_at} for m in messages],
            'class_info': class_info
        }
    except Exception as e:
        return {'error': str(e)}
