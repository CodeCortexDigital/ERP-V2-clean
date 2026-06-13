"""
Attendance pattern detection algorithms using AI/ML-inspired logic.
Analyzes historical attendance data to detect patterns and anomalies.
"""

import logging
from datetime import date, timedelta
from typing import List, Dict, Tuple
from django.db.models import Count, Q
from django.apps import apps

logger = logging.getLogger(__name__)

AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
AttendanceAnalytics = apps.get_model('education_attendance', 'AttendanceAnalytics')
AttendancePattern = apps.get_model('education_attendance', 'AttendancePattern')
AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')
Student = apps.get_model('education_students', 'Student')


def detect_declining_attendance(student, lookback_days: int = 60, window_days: int = 30) -> Dict:
    """
    Detect if attendance is declining over time.
    Compares recent window with previous window.
    
    Returns: {
        'detected': bool,
        'severity': 'low' | 'medium' | 'high',
        'current_rate': float,
        'previous_rate': float,
        'trend': float (negative = declining),
        'days_analyzed': int,
    }
    """
    today = date.today()
    lookback_start = today - timedelta(days=lookback_days)
    
    # Split into two equal windows
    mid_point = today - timedelta(days=window_days)
    
    # Previous period
    prev_records = AttendanceRecord.objects.filter(
        student=student,
        date__gte=lookback_start,
        date__lt=mid_point,
        status__in=['present', 'absent', 'late']
    )
    
    # Current period
    curr_records = AttendanceRecord.objects.filter(
        student=student,
        date__gte=mid_point,
        date__lt=today,
        status__in=['present', 'absent', 'late']
    )
    
    prev_total = prev_records.count()
    curr_total = curr_records.count()
    
    if prev_total == 0 or curr_total == 0:
        return {'detected': False, 'reason': 'insufficient_data'}
    
    prev_present = prev_records.filter(status='present').count()
    curr_present = curr_records.filter(status='present').count()
    
    prev_rate = (prev_present / prev_total * 100) if prev_total > 0 else 0
    curr_rate = (curr_present / curr_total * 100) if curr_total > 0 else 0
    
    trend = curr_rate - prev_rate  # negative = declining
    
    # Severity based on decline amount and current rate
    severity = 'low'
    detected = False
    
    if trend < -15 and curr_rate < 75:
        severity = 'high'
        detected = True
    elif trend < -10 and curr_rate < 80:
        severity = 'medium'
        detected = True
    elif trend < -5 and curr_rate < 85:
        severity = 'low'
        detected = True
    
    return {
        'detected': detected,
        'severity': severity,
        'current_rate': round(curr_rate, 1),
        'previous_rate': round(prev_rate, 1),
        'trend': round(trend, 1),
        'days_analyzed': curr_total,
    }


def detect_consecutive_absences(student, min_consecutive: int = 3) -> Dict:
    """
    Detect consecutive absence days.
    
    Returns: {
        'detected': bool,
        'severity': 'low' | 'medium' | 'high',
        'max_consecutive': int,
        'recent_absence_dates': [date],
        'pattern_count': int,  # how many times this pattern occurs
    }
    """
    today = date.today()
    lookback_start = today - timedelta(days=90)
    
    records = AttendanceRecord.objects.filter(
        student=student,
        date__gte=lookback_start,
        status__in=['present', 'absent', 'late', 'excused']
    ).order_by('date')
    
    if not records.exists():
        return {'detected': False, 'reason': 'no_records'}
    
    # Group by consecutive days
    consecutive_groups = []
    current_group = []
    last_date = None
    
    for record in records:
        if record.status == 'absent':
            if last_date and (record.date - last_date).days == 1:
                # Consecutive with previous
                current_group.append(record.date)
            else:
                # Start new group
                if current_group:
                    consecutive_groups.append(current_group)
                current_group = [record.date]
            last_date = record.date
        else:
            # Not absent, save current group if exists
            if current_group:
                consecutive_groups.append(current_group)
            current_group = []
            last_date = record.date
    
    # Add final group if exists
    if current_group:
        consecutive_groups.append(current_group)
    
    # Find the longest sequence
    if not consecutive_groups:
        return {'detected': False, 'reason': 'no_consecutive_absences'}
    
    max_group = max(consecutive_groups, key=len)
    max_consecutive = len(max_group)
    
    # Severity based on consecutive days
    severity = 'low'
    detected = False
    
    if max_consecutive >= 5:
        severity = 'high'
        detected = True
    elif max_consecutive >= 4:
        severity = 'medium'
        detected = True
    elif max_consecutive >= min_consecutive:
        severity = 'low'
        detected = True
    
    # Count patterns
    pattern_count = len([g for g in consecutive_groups if len(g) >= min_consecutive])
    
    return {
        'detected': detected,
        'severity': severity,
        'max_consecutive': max_consecutive,
        'recent_absence_dates': [str(d) for d in max_group[-5:]],  # Last 5 dates
        'pattern_count': pattern_count,
    }


