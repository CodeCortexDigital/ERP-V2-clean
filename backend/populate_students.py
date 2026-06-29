import sys
import os
import django
from django.db import connection

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.students.models import Student
from services.education.academics.models import SchoolClass, Section

# Turn off foreign keys temporarily for clean table wipe
with connection.cursor() as cursor:
    cursor.execute("PRAGMA foreign_keys = OFF;")
    cursor.execute("DELETE FROM education_students_student;")
    cursor.execute("PRAGMA foreign_keys = ON;")
print("HARD DELETED all student database records.")

first_names = [
    'Abdullah', 'Nadia', 'Saif', 'Ayesha', 'Bilal', 'Sana', 'Zain', 'Hamza', 'Fatima', 'Ali',
    'Usman', 'Hassan', 'Maryam', 'Tariq', 'Sara', 'Haris', 'Hania', 'Omar', 'Mahnoor', 'Saad',
    'Danish', 'Laiba', 'Fahad', 'Anum', 'Waqas', 'Rida', 'Kashif', 'Iqra', 'Ahsan', 'Kinza'
]

last_names = [
    'Chaudhry', 'Sheikh', 'Khan', 'Rana', 'Butt', 'Malik', 'Ahmed', 'Shah', 'Iqbal', 'Hussain',
    'Zafar', 'Azhar', 'Raza', 'Mehmood', 'Baig', 'Siddiqui', 'Mirza', 'Qureshi', 'Hashmi', 'Akram',
    'Nawaz', 'Ghafoor', 'Javed', 'Tariq', 'Farooq', 'Bhatti', 'Gill', 'Lodhi', 'Vohra', 'Abbasi'
]

# Generate unique name list
unique_names = []
for fn in first_names:
    for ln in last_names:
        name = f"{fn} {ln}"
        if name not in unique_names:
            unique_names.append(name)

# Sort grades numerically Grade 1 to Grade 10
grades = [f"Grade {i}" for i in range(1, 11)]

student_idx = 1
created_students = []

for grade_name in grades:
    school_class = SchoolClass.objects.filter(name=grade_name).first()
    if not school_class:
        school_class = SchoolClass.objects.create(
            name=grade_name,
            code=f"GRD{int(grade_name.replace('Grade ', '')):02d}",
            description=f"Standard academic {grade_name}"
        )
    
    # Ensure Section A and Section B exist for this class
    for sec_name in ['A', 'B']:
        section = Section.objects.filter(class_ref=school_class, name=sec_name).first()
        if not section:
            section = Section.objects.filter(class_ref=school_class, name=f"Section {sec_name}").first()
        if not section:
            section = Section.objects.create(class_ref=school_class, name=sec_name, capacity=40)
        
        # Create 6 students per section (Total 120 students across 20 sections)
        for s in range(6):
            full_name = unique_names[student_idx - 1]
            phone = f"0300{1000000 + student_idx:07d}" # 100% unique phone numbers
            student_id = f"STU{student_idx:05d}"
            email = f"student{student_idx}@school.edu"
            
            student_obj = Student.objects.create(
                student_id=student_id,
                full_name=full_name,
                email=email,
                phone=phone,
                guardian_name=f"{full_name.split()[1]} Guardian",
                guardian_phone=f"0301{2000000 + student_idx:07d}",
                current_class=school_class,
                current_section=section,
                address="Model Town, Sector H-8",
                city="Lahore",
                is_active=True
            )
            created_students.append(student_obj)
            student_idx += 1

print(f"SUCCESS! Created {len(created_students)} unique students in Django backend database across Grade 1 to Grade 10 (Sections A and B).")
