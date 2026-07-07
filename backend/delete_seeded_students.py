import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.students.models import Student

print("CLEANING UP SEEDED STUDENTS FROM DATABASE")
seeded_count = Student.objects.filter(student_id__startswith='STU').count()
if seeded_count > 0:
    Student.objects.filter(student_id__startswith='STU').delete()
    print(f"Successfully deleted {seeded_count} dummy seeded students!")
else:
    print("No dummy seeded students found in the database.")
