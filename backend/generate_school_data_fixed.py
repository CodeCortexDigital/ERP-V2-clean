import django
import os
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps
from django.contrib.auth import get_user_model

# Get models
AcademicYear = apps.get_model('education_academics', 'AcademicYear')
Program = apps.get_model('education_academics', 'Program')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
Student = apps.get_model('education_students', 'Student')
Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
Exam = apps.get_model('education_exams', 'Exam')
ExamResult = apps.get_model('education_exams', 'ExamResult')
Invoice = apps.get_model('education_finance', 'Invoice')
Payment = apps.get_model('education_finance', 'Payment')
FeeStructure = apps.get_model('education_finance', 'FeeStructure')

print("=" * 60)
print("📚 GENERATING SCHOOL DATA")
print("=" * 60)

# Pakistani names data (manual since Faker locale issue)
boys_names = [
    'Ahmed', 'Ali', 'Hamza', 'Hassan', 'Hussain', 'Omar', 'Umar', 'Bilal', 'Saad', 'Zain',
    'Rayan', 'Ayaan', 'Ibrahim', 'Muhammad', 'Abdullah', 'Haris', 'Saif', 'Fahad', 'Shahzaib',
    'Danish', 'Usman', 'Waqas', 'Noman', 'Sultan', 'Faisal', 'Imran', 'Junaid'
]

girls_names = [
    'Fatima', 'Zainab', 'Ayesha', 'Mariam', 'Sara', 'Hina', 'Sana', 'Sadia', 'Nadia', 'Alishba',
    'Eman', 'Hoorain', 'Zara', 'Laiba', 'Manahil', 'Rimsha', 'Dua', 'Hania', 'Iqra', 'Maham'
]

last_names = [
    'Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Butt', 'Chaudhry', 'Rana', 'Shah', 'Sheikh',
    'Siddiqui', 'Hashmi', 'Naqvi', 'Bukhari', 'Gilani', 'Qureshi', 'Syed', 'Mirza', 'Abbasi'
]

def generate_phone():
    return f"03{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}"

# 1. Create Academic Year
academic_year, _ = AcademicYear.objects.get_or_create(
    name='2024-2025',
    defaults={
        'start_date': date(2024, 9, 1),
        'end_date': date(2025, 6, 30),
        'is_current': True,
        'is_active': True
    }
)
print("✅ Academic Year ready")

# 2. Create Programs
programs = ['PREP', 'MID', 'MATRIC', 'FSC_PRE_ENG', 'FSC_PRE_MED', 'ICS', 'BS_CS', 'BS_SE', 'BBA']
for prog_code in programs:
    Program.objects.get_or_create(
        code=prog_code,
        defaults={'name': prog_code, 'duration_years': 2, 'is_active': True}
    )
print("✅ Programs ready")

# 3. Create Classes
classes_data = [
    ('Play Group', 'PG', 'PREP'), ('Nursery', 'NUR', 'PREP'), ('Prep', 'PREP', 'PREP'),
    ('Grade 1', 'G1', 'PREP'), ('Grade 2', 'G2', 'PREP'), ('Grade 3', 'G3', 'PREP'),
    ('Grade 4', 'G4', 'PREP'), ('Grade 5', 'G5', 'PREP'),
    ('Grade 6', 'G6', 'MID'), ('Grade 7', 'G7', 'MID'), ('Grade 8', 'G8', 'MID'),
    ('Grade 9', 'G9', 'MATRIC'), ('Grade 10', 'G10', 'MATRIC'),
]

sections_per_class = {'PREP': 4, 'MID': 4, 'MATRIC': 2}  # Boys/Girls for MATRIC

for name, code, prog in classes_data:
    program = Program.objects.get(code=prog)
    school_class, _ = SchoolClass.objects.get_or_create(
        code=code,
        defaults={'name': name, 'academic_year': academic_year, 'program': program, 'capacity': 120, 'is_active': True}
    )
    
    # Create sections
    num_sections = sections_per_class.get(prog, 3)
    for i in range(num_sections):
        section_name = chr(65 + i) if prog != 'MATRIC' else ('Boys' if i == 0 else 'Girls')
        Section.objects.get_or_create(
            class_ref=school_class,
            code=f"{code}_{section_name[:2]}",
            defaults={'name': section_name, 'capacity': 30, 'is_active': True}
        )
    print(f"  ✅ {name}: {num_sections} sections")

# 4. Generate 100+ students
print("\n👨‍🎓 Generating students...")
Student.objects.all().delete()

student_counter = 1
classes = list(SchoolClass.objects.all())

for school_class in classes[:15]:  # Limit to first 15 classes
    sections = Section.objects.filter(class_ref=school_class)
    for section in sections:
        # 35-45 students per section
        num_students = random.randint(35, 45)
        for i in range(num_students):
            # Alternate gender
            if i % 2 == 0:
                name = random.choice(boys_names) + " " + random.choice(last_names)
                gender = 'M'
            else:
                name = random.choice(girls_names) + " " + random.choice(last_names)
                gender = 'F'
            
            student_id = f"STU{str(student_counter).zfill(5)}"
            
            Student.objects.create(
                student_id=student_id,
                full_name=name,
                email=f"{name.lower().replace(' ', '.')}@school.edu",
                phone=generate_phone(),
                father_name=f"{random.choice(last_names)} Ahmed",
                mother_name=f"{random.choice(last_names)} Begum",
                guardian_phone=generate_phone(),
                enrollment_date=date(2024, random.randint(8, 11), random.randint(1, 28)),
                current_class=school_class,
                current_section=section,
                current_academic_year=academic_year,
                is_active=True
            )
            student_counter += 1
    
    print(f"  {school_class.name}: {num_students * sections.count()} students")

print(f"\n✅ Total students: {Student.objects.count()}")

print("\n" + "=" * 60)
print("🎉 DATA GENERATION COMPLETE!")
print("=" * 60)
