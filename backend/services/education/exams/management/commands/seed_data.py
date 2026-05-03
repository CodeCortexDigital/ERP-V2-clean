from django.core.management.base import BaseCommand
from django.utils import timezone
from exams.models import ExamType, Exam, ExamRegistration, ExamResult
from datetime import date, timedelta, time
import random
import uuid

class Command(BaseCommand):
    help = 'Seed the database with sample exam data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
    
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            ExamResult.objects.all().delete()
            ExamRegistration.objects.all().delete()
            Exam.objects.all().delete()
            ExamType.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Data cleared!'))
        
        self.stdout.write(self.style.SUCCESS('Seeding exam data...'))
        
        # Create Exam Types
        exam_types = self.create_exam_types()
        
        # Create Exams
        exams = self.create_exams(exam_types)
        
        # Create Registrations and Results
        self.create_registrations_and_results(exams)
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded exam data!'))
        self.stdout.write(self.style.SUCCESS(f'Created:'))
        self.stdout.write(f'  - {ExamType.objects.count()} exam types')
        self.stdout.write(f'  - {Exam.objects.count()} exams')
        self.stdout.write(f'  - {ExamRegistration.objects.count()} registrations')
        self.stdout.write(f'  - {ExamResult.objects.count()} results')
    
    def create_exam_types(self):
        """Create sample exam types"""
        exam_types = []
        
        types_data = [
            {'name': 'Midterm Examination', 'code': 'MID', 'weight_percentage': 30.00},
            {'name': 'Final Examination', 'code': 'FINAL', 'weight_percentage': 50.00},
            {'name': 'Quiz', 'code': 'QUIZ', 'weight_percentage': 10.00},
            {'name': 'Class Test', 'code': 'TEST', 'weight_percentage': 10.00},
            {'name': 'Practical Exam', 'code': 'PRAC', 'weight_percentage': 25.00},
            {'name': 'Oral Examination', 'code': 'ORAL', 'weight_percentage': 15.00},
            {'name': 'Project Presentation', 'code': 'PROJ', 'weight_percentage': 20.00},
        ]
        
        for data in types_data:
            exam_type, created = ExamType.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            exam_types.append(exam_type)
            if created:
                self.stdout.write(f"  Created exam type: {exam_type.name}")
        
        return exam_types
    
    def create_exams(self, exam_types):
        """Create sample exams"""
        exams = []
        
        courses = [
            {'id': uuid.uuid4(), 'code': 'CS101', 'name': 'Introduction to Programming'},
            {'id': uuid.uuid4(), 'code': 'CS201', 'name': 'Data Structures'},
            {'id': uuid.uuid4(), 'code': 'MATH101', 'name': 'Calculus I'},
            {'id': uuid.uuid4(), 'code': 'ENG101', 'name': 'English Composition'},
            {'id': uuid.uuid4(), 'code': 'PHY101', 'name': 'Physics I'},
        ]
        
        venues = ['Main Hall', 'Science Building', 'Engineering Block', 'Library']
        rooms = ['Room 101', 'Room 102', 'Room 201', 'Room 202', 'Lab 1', 'Lab 2']
        
        current_year = date.today().year
        statuses = ['draft', 'scheduled', 'published', 'completed', 'results_published']
        
        for i, course in enumerate(courses):
            # Create midterm
            exam_date = date(current_year, 10, 15 + i)
            exam = Exam.objects.create(
                title=f"{course['name']} Midterm Examination",
                code=f"{course['code']}-MID-{current_year}",
                description=f"Midterm examination for {course['name']}",
                exam_type=random.choice(exam_types),
                course_id=course['id'],
                course_code=course['code'],
                course_name=course['name'],
                exam_date=exam_date,
                start_time=time(9, 0),
                end_time=time(11, 0),
                duration_minutes=120,
                venue=random.choice(venues),
                room=random.choice(rooms),
                exam_format=random.choice(['offline', 'online']),
                total_marks=100,
                passing_marks=40,
                status=random.choice(statuses),
                instructions="Answer all questions. Duration: 2 hours.",
                total_students=random.randint(30, 60)
            )
            exams.append(exam)
            self.stdout.write(f"  Created exam: {exam.code}")
            
            # Create final exam
            exam_date = date(current_year, 12, 5 + i)
            exam = Exam.objects.create(
                title=f"{course['name']} Final Examination",
                code=f"{course['code']}-FINAL-{current_year}",
                description=f"Final examination for {course['name']}",
                exam_type=ExamType.objects.get(code='FINAL'),
                course_id=course['id'],
                course_code=course['code'],
                course_name=course['name'],
                exam_date=exam_date,
                start_time=time(9, 0),
                end_time=time(12, 0),
                duration_minutes=180,
                venue=random.choice(venues),
                room=random.choice(rooms),
                exam_format=random.choice(['offline', 'online']),
                total_marks=100,
                passing_marks=40,
                status=random.choice(statuses),
                instructions="Answer all questions. Duration: 3 hours.",
                total_students=random.randint(30, 60)
            )
            exams.append(exam)
            self.stdout.write(f"  Created exam: {exam.code}")
        
        return exams
    
    def create_registrations_and_results(self, exams):
        """Create sample registrations and results"""
        students = []
        for i in range(1, 51):  # Create 50 sample students
            students.append({
                'id': uuid.uuid4(),
                'name': f"Student {i}",
                'roll': f"2024{str(i).zfill(4)}"
            })
        
        for exam in exams:
            # Register 40-50 students for each exam
            num_students = random.randint(40, 50)
            selected_students = random.sample(students, num_students)
            
            for student in selected_students:
                # Create registration
                registration = ExamRegistration.objects.create(
                    exam=exam,
                    student_id=student['id'],
                    student_name=student['name'],
                    student_roll_number=student['roll'],
                    status=random.choice(['registered', 'attended', 'absent']),
                    seat_number=f"{random.choice(['A', 'B', 'C'])}{random.randint(1, 30)}",
                    room=exam.room,
                    attendance_marked=random.choice([True, False])
                )
                
                # Create result for attended students
                if registration.status in ['attended', 'registered'] and random.choice([True, False]):
                    marks = random.randint(25, 98)
                    is_pass = marks >= exam.passing_marks
                    
                    # Calculate grade
                    if marks >= 90:
                        grade = 'A+'
                    elif marks >= 80:
                        grade = 'A'
                    elif marks >= 70:
                        grade = 'B+'
                    elif marks >= 60:
                        grade = 'B'
                    elif marks >= 50:
                        grade = 'C+'
                    elif marks >= 40:
                        grade = 'C'
                    else:
                        grade = 'F'
                    
                    ExamResult.objects.create(
                        exam=exam,
                        registration=registration,
                        student_id=student['id'],
                        marks_obtained=marks,
                        percentage=marks,
                        grade=grade,
                        grade_points=float(marks)/25 if marks >= 40 else 0,
                        is_pass=is_pass,
                        is_absent=False,
                        graded_by=uuid.uuid4(),
                        graded_at=timezone.now() - timedelta(days=random.randint(1, 10))
                    )