from django.core.management.base import BaseCommand
from academics.models import Program, Course, AcademicYear, Semester
from datetime import date

class Command(BaseCommand):
    help = 'Seed the database with sample academic data'
    
    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing data')
    
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            Course.objects.all().delete()
            Program.objects.all().delete()
            Semester.objects.all().delete()
            AcademicYear.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Data cleared!'))
        
        self.stdout.write('Seeding academic data...')
        
        # Create Academic Year
        year, _ = AcademicYear.objects.get_or_create(
            name="2024-2025",
            code="2024-25",
            defaults={
                'start_date': date(2024, 9, 1),
                'end_date': date(2025, 6, 30),
                'is_current': True
            }
        )
        self.stdout.write(f"  Created: {year.name}")
        
        # Create Program
        program, _ = Program.objects.get_or_create(
            code="CS",
            defaults={
                'name': "Computer Science",
                'degree_type': "bachelor",
                'duration_years': 4,
                'total_credits': 120,
                'department': "Computing"
            }
        )
        self.stdout.write(f"  Created: {program.code} - {program.name}")
        
        # Create Courses
        course1, _ = Course.objects.get_or_create(
            code="CS101",
            program=program,
            defaults={
                'name': "Introduction to Programming",
                'credits': 3,
                'level': "100"
            }
        )
        self.stdout.write(f"  Created: {course1.code} - {course1.name}")
        
        course2, _ = Course.objects.get_or_create(
            code="CS102",
            program=program,
            defaults={
                'name': "Data Structures",
                'credits': 3,
                'level': "200"
            }
        )
        self.stdout.write(f"  Created: {course2.code} - {course2.name}")
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded data!'))