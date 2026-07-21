from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.apps import apps
from django.db.models import Avg, Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .engine import InsightsEngine
from .models import StudentRisk, Recommendation
from services.core.utils.cache import cached_api_view

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='analytics')
def student_insights(request, student_id):
    """Get AI-powered insights for a student"""
    try:
        Student = apps.get_model('education_students', 'Student')
        student = Student.objects.get(id=student_id)
        
        engine = InsightsEngine(student)
        
        # Calculate risk
        risk_data = engine.calculate_risk_score()
        
        # Generate recommendations
        recommendations = engine.generate_recommendations(risk_data)
        
        # Predict performance
        prediction = engine.predict_performance()
        
        # Save risk assessment
        risk_obj, created = StudentRisk.objects.update_or_create(
            student=student,
            defaults={
                'risk_level': risk_data['level'],
                'risk_score': risk_data['score'],
                'factors': risk_data['factors'],
                'recommendations': recommendations,
                'is_resolved': False
            }
        )
        
        return Response({
            'student': {
                'id': str(student.id),
                'name': student.full_name,
                'student_id': student.student_id
            },
            'risk_assessment': {
                'level': risk_data['level'],
                'score': risk_data['score'],
                'factors': risk_data['factors']
            },
            'academic_prediction': prediction,
            'recommendations': recommendations
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def batch_risk_assessment(request):
    """Run risk assessment for all students"""
    # 1. Trigger the new Machine Learning models (Isolation Forest + Random Forest)
    try:
        # Add ai-ml path dynamically
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ai_ml_path = os.path.abspath(os.path.join(BASE_DIR, '..', 'ai-ml'))
        if os.name == 'nt' and len(ai_ml_path) > 1 and ai_ml_path[1] == ':':
            ai_ml_path = ai_ml_path[0].upper() + ai_ml_path[1:]
        if ai_ml_path not in sys.path:
            sys.path.append(ai_ml_path)

        from predictions.performance_predictor import train_and_save_model, predict_student_performance
        from attendance.anomaly_detector import detect_anomalies
        
        train_and_save_model()
        predict_student_performance()
        detect_anomalies()
    except Exception as e:
        print(f"Warning: ML model execution failed: {e}")

    # 2. Run default heuristic engine calculations
    Student = apps.get_model('education_students', 'Student')
    students = Student.objects.filter(is_active=True)
    
    results = []
    for student in students:
        engine = InsightsEngine(student)
        risk_data = engine.calculate_risk_score()
        recommendations = engine.generate_recommendations(risk_data)
        
        StudentRisk.objects.update_or_create(
            student=student,
            defaults={
                'risk_level': risk_data['level'],
                'risk_score': risk_data['score'],
                'factors': risk_data['factors'],
                'recommendations': recommendations
            }
        )
        
        results.append({
            'student_id': student.student_id,
            'student_name': student.full_name,
            'risk_level': risk_data['level'],
            'risk_score': risk_data['score']
        })
    
    return Response({
        'total_analyzed': len(results),
        'results': results
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(cache_type='dashboard')
def executive_dashboard(request):
    """Get executive dashboard with smart insights and trends"""
    try:
        # Get current date and calculate periods
        today = timezone.now().date()
        this_week_start = today - timedelta(days=today.weekday())
        last_week_start = this_week_start - timedelta(days=7)
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)

        # Revenue Trends
        revenue_trends = _calculate_revenue_trends()

        # Attendance Trends
        attendance_trends = _calculate_attendance_trends()

        # Fee Recovery Trends
        fee_recovery_trends = _calculate_fee_recovery_trends()

        # Student Growth
        student_growth = _calculate_student_growth()

        # Exam Performance Trends
        exam_performance_trends = _calculate_exam_performance_trends()

        # Teacher Performance Metrics
        teacher_metrics = _calculate_teacher_performance()

        # Smart Insights/Alerts
        smart_insights = _generate_smart_insights(attendance_trends, fee_recovery_trends, exam_performance_trends)

        # Total expenses from LedgerEntry
        LedgerEntry = apps.get_model('education_finance', 'LedgerEntry')
        total_expenses = float(LedgerEntry.objects.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0)

        return Response({
            'revenue_trends': revenue_trends,
            'attendance_trends': attendance_trends,
            'fee_recovery_trends': fee_recovery_trends,
            'student_growth': student_growth,
            'exam_performance_trends': exam_performance_trends,
            'teacher_metrics': teacher_metrics,
            'smart_insights': smart_insights,
            'total_expenses': total_expenses,
            'generated_at': timezone.now().isoformat()
        })

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _calculate_revenue_trends():
    """Calculate revenue trends over time"""
    today = timezone.now().date()
    months = []

    for i in range(12):
        month_start = (today.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        # Get models
        Payment = apps.get_model('education_finance', 'Payment')

        revenue = Payment.objects.filter(
            payment_date__gte=month_start,
            payment_date__lte=month_end
        ).aggregate(total=Sum('amount'))['total'] or 0

        months.append({
            'month': month_start.strftime('%Y-%m'),
            'revenue': float(revenue),
            'month_name': month_start.strftime('%B %Y')
        })

    # Calculate trends
    current_month = months[0]['revenue']
    last_month = months[1]['revenue'] if len(months) > 1 else 0
    trend_percentage = ((current_month - last_month) / last_month * 100) if last_month > 0 else 0

    return {
        'monthly_data': months,
        'current_month': current_month,
        'last_month': last_month,
        'trend_percentage': round(trend_percentage, 1),
        'trend_direction': 'up' if trend_percentage > 0 else 'down' if trend_percentage < 0 else 'stable'
    }

def _calculate_attendance_trends():
    """Calculate attendance trends"""
    today = timezone.now().date()
    this_week_start = today - timedelta(days=today.weekday())
    last_week_start = this_week_start - timedelta(days=7)

    # Get models
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')

    # This week attendance
    this_week_attendance = AttendanceRecord.objects.filter(
        date__gte=this_week_start,
        date__lte=today
    ).aggregate(
        total=Count('id'),
        present=Count('id', filter=Q(status='present'))
    )

    # Last week attendance
    last_week_attendance = AttendanceRecord.objects.filter(
        date__gte=last_week_start,
        date__lt=this_week_start
    ).aggregate(
        total=Count('id'),
        present=Count('id', filter=Q(status='present'))
    )

    this_week_rate = (this_week_attendance['present'] / this_week_attendance['total'] * 100) if this_week_attendance['total'] > 0 else 0
    last_week_rate = (last_week_attendance['present'] / last_week_attendance['total'] * 100) if last_week_attendance['total'] > 0 else 0

    trend_percentage = this_week_rate - last_week_rate

    return {
        'this_week_rate': round(this_week_rate, 1),
        'last_week_rate': round(last_week_rate, 1),
        'trend_percentage': round(trend_percentage, 1),
        'trend_direction': 'up' if trend_percentage > 0 else 'down' if trend_percentage < 0 else 'stable',
        'this_week_total': this_week_attendance['total'],
        'last_week_total': last_week_attendance['total']
    }

def _calculate_fee_recovery_trends():
    """Calculate fee recovery trends by class"""
    Invoice = apps.get_model('education_finance', 'Invoice')

    class_data = Invoice.objects.filter(
        student__current_class__isnull=False
    ).values('student__current_class__name').annotate(
        total_invoices=Count('id'),
        total_amount=Sum('amount'),
        total_paid=Sum('paid_amount')
    ).order_by('student__current_class__name')

    recovery_data = []
    for data in class_data:
        recovery_rate = (data['total_paid'] / data['total_amount'] * 100) if data['total_amount'] and data['total_amount'] > 0 else 0
        recovery_data.append({
            'class_name': data['student__current_class__name'],
            'total_invoices': data['total_invoices'],
            'total_amount': float(data['total_amount'] or 0),
            'total_paid': float(data['total_paid'] or 0),
            'recovery_rate': round(recovery_rate, 1)
        })

    # Sort by recovery rate ascending (worst first)
    recovery_data.sort(key=lambda x: x['recovery_rate'])

    # Compute totals from ALL invoices (not just class-filtered)
    all_invoices = Invoice.objects.all()
    total_collected = all_invoices.aggregate(total=Sum('paid_amount'))['total'] or 0
    total_amount_all = all_invoices.aggregate(total=Sum('amount'))['total'] or 0
    total_pending = total_amount_all - total_collected

    return {
        'class_recovery': recovery_data,
        'total_collected': float(total_collected),
        'total_pending': float(total_pending),
        'worst_performing_class': recovery_data[0] if recovery_data else None,
        'best_performing_class': recovery_data[-1] if recovery_data else None
    }

def _calculate_student_growth():
    """Calculate student growth trends"""
    today = timezone.now().date()
    Student = apps.get_model('education_students', 'Student')

    # Get current total active students (for dashboard KPI)
    current_total = Student.objects.filter(is_active=True).count()

    # Monthly student count for last 12 months (based on admission dates where available)
    growth_data = []
    for i in range(12):
        month_end = today - timedelta(days=i*30)
        month_start = month_end.replace(day=1)

        # Count students admitted by this month end, or all active if no admission date
        admitted_count = Student.objects.filter(
            admission_date__lte=month_end,
            is_active=True
        ).count()
        
        # Also include students with no admission date (assume they were admitted)
        no_date_count = Student.objects.filter(
            admission_date__isnull=True,
            is_active=True
        ).count()
        
        total_count = admitted_count + no_date_count

        growth_data.append({
            'month': month_start.strftime('%Y-%m'),
            'student_count': total_count,
            'month_name': month_start.strftime('%B %Y')
        })

    # Calculate growth rate
    if len(growth_data) >= 2:
        current_count = growth_data[0]['student_count']
        last_month_count = growth_data[1]['student_count']
        growth_rate = ((current_count - last_month_count) / last_month_count * 100) if last_month_count > 0 else 0
    else:
        growth_rate = 0

    return {
        'monthly_growth': growth_data,
        'current_total': current_total,
        'growth_rate': round(growth_rate, 1),
        'growth_direction': 'up' if growth_rate > 0 else 'down' if growth_rate < 0 else 'stable'
    }

def _calculate_exam_performance_trends():
    """Calculate exam performance trends by subject and class"""
    ExamResult = apps.get_model('education_exams', 'ExamResult')

    # Subject-wise performance
    subject_performance = ExamResult.objects.values('exam__subject__name').annotate(
        avg_percentage=Avg('percentage'),
        total_students=Count('student', distinct=True)
    ).order_by('-avg_percentage')

    # Class-wise performance
    class_performance = ExamResult.objects.filter(
        student__current_class__isnull=False
    ).values('student__current_class__name').annotate(
        avg_percentage=Avg('percentage'),
        total_students=Count('student', distinct=True)
    ).order_by('student__current_class__name')

    return {
        'subject_performance': list(subject_performance),
        'class_performance': list(class_performance),
        'top_performing_subject': subject_performance.first() if subject_performance.exists() else None,
        'lowest_performing_subject': subject_performance.last() if subject_performance.exists() else None
    }

def _calculate_teacher_performance():
    """Calculate teacher performance metrics"""
    Teacher = apps.get_model('education_academics', 'Teacher')
    TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')

    total_teachers = Teacher.objects.filter(is_active=True).count()
    active_assignments = TeacherSubjectAssignment.objects.filter(is_active=True).select_related('teacher')
    assignment_count = active_assignments.count()
    avg_assignments_per_teacher = round((assignment_count / total_teachers), 1) if total_teachers else 0

    distinct_teachers = active_assignments.values('teacher__full_name').annotate(classes=Count('id')).order_by('-classes')

    teacher_ratings = [
        {'teacher_name': item['teacher__full_name'], 'assignments': item['classes']}
        for item in distinct_teachers[:5]
    ]

    return {
        'total_teachers': total_teachers,
        'active_teacher_assignments': assignment_count,
        'average_assignments_per_teacher': avg_assignments_per_teacher,
        'top_teachers_by_assignments': list(distinct_teachers[:3]),
        'teacher_ratings': teacher_ratings,
        'note': 'Teacher metrics based on active teacher assignments and current roster.'
    }

def _generate_smart_insights(attendance_trends, fee_recovery_trends, exam_performance_trends):
    """Generate smart insights and alerts"""
    insights = []

    # 1. Database-backed AI anomaly alerts (Isolation Forest)
    try:
        AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')
        active_alerts = AttendanceAlert.objects.filter(is_resolved=False).select_related('student')
        for alert in active_alerts:
            insights.append({
                'type': 'alert' if alert.priority == 'high' else 'warning',
                'title': f"AI Alert: {alert.student.full_name}",
                'description': alert.message,
                'priority': alert.priority,
                'category': 'attendance'
            })
    except Exception:
        pass

    # 2. Database-backed AI performance risk predictions (Random Forest)
    try:
        StudentRisk = apps.get_model('analytics', 'StudentRisk')
        AcademicPrediction = apps.get_model('analytics', 'AcademicPrediction')
        high_risks = StudentRisk.objects.filter(risk_level__in=('high', 'critical')).select_related('student')
        predictions = {str(p.student_id): p for p in AcademicPrediction.objects.all()}
        
        for risk in high_risks:
            pred = predictions.get(str(risk.student_id))
            grade_info = f" (Predicted Grade: {pred.predicted_grade})" if pred else ""
            insights.append({
                'type': 'critical' if risk.risk_level == 'critical' else 'warning',
                'title': f"Performance Risk: {risk.student.full_name}{grade_info}",
                'description': f"Risk level assessed as {risk.risk_level.upper()} (Score: {risk.risk_score:.0f}%). Recommendations: {', '.join(risk.recommendations[:2])}",
                'priority': 'high' if risk.risk_level == 'critical' else 'medium',
                'category': 'academic'
            })
    except Exception:
        pass

    # Attendance insights
    if attendance_trends['trend_percentage'] < -10:
        insights.append({
            'type': 'warning',
            'title': f"Attendance dropped {abs(attendance_trends['trend_percentage'])}% this week",
            'description': f"Attendance rate decreased from {attendance_trends['last_week_rate']}% to {attendance_trends['this_week_rate']}%. Consider investigating causes.",
            'priority': 'high',
            'category': 'attendance'
        })

    # Fee recovery insights
    if fee_recovery_trends['worst_performing_class']:
        worst_class = fee_recovery_trends['worst_performing_class']
        if worst_class['recovery_rate'] < 50:
            insights.append({
                'type': 'alert',
                'title': f"{worst_class['class_name']} has lowest fee recovery",
                'description': f"Only {worst_class['recovery_rate']}% fee recovery rate. Consider special attention or payment plans.",
                'priority': 'high',
                'category': 'finance'
            })

    # Exam performance insights
    if exam_performance_trends['lowest_performing_subject']:
        lowest_subject = exam_performance_trends['lowest_performing_subject']
        if lowest_subject['avg_percentage'] < 60:
            insights.append({
                'type': 'warning',
                'title': f"{lowest_subject['exam__subject__name']} performance declining",
                'description': f"Average performance is {lowest_subject['exam__subject__name']} average {lowest_subject['avg_percentage']}%. May need additional teaching resources.",
                'priority': 'medium',
                'category': 'academic'
            })

    # Class-specific insights
    for class_data in fee_recovery_trends['class_recovery']:
        if class_data['recovery_rate'] < 30:
            insights.append({
                'type': 'critical',
                'title': f"Critical: {class_data['class_name']} fee recovery critical",
                'description': f"Only {class_data['recovery_rate']}% recovery rate. Immediate intervention required.",
                'priority': 'critical',
                'category': 'finance'
            })

    return insights
