import django
import os
import random
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps

Teacher = apps.get_model('education_academics', 'Teacher')
TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Subject = apps.get_model('education_academics', 'Subject')
ClassSubject = apps.get_model('education_academics', 'ClassSubject')
AcademicYear = apps.get_model('education_academics', 'AcademicYear')

print("=" * 60)
print("👨‍🏫 CREATING SAMPLE TEACHERS")
print("=" * 60)

# Pakistani teacher names
teacher_names = [
    ('Dr. Ahmed Raza', 'ahmed.raza@school.edu'),
    ('Prof. Sara Khan', 'sara.khan@school.edu'),
    ('Ms. Fatima Ali', 'fatima.ali@school.edu'),
    ('Mr. Hassan Malik', 'hassan.malik@school.edu'),
    ('Dr. Ayesha Hussain', 'ayesha.hussain@school.edu'),
    ('Mr. Bilal Ahmed', 'bilal.ahmed@school.edu'),
    ('Ms. Zainab Sheikh', 'zainab.sheikh@school.edu'),
    ('Prof. Omar Farooq', 'omar.farooq@school.edu'),
    ('Dr. Mariam Butt', 'mariam.butt@school.edu'),
    ('Mr. Saad Rana', 'saad.rana@school.edu'),
    ('Ms. Hina Chaudhry', 'hina.chaudhry@school.edu'),
    ('Prof. Usman Shah', 'usman.shah@school.edu'),
]

qualifications = [
    ['M.Sc Mathematics', 'B.Ed'],
    ['M.A English', 'M.Ed'],
    ['M.Sc Physics', 'PhD Physics'],
    ['M.A Urdu', 'M.Ed'],
    ['M.Sc Chemistry', 'PhD Chemistry'],
    ['M.A History', 'M.Ed'],
    ['M.Sc Biology', 'PhD Biology'],
    ['M.Com', 'MBA', 'PhD Commerce'],
    ['M.A Islamic Studies', 'M.Ed'],
    ['M.Sc Computer Science', 'M.Tech'],
]

subjects = ['Mathematics', 'English', 'Physics', 'Urdu', 'Chemistry', 'History', 'Biology', 'Commerce', 'Islamic Studies', 'Computer Science']

subject_codes = {
    'Mathematics': 'MATH',
    'English': 'ENG',
    'Physics': 'PHY',
    'Urdu': 'URD',
    'Chemistry': 'CHEM',
    'History': 'HIST',
    'Biology': 'BIO',
    'Commerce': 'COMM',
    'Islamic Studies': 'ISLM',
    'Computer Science': 'CS'
}

def gen_phone():
    return f"03{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}"

# Get academic year
academic_year = AcademicYear.objects.filter(is_active=True).first()
if not academic_year:
    academic_year = AcademicYear.objects.create(
        name='2025-2026',
        start_date=date(2025, 9, 1),
        end_date=date(2026, 6, 30),
        is_active=True
    )

print("✅ Academic year ready")

# Get existing subjects
existing_subjects = list(Subject.objects.all())
if not existing_subjects:
    print("❌ No subjects found! Please create subjects first.")
    exit()

print(f"✅ Found {len(existing_subjects)} existing subjects")

# Use existing subjects for assignments
subjects = [s.name for s in existing_subjects]

# Get all classes
classes = list(SchoolClass.objects.all())
if not classes:
    print("❌ No classes found! Please create classes first.")
    exit()

print(f"✅ Found {len(classes)} classes")

# Create teachers
created_count = 0
for i, (full_name, email) in enumerate(teacher_names):
    # Split name
    name_parts = full_name.split()
    first_name = name_parts[1] if len(name_parts) > 1 else name_parts[0]
    last_name = name_parts[-1]

    # Create employee ID
    emp_id = f"TCH-{i+1:03d}"

    teacher, created = Teacher.objects.get_or_create(
        email=email,  # Use email as unique identifier
        defaults={
            'employee_id': emp_id,
            'full_name': full_name,
            'phone': gen_phone(),
            'qualifications': random.choice(qualifications),
            'specializations': [random.choice(subjects)],
            'experience_years': random.randint(3, 15),
            'joining_date': date.today().replace(year=date.today().year - random.randint(1, 10)),
            'is_active': True
        }
    )

    if created:
        print(f"  ✅ Created teacher: {full_name} ({emp_id})")
        created_count += 1

        # Assign teacher to some classes/subjects
        num_assignments = random.randint(1, 3)
        assigned_subjects = random.sample(subjects, min(num_assignments, len(subjects)))

        for subject_name in assigned_subjects:
            subject = Subject.objects.filter(name=subject_name).first()
            if subject:
                # Find classes that have this subject
                class_subjects = ClassSubject.objects.filter(subject=subject)
                if class_subjects.exists():
                    # Pick a random class-subject assignment
                    class_subject = random.choice(list(class_subjects))

                    # Create teacher assignment
                    assignment, _ = TeacherSubjectAssignment.objects.get_or_create(
                        teacher=teacher,
                        class_subject=class_subject,
                        academic_year=academic_year,
                        defaults={
                            'is_primary': random.choice([True, False]),
                            'assigned_date': date.today(),
                            'is_active': True
                        }
                    )

print(f"\n✅ Created {created_count} teachers")
print("✅ Teacher assignments completed")

# Summary
total_teachers = Teacher.objects.filter(is_active=True).count()
total_assignments = TeacherSubjectAssignment.objects.filter(is_active=True).count()
print(f"\n📊 SUMMARY:")
print(f"   Total Active Teachers: {total_teachers}")
print(f"   Total Active Assignments: {total_assignments}")
print(f"   Average assignments per teacher: {total_assignments/total_teachers:.1f}" if total_teachers > 0 else "   No teachers found")