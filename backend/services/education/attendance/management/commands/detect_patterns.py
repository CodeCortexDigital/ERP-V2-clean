"""
Management command to detect attendance patterns and generate alerts.
Run daily via celery beat or cron job.

Usage: python manage.py detect_attendance_patterns
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.apps import apps
from datetime import date
import logging

logger = logging.getLogger(__name__)

Student = apps.get_model('education_students', 'Student')
AttendanceAnalytics = apps.get_model('education_attendance', 'AttendanceAnalytics')
AttendancePattern = apps.get_model('education_attendance', 'AttendancePattern')
AttendanceAlert = apps.get_model('education_attendance', 'AttendanceAlert')

from services.education.attendance.detection import (
    detect_all_patterns,
    calculate_attendance_analytics,
    detect_declining_attendance,
    detect_consecutive_absences,
    detect_weekday_pattern,
)
from services.core.user_notifications.utils import create_user_notifications_for_student_and_parents


class Command(BaseCommand):
    help = 'Detect attendance patterns and generate alerts for at-risk students'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--student-id',
            type=str,
            help='Process specific student ID',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-detection even if recent analysis exists',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
    
    def handle(self, *args, **options):
        student_id = options.get('student_id')
        force = options.get('force', False)
        dry_run = options.get('dry_run', False)
        
        if student_id:
            students = Student.objects.filter(id=student_id, is_active=True)
        else:
            students = Student.objects.filter(is_active=True)
        
        self.stdout.write(f'Processing {students.count()} students...')
        
        processed = 0
        patterns_detected = 0
        alerts_created = 0
        
        for student in students:
            try:
                result = self.process_student(student, force, dry_run)
                processed += 1
                patterns_detected += result['patterns']
                alerts_created += result['alerts']
            except Exception as e:
                logger.error(f'Error processing student {student.id}: {str(e)}')
                self.stdout.write(self.style.ERROR(f'Error processing {student.full_name}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'\nCompleted: {processed} students processed, '
            f'{patterns_detected} patterns detected, {alerts_created} alerts created'
        ))
    
    def process_student(self, student, force=False, dry_run=False):
        """Process a single student for pattern detection."""
        today = date.today()
        
        # Check if we already analyzed today
        existing_analytics = AttendanceAnalytics.objects.filter(
            student=student,
            date=today
        ).first()
        
        if existing_analytics and not force:
            return {'patterns': 0, 'alerts': 0}
        
        # Calculate analytics
        analytics_data = calculate_attendance_analytics(student, today)
        
        # Create or update analytics record
        if not dry_run:
            analytics, created = AttendanceAnalytics.objects.update_or_create(
                student=student,
                date=today,
                defaults=analytics_data
            )
        
        # Detect patterns
        patterns = detect_all_patterns(student)
        
        patterns_count = 0
        alerts_count = 0
        
        for pattern_info in patterns:
            patterns_count += 1
            
            pattern_type = pattern_info['type']
            severity = pattern_info['severity']
            data = pattern_info['data']
            
            if not dry_run:
                # Create pattern record
                pattern = self._create_pattern_record(student, pattern_type, severity, data)
                
                # Create alert
                alert = self._create_alert_from_pattern(student, pattern, pattern_type, severity, data)
                
                if alert:
                    alerts_count += 1
                    
                    # Send notifications
                    self._send_notifications(student, alert)
        
        if dry_run:
            self.stdout.write(
                f'[DRY RUN] {student.full_name}: '
                f'{patterns_count} patterns, {alerts_count} alerts'
            )
        else:
            self.stdout.write(f'{student.full_name}: {patterns_count} patterns detected')
        
        return {'patterns': patterns_count, 'alerts': alerts_count}
    
    def _create_pattern_record(self, student, pattern_type, severity, data):
        """Create an AttendancePattern record."""
        today = date.today()
        
        # Determine description and dates based on pattern type
        if pattern_type == 'declining':
            description = (
                f"Attendance declining from {data['previous_rate']}% to {data['current_rate']}%. "
                f"Trend: {data['trend']}%"
            )
            start_date = today - __import__('datetime').timedelta(days=60)
            end_date = today
        elif pattern_type == 'consecutive':
            description = (
                f"Consecutive absences detected: {data['max_consecutive']} days. "
                f"Dates: {', '.join(data.get('recent_absence_dates', [])[:3])}"
            )
            start_date = today - __import__('datetime').timedelta(days=data['max_consecutive'])
            end_date = today
        elif pattern_type == 'weekday':
            description = (
                f"Pattern: {data['absence_count']} absences on {data['weekday']}s "
                f"({data['absence_percentage']}% of {data['weekday']}s)"
            )
            start_date = today - __import__('datetime').timedelta(days=60)
            end_date = today
        else:
            description = f"Pattern: {pattern_type}"
            start_date = today
            end_date = today
        
        # Check for existing active pattern
        existing = AttendancePattern.objects.filter(
            student=student,
            pattern_type=pattern_type,
            is_active=True
        ).first()
        
        if existing:
            # Update existing pattern
            existing.severity = severity
            existing.description = description
            existing.end_date = end_date
            existing.metadata = data
            existing.save()
            return existing
        else:
            # Create new pattern
            pattern = AttendancePattern.objects.create(
                student=student,
                pattern_type=pattern_type,
                severity=severity,
                description=description,
                start_date=start_date,
                end_date=end_date,
                confidence_score=0.85,  # Default confidence
                affected_days=data.get('days_analyzed', 0) or data.get('total_occurrences', 0),
                metadata=data,
            )
            return pattern
    
    def _create_alert_from_pattern(self, student, pattern, pattern_type, severity, data):
        """Create an AttendanceAlert from a detected pattern."""
        
        # Check for recent alert
        recent_alert = AttendanceAlert.objects.filter(
            student=student,
            pattern=pattern,
            is_resolved=False,
            created_at__date=date.today()
        ).first()
        
        if recent_alert:
            return None  # Already alerted today
        
        # Map pattern type to alert type
        alert_type_map = {
            'declining': 'declining',
            'consecutive': 'consecutive_absent',
            'weekday': 'weekday_pattern',
        }
        
        alert_type = alert_type_map.get(pattern_type, 'at_risk')
        
        # Create title and message
        if pattern_type == 'declining':
            title = f"Attendance Declining - {severity.title()}"
            message = (
                f"{student.full_name}'s attendance has declined from {data['previous_rate']}% "
                f"to {data['current_rate']}% over the last month. "
                f"Immediate intervention may be needed."
            )
        elif pattern_type == 'consecutive':
            title = f"Consecutive Absences Detected"
            message = (
                f"{student.full_name} has been absent for {data['max_consecutive']} consecutive days. "
                f"Please contact the student or parents to ensure they are well."
            )
        elif pattern_type == 'weekday':
            title = f"Weekday Pattern Detected"
            message = (
                f"{student.full_name} is frequently absent on {data['weekday']}s "
                f"({data['absence_percentage']}% absence rate). This may indicate a recurring issue."
            )
        else:
            title = "Attendance Alert"
            message = f"Attendance pattern detected for {student.full_name}"
        
        # Map severity to priority
        priority_map = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'urgent',
        }
        priority = priority_map.get(severity, 'medium')
        
        # Create alert
        alert = AttendanceAlert.objects.create(
            student=student,
            pattern=pattern,
            alert_type=alert_type,
            title=title,
            message=message,
            priority=priority,
        )
        
        return alert
    
    def _send_notifications(self, student, alert):
        """Send notifications to student and parents about the alert."""
        try:
            title = alert.title
            message = alert.message
            notification_type = 'attendance'
            
            # Notify parents and student
            create_user_notifications_for_student_and_parents(
                student,
                title,
                message,
                notification_type
            )
            
            # Mark as notified
            alert.notified_at = timezone.now()
            alert.save(update_fields=['notified_at'])
            
        except Exception as e:
            logger.error(f'Error sending notifications for alert {alert.id}: {str(e)}')
