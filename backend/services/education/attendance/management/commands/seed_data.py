from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import AttendanceSession, AttendanceRecord, AttendanceSummary
from datetime import date, timedelta
import random
import uuid

class Command(BaseCommand):
    help = 'Seed the database with sample attendance data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
    
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            AttendanceRecord.objects.all().delete()
            AttendanceSession.objects.all().delete()
            AttendanceSummary.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Data cleared!'))
        
        self.stdout.write(self.style.SUCCESS('Seeding attendance data...'))
        
        # Create courses
        courses = [
            {'id': uuid.uuid4(), 'code': 'CS101', 'name': 'Introduction to Programming'},
            {'id': uuid.uuid4(), 'code': 'CS102', 'name': 'Data Structures'},
            {'id': uuid.uuid4(), 'code': 'MATH101', 'name': 'Calculus I'},
            {'id': uuid.uuid4(), 'code': 'ENG101', 'name': 'English Composition'},
            {'id': uuid.uuid4(), 'code': 'PHY101', 'name': 'Physics I'},
        ]
        
        # Create students
        students = [
            {'id': uuid.uuid4(), 'name': 'John Smith'},
            {'id': uuid.uuid4(), 'name': 'Jane Doe'},
            {'id': uuid.uuid4(), 'name': 'Bob Johnson'},
            {'id': uuid.uuid4(), 'name': 'Alice Williams'},
            {'id': uuid.uuid4(), 'name': 'Charlie Brown'},
            {'id': uuid.uuid4(), 'name': 'Diana Prince'},
            {'id': uuid.uuid4(), 'name': 'Bruce Wayne'},
            {'id': uuid.uuid4(), 'name': 'Clark Kent'},
        ]
        
        session_types = ['class', 'lab', 'lecture', 'tutorial']
        statuses = ['present', 'present', 'present', 'absent', 'late', 'excused']  # weighted
        
        # Create sessions for the last 30 days
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        current_date = start_date
        
        session_count = 0
        record_count = 0
        
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() < 5:  # Monday to Friday
                for course in courses:
                    # Create 1-3 sessions per course per day
                    for _ in range(random.randint(1, 3)):
                        start_hour = random.randint(8, 16)
                        start_time = timezone.datetime.strptime(f"{start_hour}:00", "%H:%M").time()
                        end_time = timezone.datetime.strptime(f"{start_hour + 1}:00", "%H:%M").time()
                        
                        session = AttendanceSession.objects.create(
                            course_id=course['id'],
                            course_code=course['code'],
                            course_name=course['name'],
                            session_type=random.choice(session_types),
                            title=f"{course['code']} Session",
                            date=current_date,
                            start_time=start_time,
                            end_time=end_time,
                            duration_minutes=60,
                            location=f"Room {random.randint(101, 505)}",
                            teacher_name=f"Prof. {random.choice(['Smith', 'Jones', 'Wilson'])}",
                            total_students=len(students),
                        )
                        
                        session_count += 1
                        
                        # Create attendance records for each student
                        for student in students:
                            status = random.choice(statuses)
                            
                            record = AttendanceRecord.objects.create(
                                session=session,
                                student_id=student['id'],
                                student_name=student['name'],
                                status=status,
                                check_in_time=timezone.now() if status != 'absent' else None,
                            )
                            
                            record_count += 1
                            
                            # Update session counts
                            if status == 'present':
                                session.present_count += 1
                            elif status == 'absent':
                                session.absent_count += 1
                            elif status == 'late':
                                session.late_count += 1
                            elif status == 'excused':
                                session.excused_count += 1
                        
                        session.save()
                        
                        # Create daily summaries
                        self.create_daily_summaries(current_date, students)
            
            current_date += timedelta(days=1)
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded:'))
        self.stdout.write(f'  - {session_count} attendance sessions')
        self.stdout.write(f'  - {record_count} attendance records')
        self.stdout.write(f'  - {AttendanceSummary.objects.count()} daily summaries')
    
    def create_daily_summaries(self, date, students):
        """Create daily attendance summaries for all students"""
        for student in students:
            records = AttendanceRecord.objects.filter(
                student_id=student['id'],
                session__date=date
            )
            
            if records.exists():
                total = records.count()
                present = records.filter(status='present').count()
                absent = records.filter(status='absent').count()
                late = records.filter(status='late').count()
                excused = records.filter(status='excused').count()
                
                attendance_percentage = ((present + late) / total * 100) if total > 0 else 0
                
                AttendanceSummary.objects.create(
                    student_id=student['id'],
                    student_name=student['name'],
                    date=date,
                    total_classes=total,
                    present=present,
                    absent=absent,
                    late=late,
                    excused=excused,
                    attendance_percentage=round(attendance_percentage, 2)
                )