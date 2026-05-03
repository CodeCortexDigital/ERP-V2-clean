from django.core.management.base import BaseCommand
from django.utils import timezone
from students.models import Student, Enrollment, Document, Note, Guardian
from datetime import date, timedelta
import random
import uuid

class Command(BaseCommand):
    help = 'Seed the database with sample student data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Number of sample students to create (default: 20)',
        )
    
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            Enrollment.objects.all().delete()
            Document.objects.all().delete()
            Note.objects.all().delete()
            Guardian.objects.all().delete()
            Student.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Data cleared!'))
        
        self.stdout.write(self.style.SUCCESS('Seeding student data...'))
        
        count = options['count']
        students = self.create_students(count)
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {len(students)} students!'))
        self.stdout.write(self.style.SUCCESS(f'Created:'))
        self.stdout.write(f'  - {Student.objects.count()} students')
        self.stdout.write(f'  - {Enrollment.objects.count()} enrollments')
        self.stdout.write(f'  - {Document.objects.count()} documents')
        self.stdout.write(f'  - {Note.objects.count()} notes')
        self.stdout.write(f'  - {Guardian.objects.count()} guardians')
    
    def create_students(self, count):
        """Create sample students"""
        students = []
        
        first_names = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 
                      'William', 'Elizabeth', 'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah',
                      'Thomas', 'Karen', 'Charles', 'Nancy', 'Christopher', 'Lisa', 'Daniel', 'Margaret']
        
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
                     'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
                     'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']
        
        programs = [
            {'id': uuid.uuid4(), 'code': 'CS', 'name': 'Computer Science'},
            {'id': uuid.uuid4(), 'code': 'BUS', 'name': 'Business Administration'},
            {'id': uuid.uuid4(), 'code': 'ENG', 'name': 'Engineering'},
            {'id': uuid.uuid4(), 'code': 'MED', 'name': 'Medicine'},
            {'id': uuid.uuid4(), 'code': 'LAW', 'name': 'Law'},
        ]
        
        statuses = ['active', 'active', 'active', 'graduated', 'inactive']
        genders = ['M', 'F']
        countries = ['USA', 'Canada', 'UK', 'India', 'China']
        
        current_year = date.today().year
        
        for i in range(count):
            # Generate student data
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            email = f"{first_name.lower()}.{last_name.lower()}@example.com"
            student_id = f"STU{current_year}{random.randint(10000, 99999)}"
            
            program = random.choice(programs)
            enrollment_year = random.randint(current_year-3, current_year)
            current_year_of_study = min(current_year - enrollment_year + 1, 4)
            
            student = Student.objects.create(
                student_id=student_id,
                first_name=first_name,
                last_name=last_name,
                date_of_birth=date(random.randint(1995, 2005), random.randint(1, 12), random.randint(1, 28)),
                gender=random.choice(genders),
                email=email,
                phone=f"+1{random.randint(200,999)}{random.randint(200,999)}{random.randint(1000,9999)}",
                address_line1=f"{random.randint(1,999)} Main Street",
                city=random.choice(['New York', 'Los Angeles', 'Chicago', 'Boston']),
                state=random.choice(['NY', 'CA', 'IL', 'MA']),
                postal_code=f"{random.randint(10000,99999)}",
                country='USA',
                nationality='USA',
                is_international=False,
                program_id=program['id'],
                program_code=program['code'],
                program_name=program['name'],
                current_semester=random.randint(1, 2),
                current_year=current_year_of_study,
                student_type='full_time',
                enrollment_date=date(enrollment_year, 9, 1),
                expected_graduation=date(enrollment_year+4, 5, 30),
                status=random.choice(statuses),
                emergency_contact_name=f"{random.choice(first_names)} {random.choice(last_names)}",
                emergency_contact_relationship=random.choice(['Parent', 'Spouse']),
                emergency_contact_phone=f"+1{random.randint(200,999)}{random.randint(200,999)}{random.randint(1000,9999)}",
            )
            
            students.append(student)
            
            # Create enrollments for student
            self.create_enrollments(student)
            
            # Create documents
            self.create_documents(student)
            
            # Create notes
            self.create_notes(student)
            
            # Create guardians
            self.create_guardians(student)
            
            if (i + 1) % 5 == 0:
                self.stdout.write(f"  Created {i + 1} students...")
        
        return students
    
    def create_enrollments(self, student):
        """Create sample enrollments for a student"""
        semesters = ['Fall', 'Spring']
        courses = [
            {'id': uuid.uuid4(), 'code': 'CS101', 'name': 'Intro to Programming'},
            {'id': uuid.uuid4(), 'code': 'CS102', 'name': 'Data Structures'},
            {'id': uuid.uuid4(), 'code': 'MATH101', 'name': 'Calculus I'},
            {'id': uuid.uuid4(), 'code': 'ENG101', 'name': 'English Composition'},
        ]
        
        statuses = ['enrolled', 'completed', 'in_progress']
        grades = ['A', 'B+', 'B', 'C+', 'C']
        
        current_year = date.today().year
        enrollment_year = student.enrollment_date.year
        
        # Use a set to track created enrollments and avoid duplicates
        created_enrollments = set()
        
        for year_offset in range(min(student.current_year, 2)):  # Limit to 2 years max
            for semester_idx, semester in enumerate(semesters):
                year = enrollment_year + year_offset
                if year > current_year:
                    continue
                
                semester_name = f"{semester} {year}"
                
                # Create 2-3 enrollments per semester
                num_courses = random.randint(2, 3)
                selected_courses = random.sample(courses, num_courses)
                
                for course in selected_courses:
                    # Create unique key to check for duplicates
                    enrollment_key = (str(student.id), str(course['id']), semester_name)
                    
                    if enrollment_key not in created_enrollments:
                        created_enrollments.add(enrollment_key)
                        
                        status = random.choice(statuses)
                        
                        grade = None
                        grade_points = None
                        percentage = None
                        
                        if status == 'completed':
                            grade = random.choice(grades)
                            grade_points = random.uniform(2.0, 4.0)
                            percentage = random.uniform(70, 98)
                        
                        Enrollment.objects.create(
                            student=student,
                            program_id=student.program_id,
                            course_id=course['id'],
                            semester=semester_name,
                            academic_year=f"{year}-{year+1}",
                            status=status,
                            grade=grade,
                            grade_points=grade_points,
                            percentage=percentage,
                            attendance_percentage=random.uniform(75, 100),
                            start_date=date(year, 9, 1) if semester == 'Fall' else date(year, 1, 15),
                            end_date=date(year, 12, 15) if semester == 'Fall' else date(year, 5, 15),
                            completion_date=date(year, 12, 20) if status == 'completed' else None,
                        )
    
    def create_documents(self, student):
        """Create sample documents for a student"""
        doc_types = ['id_card', 'transcript', 'photo']
        
        for doc_type in doc_types:
            Document.objects.create(
                student=student,
                document_type=doc_type,
                file_name=f"{doc_type}_{student.student_id}.pdf",
                file_size=random.randint(100000, 1000000),
                mime_type='application/pdf',
                is_verified=random.choice([True, False]),
            )
    
    def create_notes(self, student):
        """Create sample notes for a student"""
        note_contents = [
            "Met with advisor to discuss course selection",
            "Outstanding academic performance this semester",
            "Requested transcript for graduate school application",
            "Parent-teacher conference scheduled",
            "Received academic excellence award"
        ]
        
        for _ in range(random.randint(1, 3)):
            Note.objects.create(
                student=student,
                note_type='general',
                author_id=uuid.uuid4(),
                author_name=random.choice(['Advisor Smith', 'Counselor Jones']),
                author_role='advisor',
                content=random.choice(note_contents),
                is_private=random.choice([True, False]),
                is_important=random.choice([True, False]),
            )
    
    def create_guardians(self, student):
        """Create sample guardians for a student"""
        relationships = ['father', 'mother']
        
        for rel in relationships:
            Guardian.objects.create(
                student=student,
                relationship=rel,
                first_name=random.choice(['Robert', 'Maria', 'David', 'Sarah']),
                last_name=student.last_name,
                email=f"{rel}@family.com",
                phone=f"+1{random.randint(200,999)}{random.randint(200,999)}{random.randint(1000,9999)}",
                address_line1=student.address_line1,
                city=student.city,
                state=student.state,
                postal_code=student.postal_code,
                country=student.country,
                is_emergency_contact=True,
                is_primary=(rel == 'father'),
            )