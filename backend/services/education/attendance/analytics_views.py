"""
Attendance analytics and pattern detection views.
Provides endpoints for the frontend analytics dashboard.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.apps import apps
from django.db.models import Count, Q, Avg
from datetime import date, timedelta
import logging

from services.core.accounts.decorators import (
    filter_attendance_for_user,
    get_user_role,
    _get_parent_student_ids,
    _get_teacher_class_ids,
)
from services.core.utils.cache import cached_api_view, get_timeout
from services.education.attendance.detection import calculate_attendance_analytics

logger = logging.getLogger(__name__)

Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
Student = apps.get_model('education_students', 'Student')
AttendanceAnalytics = apps.get_model('education_attendance', 'AttendanceAnalytics')
AttendancePattern = apps.get_model('education_attendance', 'AttendancePattern')
AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(timeout=get_timeout('analytics'), cache_type='analytics')
def attendance_analytics(request):
    """
    Get comprehensive attendance analytics for the user's scope.
    Teachers see their classes, parents see their children, admins see all.
    """
    try:
        user = request.user
        role = get_user_role(user)
        today = date.today()
        
        # Determine scope
        if role == 'admin':
            students = Student.objects.filter(is_active=True)[:100]  # Limit for performance
        elif role == 'parent':
            student_ids = _get_parent_student_ids(user)
            students = Student.objects.filter(id__in=student_ids)
        elif role == 'teacher':
            class_ids = _get_teacher_class_ids(user)
            students = Student.objects.filter(current_class_id__in=class_ids)
        else:
            # Student - only their own data
            try:
                student = Student.objects.get(email=user.email)
                students = Student.objects.filter(id=student.id)
            except Student.DoesNotExist:
                return Response({'error': 'Student record not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get analytics for each student
        analytics_data = []
        for student in students:
            analytics = calculate_attendance_analytics(student, today)
            analytics['student_id'] = str(student.id)
            analytics['student_name'] = student.full_name
            analytics_data.append(analytics)
        
        # Calculate aggregates
        total_students = len(analytics_data)
        avg_attendance = (sum(a['attendance_rate'] for a in analytics_data) / total_students) if total_students > 0 else 0
        at_risk_count = len([a for a in analytics_data if a['risk_level'] in ('high', 'medium')])
        
        return Response({
            'summary': {
                'total_students': total_students,
                'average_attendance': round(avg_attendance, 1),
                'at_risk_count': at_risk_count,
                'at_risk_percentage': round((at_risk_count / total_students * 100), 1) if total_students > 0 else 0,
            },
            'students': sorted(analytics_data, key=lambda x: x['risk_score'], reverse=True),
            'generated_at': today.isoformat(),
        })
    
    except Exception as e:
        logger.error(f'Error generating attendance analytics: {str(e)}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(timeout=get_timeout('analytics'), cache_type='analytics')
def attendance_patterns(request):
    """
    Get detected attendance patterns for students in user's scope.
    Includes declining trends, consecutive absences, weekday patterns, etc.
    """
    try:
        user = request.user
        role = get_user_role(user)
        
        # Determine scope
        if role == 'admin':
            patterns = AttendancePattern.objects.filter(is_active=True).select_related('student')
        elif role == 'parent':
            student_ids = _get_parent_student_ids(user)
            patterns = AttendancePattern.objects.filter(
                is_active=True,
                student_id__in=student_ids
            ).select_related('student')
        elif role == 'teacher':
            class_ids = _get_teacher_class_ids(user)
            patterns = AttendancePattern.objects.filter(
                is_active=True,
                student__current_class_id__in=class_ids
            ).select_related('student')
        else:
            # Student - only their own patterns
            try:
                student = Student.objects.get(email=user.email)
                patterns = AttendancePattern.objects.filter(
                    is_active=True,
                    student=student
                )
            except Student.DoesNotExist:
                return Response([])
        
        # Serialize patterns
        pattern_data = []
        for pattern in patterns:
            pattern_data.append({
                'id': str(pattern.id),
                'student_id': str(pattern.student_id),
                'student_name': pattern.student.full_name,
                'pattern_type': pattern.pattern_type,
                'severity': pattern.severity,
                'description': pattern.description,
                'start_date': pattern.start_date.isoformat(),
                'end_date': pattern.end_date.isoformat(),
                'confidence_score': pattern.confidence_score,
                'affected_days': pattern.affected_days,
                'metadata': pattern.metadata,
            })
        
        return Response(pattern_data)
    
    except Exception as e:
        logger.error(f'Error retrieving attendance patterns: {str(e)}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@cached_api_view(timeout=get_timeout('analytics'), cache_type='analytics')
def attendance_alerts(request):
    """
    Get recent attendance alerts for students in user's scope.
    """
    try:
        user = request.user
        role = get_user_role(user)
        
        # Determine scope
        if role == 'admin':
            alerts = AttendanceAlert.objects.filter(is_resolved=False).select_related('student')
        elif role == 'parent':
            student_ids = _get_parent_student_ids(user)
            alerts = AttendanceAlert.objects.filter(
                is_resolved=False,
                student_id__in=student_ids
            ).select_related('student')
        elif role == 'teacher':
            class_ids = _get_teacher_class_ids(user)
            alerts = AttendanceAlert.objects.filter(
                is_resolved=False,
                student__current_class_id__in=class_ids
            ).select_related('student')
        else:
            # Student - only their own alerts
            try:
                student = Student.objects.get(email=user.email)
                alerts = AttendanceAlert.objects.filter(
                    is_resolved=False,
                    student=student
                )
            except Student.DoesNotExist:
                return Response([])
        
        # Order by priority and date
        priority_order = {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}
        alerts = alerts.order_by('-created_at')[:50]  # Limit to 50 recent alerts
        
        # Serialize alerts
        alert_data = []
        for alert in alerts:
            alert_data.append({
                'id': str(alert.id),
                'student_id': str(alert.student_id),
                'student_name': alert.student.full_name,
                'alert_type': alert.alert_type,
                'title': alert.title,
                'message': alert.message,
                'priority': alert.priority,
                'is_resolved': alert.is_resolved,
                'created_at': alert.created_at.isoformat(),
            })
        
        return Response(alert_data)
    
    except Exception as e:
        logger.error(f'Error retrieving attendance alerts: {str(e)}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_trends(request):
    """
    Get attendance trends over time (weekly/monthly aggregates).
    """
    try:
        user = request.user
        role = get_user_role(user)
        student_id = request.query_params.get('student_id')
        period = request.query_params.get('period', 'weekly')  # weekly or monthly
        
        # Validate access
        if student_id:
            if role == 'parent':
                student_ids = _get_parent_student_ids(user)
                if student_id not in [str(s) for s in student_ids]:
                    return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            elif role not in ('admin', 'teacher'):
                # Students can only view own data
                try:
                    own_student = Student.objects.get(email=user.email)
                    if student_id != str(own_student.id):
                        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
                except Student.DoesNotExist:
                    return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
            students = Student.objects.filter(id=student_id)
        else:
            if role == 'admin':
                students = Student.objects.filter(is_active=True)[:20]
            elif role == 'parent':
                student_ids = _get_parent_student_ids(user)
                students = Student.objects.filter(id__in=student_ids)
            elif role == 'teacher':
                class_ids = _get_teacher_class_ids(user)
                students = Student.objects.filter(current_class_id__in=class_ids)[:20]
            else:
                try:
                    student = Student.objects.get(email=user.email)
                    students = Student.objects.filter(id=student.id)
                except Student.DoesNotExist:
                    return Response([])
        
        # Generate trend data
        today = date.today()
        trends = []
        
        if period == 'weekly':
            lookback = 12  # 12 weeks
            for i in range(lookback - 1, -1, -1):
                week_end = today - timedelta(weeks=i)
                week_start = week_end - timedelta(weeks=1)
                
                records = Attendance.objects.filter(
                    student__in=students,
                    date__gte=week_start,
                    date__lt=week_end,
                    status__in=['present', 'absent', 'late']
                )
                
                total = records.count()
                present = records.filter(status='present').count()
                absent = records.filter(status='absent').count()
                
                attendance_rate = (present / total * 100) if total > 0 else 0
                
                trends.append({
                    'period': f"{week_start.strftime('%b %d')}-{week_end.strftime('%b %d')}",
                    'date': week_end.isoformat(),
                    'present': present,
                    'absent': absent,
                    'total': total,
                    'attendance_rate': round(attendance_rate, 1),
                })
        else:  # monthly
            for i in range(5, -1, -1):
                month_date = today - timedelta(days=30*i)
                month_start = month_date.replace(day=1)
                if month_date.month == 12:
                    month_end = month_date.replace(year=month_date.year + 1, month=1, day=1)
                else:
                    month_end = month_date.replace(month=month_date.month + 1, day=1)
                
                records = Attendance.objects.filter(
                    student__in=students,
                    date__gte=month_start,
                    date__lt=month_end,
                    status__in=['present', 'absent', 'late']
                )
                
                total = records.count()
                present = records.filter(status='present').count()
                absent = records.filter(status='absent').count()
                
                attendance_rate = (present / total * 100) if total > 0 else 0
                
                trends.append({
                    'period': month_start.strftime('%B %Y'),
                    'date': month_start.isoformat(),
                    'present': present,
                    'absent': absent,
                    'total': total,
                    'attendance_rate': round(attendance_rate, 1),
                })
        
        return Response(trends)
    
    except Exception as e:
        logger.error(f'Error generating attendance trends: {str(e)}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def at_risk_students(request):
    """
    Get list of at-risk students for user's scope.
    Sorted by risk level and score.
    """
    try:
        user = request.user
        role = get_user_role(user)
        today = date.today()
        
        # Determine scope
        if role == 'admin':
            students = Student.objects.filter(is_active=True)
        elif role == 'parent':
            student_ids = _get_parent_student_ids(user)
            students = Student.objects.filter(id__in=student_ids)
        elif role == 'teacher':
            class_ids = _get_teacher_class_ids(user)
            students = Student.objects.filter(current_class_id__in=class_ids)
        else:
            # Student - return own data only if at risk
            try:
                student = Student.objects.get(email=user.email)
                students = Student.objects.filter(id=student.id)
            except Student.DoesNotExist:
                return Response([])
        
        # Get at-risk students
        at_risk = []
        for student in students:
            analytics = calculate_attendance_analytics(student, today)
            
            if analytics['risk_level'] in ('high', 'medium'):
                # Get recent patterns
                patterns = AttendancePattern.objects.filter(
                    student=student,
                    is_active=True
                ).values_list('pattern_type', flat=True)
                
                at_risk.append({
                    'id': str(student.id),
                    'name': student.full_name,
                    'student_id': student.student_id,
                    'class': student.current_class.name if student.current_class else 'N/A',
                    'attendance_rate': analytics['attendance_rate'],
                    'risk_level': analytics['risk_level'],
                    'risk_score': analytics['risk_score'],
                    'trend': analytics['trend_direction'],
                    'patterns': list(patterns),
                })
        
        # Sort by risk score
        at_risk.sort(key=lambda x: x['risk_score'], reverse=True)
        
        return Response(at_risk)
    
    except Exception as e:
        logger.error(f'Error retrieving at-risk students: {str(e)}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