def detect_weekday_pattern(student) -> Dict:
    """
    Detect if student has pattern of absences on specific weekdays.
    e.g., always absent on Mondays or Fridays.
    
    Returns: {
        'detected': bool,
        'severity': 'low' | 'medium' | 'high',
        'weekday': 'Monday' | 'Tuesday' | ... | 'Friday',
        'absence_count': int,
        'total_occurrences': int,
        'absence_percentage': float,
    }
    """
    today = date.today()
    lookback_start = today - timedelta(days=60)
    
    records = AttendanceRecord.objects.filter(
        student=student,
        date__gte=lookback_start,
        status__in=['present', 'absent', 'late', 'excused']
    ).values_list('date', 'status')
    
    if not records.exists():
        return {'detected': False, 'reason': 'no_records'}
    
    weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    weekday_stats = {i: {'absent': 0, 'total': 0} for i in range(5)}
    
    for record_date, status in records:
        weekday = record_date.weekday()
        if weekday < 5:  # Only school days
            weekday_stats[weekday]['total'] += 1
            if status == 'absent':
                weekday_stats[weekday]['absent'] += 1
    
    # Find weekday with highest absence rate
    best_match = None
    best_rate = 0
    
    for weekday, stats in weekday_stats.items():
        if stats['total'] >= 5:  # Must have at least 5 occurrences
            rate = (stats['absent'] / stats['total']) * 100
            if rate > best_rate:
                best_rate = rate
                best_match = weekday
    
    if best_match is None or best_rate < 30:
        return {'detected': False, 'reason': 'no_pattern'}
    
    severity = 'low'
    if best_rate >= 70:
        severity = 'high'
    elif best_rate >= 50:
        severity = 'medium'
    
    return {
        'detected': True,
        'severity': severity,
        'weekday': weekday_names[best_match],
        'absence_count': weekday_stats[best_match]['absent'],
        'total_occurrences': weekday_stats[best_match]['total'],
        'absence_percentage': round(best_rate, 1),
    }


def calculate_attendance_analytics(student, analysis_date: date = None) -> Dict:
    """
    Calculate comprehensive attendance analytics for a student.
    Used by analytics views and dashboard.
    """
    if analysis_date is None:
        analysis_date = date.today()
    
    lookback_start = analysis_date - timedelta(days=30)
    
    records = AttendanceRecord.objects.filter(
        student=student,
        date__gte=lookback_start,
        date__lte=analysis_date
    )
    
    total = records.count()
    present = records.filter(status='present').count()
    absent = records.filter(status='absent').count()
    late = records.filter(status='late').count()
    excused = records.filter(status='excused').count()
    holiday = records.filter(status='holiday').count()
    
    attendance_rate = (present / total * 100) if total > 0 else 0
    
    # Determine trend direction
    trend_direction = 'stable'
    if total >= 20:  # Need enough data
        # Compare first and second half
        mid_point = lookback_start + timedelta(days=15)
        first_half = AttendanceRecord.objects.filter(
            student=student,
            date__gte=lookback_start,
            date__lt=mid_point,
            status='present'
        ).count()
        first_half_total = AttendanceRecord.objects.filter(
            student=student,
            date__gte=lookback_start,
            date__lt=mid_point
        ).count()
        
        second_half = present  # Already counted for full period
        second_half_total = total - first_half_total
        
        if first_half_total > 0 and second_half_total > 0:
            first_rate = (first_half / first_half_total * 100)
            second_rate = (second_half / second_half_total * 100)
            
            if second_rate > first_rate + 5:
                trend_direction = 'up'
            elif second_rate < first_rate - 5:
                trend_direction = 'down'
    
    # Calculate risk level and score
    risk_score = 100 - attendance_rate  # Simple: more absences = higher risk
    risk_level = 'low'
    
    if attendance_rate < 60:
        risk_level = 'high'
    elif attendance_rate < 75:
        risk_level = 'medium'
    
    return {
        'total_records': total,
        'present_count': present,
        'absent_count': absent,
        'late_count': late,
        'excused_count': excused,
        'holiday_count': holiday,
        'attendance_rate': round(attendance_rate, 1),
        'trend_direction': trend_direction,
        'risk_level': risk_level,
        'risk_score': round(risk_score, 1),
    }


def detect_all_patterns(student) -> List[Dict]:
    """
    Run all pattern detection algorithms for a student.
    Returns list of detected patterns.
    """
    patterns = []
    
    # Declining attendance
    declining = detect_declining_attendance(student)
    if declining.get('detected'):
        patterns.append({
            'type': 'declining',
            'severity': declining['severity'],
            'data': declining
        })
    
    # Consecutive absences
    consecutive = detect_consecutive_absences(student)
    if consecutive.get('detected'):
        patterns.append({
            'type': 'consecutive',
            'severity': consecutive['severity'],
            'data': consecutive
        })
    
    # Weekday pattern
    weekday = detect_weekday_pattern(student)
    if weekday.get('detected'):
        patterns.append({
            'type': 'weekday',
            'severity': weekday['severity'],
            'data': weekday
        })
    
    return patterns
