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
print("📚 ADDING ADDITIONAL STUDENTS")
print("=" * 60)

# Pakistani names
boys_names = ['Ahmed', 'Ali', 'Hamza', 'Hassan', 'Hussain', 'Omar', 'Umar', 'Bilal', 'Saad', 'Zain']
girls_names = ['Fatima', 'Zainab', 'Ayesha', 'Mariam', 'Sara', 'Hina', 'Sana', 'Sadia', 'Nadia', 'Alishba']
last_names = ['Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Butt', 'Chaudhry', 'Rana', 'Shah']

def gen_phone():
    return f"03{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}"

# Get academic year
academic_year = AcademicYear.objects.first()
if not academic_year:
    academic_year = AcademicYear.objects.create(name='2024-2025', start_date=date(2024,9,1), end_date=date(2025,6,30), is_current=True)

# Get all classes
classes = list(SchoolClass.objects.all())
print(f"Found {len(classes)} classes")

existing_count = Student.objects.count()
print(f"Existing students: {existing_count}")

# Add 15-20 students per class
new_count = 0

for school_class in classes:
    sections = Section.objects.filter(class_ref=school_class)
    
    for section in sections:
        # Add 15-20 students per section
        num_to_add = random.randint(15, 20)
        
        for i in range(num_to_add):
            # Make sure we don't create duplicates
            name = random.choice(boys_names if i % 2 == 0 else girls_names) + " " + random.choice(last_names)
            student_id = f"STU{str(existing_count + new_count + 1).zfill(4)}"
            
            # Check if student already exists by email
            email = f"{name.lower().replace(' ', '.')}@school.edu"
            if not Student.objects.filter(email=email).exists():
                Student.objects.create(
                    student_id=student_id,
                    full_name=name,
                    email=email,
                    phone=gen_phone(),
                    father_name=f"{random.choice(last_names)} {random.choice(boys_names)}",
                    mother_name=f"{random.choice(last_names)} {random.choice(girls_names)}",
                    guardian_phone=gen_phone(),
                    enrollment_date=date(2024, random.randint(8, 11), random.randint(1, 28)),
                    current_class=school_class,
                    current_section=section,
                    current_academic_year=academic_year,
                    is_active=True
                )
                new_count += 1
        
        print(f"  {school_class.name} - {section.name}: +{num_to_add} students")

print(f"\n✅ TOTAL STUDENTS: {Student.objects.count()} (added {new_count} new ones)")
print("=" * 60)
