# services/education/timetable/management/commands/check_timetable.py
from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps
from django.db.models import Count

class Command(BaseCommand):
    help = 'Check timetable data consistency'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Checking Timetable Data...')
        
        # Get models
        Timetable = apps.get_model('education_timetable', 'Timetable')
        Period = apps.get_model('education_timetable', 'Period')
        Class = apps.get_model('education_classes', 'Class')
        Teacher = apps.get_model('education_teachers', 'Teacher')
        
        # Check classes
        classes = Class.objects.all()
        self.stdout.write(f'\n📚 Total Classes: {classes.count()}')
        
        for cls in classes:
            periods = Period.objects.filter(timetable__class_id=cls.id).count()
            self.stdout.write(f'  - {cls.name}: {periods} periods')
        
        # Check teachers
        teachers = Teacher.objects.all()
        self.stdout.write(f'\n👨‍🏫 Total Teachers: {teachers.count()}')
        
        for teacher in teachers[:10]:
            periods = Period.objects.filter(teacher_id=teacher.id).count()
            status = '✅ Active' if periods > 0 else '⚠️ Empty'
            self.stdout.write(f'  - {teacher.full_name}: {periods} periods {status}')
        
        # Check duplicates
        self.stdout.write('\n🔍 Checking for duplicates...')
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT name, COUNT(*) as count 
                FROM education_classes_class 
                GROUP BY name 
                HAVING COUNT(*) > 1
            """)
            duplicates = cursor.fetchall()
            if duplicates:
                self.stdout.write('⚠️ Duplicate classes found:')
                for name, count in duplicates:
                    self.stdout.write(f'  - {name}: {count} duplicates')
            else:
                self.stdout.write('✅ No duplicate classes found')
