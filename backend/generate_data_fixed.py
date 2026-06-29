import django
import os
import random
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps

AcademicYear = apps.get_model('education_academics', 'AcademicYear')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
Student = apps.get_model('education_students', 'Student')

print("=" * 60)
print("GENERATING SCHOOL DATA")
print("=" * 60)

# Pakistani names
boys_names = ['Ahmed', 'Ali', 'Hamza', 'Hassan', 'Hussain', 'Omar', 'Umar', 'Bilal', 'Saad', 'Zain', 'Rayan', 'Ayaan', 'Ibrahim', 'Muhammad', 'Abdullah', 'Haris', 'Saif', 'Fahad']
girls_names = ['Fatima', 'Zainab', 'Ayesha', 'Mariam', 'Sara', 'Hina', 'Sana', 'Sadia', 'Nadia', 'Alishba', 'Eman', 'Hoorain', 'Zara', 'Laiba', 'Manahil', 'Rimsha', 'Dua', 'Hania']
last_names = ['Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Butt', 'Chaudhry', 'Rana', 'Shah', 'Sheikh']

def gen_phone():
    return f"03{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}"

# Get academic year
academic_year = AcademicYear.objects.first()
if not academic_year:
    academic_year = AcademicYear.objects.create(name='2024-2025', start_date=date(2024,9,1), end_date=date(2025,6,30), is_active=True)
print("Academic year ready")

# Get all existing classes
classes = list(SchoolClass.objects.all())
print(f"Found {len(classes)} classes")

if not classes:
    print("No classes found! Please create classes first.")
    exit()

# Clear existing students
old_count = Student.objects.count()
Student.objects.all().delete()
print(f"Cleared {old_count} existing students")

# Generate students
student_counter = 1
total_generated = 0

for school_class in classes:
    sections = Section.objects.filter(class_ref=school_class)
    print(f"\n{school_class.name} - Sections: {sections.count()}")
    
    for section in sections:
        num_students = random.randint(25, 35)
        
        for i in range(num_students):
            if i % 2 == 0:
                name = random.choice(boys_names) + " " + random.choice(last_names)
            else:
                name = random.choice(girls_names) + " " + random.choice(last_names)
            
            student_id = f"STU{str(student_counter).zfill(5)}"
            
            Student.objects.create(
                student_id=student_id,
                full_name=name,
                email=f"{name.lower().replace(' ', '.')}@school.edu",
                phone=gen_phone(),
                father_name=f"{random.choice(last_names)} {random.choice(boys_names)}",
                mother_name=f"{random.choice(last_names)} {random.choice(girls_names)}",
                guardian_phone=gen_phone(),
                admission_date=date(2024, random.randint(8, 11), random.randint(1, 28)),
                current_class=school_class,
                current_section=section,
                is_active=True
            )
            student_counter += 1
            total_generated += 1
        
        print(f"   Section {section.name}: {num_students} students")

print(f"\n" + "=" * 60)
print(f"TOTAL STUDENTS GENERATED: {Student.objects.count()}")
print("=" * 60)
