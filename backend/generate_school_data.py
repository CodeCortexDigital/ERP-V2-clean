import django
import os
import random
from datetime import date, timedelta
from faker import Faker

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps
from django.contrib.auth import get_user_model

# Get models
AcademicYear = apps.get_model('education_academics', 'AcademicYear')
Program = apps.get_model('education_academics', 'Program')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
Course = apps.get_model('education_academics', 'Course')
Student = apps.get_model('education_students', 'Student')
Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
Exam = apps.get_model('education_exams', 'Exam')
ExamResult = apps.get_model('education_exams', 'ExamResult')
Invoice = apps.get_model('education_finance', 'Invoice')
Payment = apps.get_model('education_finance', 'Payment')
FeeStructure = apps.get_model('education_finance', 'FeeStructure')

fake = Faker('en_PK')  # Pakistan locale

print("=" * 60)
print("📚 GENERATING COMPLETE SCHOOL DATA")
print("=" * 60)

# ============================================================
# 1. CREATE ACADEMIC YEAR
# ============================================================
print("\n📅 1. Creating Academic Years...")

academic_year_2024, _ = AcademicYear.objects.get_or_create(
    name='2024-2025',
    defaults={
        'start_date': date(2024, 9, 1),
        'end_date': date(2025, 6, 30),
        'is_current': True,
        'is_active': True
    }
)
academic_year_2025, _ = AcademicYear.objects.get_or_create(
    name='2025-2026',
    defaults={
        'start_date': date(2025, 9, 1),
        'end_date': date(2026, 6, 30),
        'is_current': False,
        'is_active': True
    }
)
print("✅ Academic years created")

# ============================================================
# 2. CREATE PROGRAMS (for higher classes)
# ============================================================
print("\n🎓 2. Creating Programs...")

programs = [
    {'code': 'PREP', 'name': 'Primary Education', 'duration_years': 5},
    {'code': 'MID', 'name': 'Middle School', 'duration_years': 3},
    {'code': 'MATRIC', 'name': 'Matriculation', 'duration_years': 2},
    {'code': 'FSC_PRE_ENG', 'name': 'F.Sc Pre-Engineering', 'duration_years': 2},
    {'code': 'FSC_PRE_MED', 'name': 'F.Sc Pre-Medical', 'duration_years': 2},
    {'code': 'ICS', 'name': 'ICS (Computer Science)', 'duration_years': 2},
    {'code': 'BS_CS', 'name': 'BS Computer Science', 'duration_years': 4},
    {'code': 'BS_SE', 'name': 'BS Software Engineering', 'duration_years': 4},
    {'code': 'BBA', 'name': 'BBA', 'duration_years': 4},
]

for prog_data in programs:
    program, created = Program.objects.get_or_create(
        code=prog_data['code'],
        defaults={
            'name': prog_data['name'],
            'duration_years': prog_data['duration_years'],
            'is_active': True
        }
    )
    if created:
        print(f"  ✅ Created: {prog_data['name']}")

# ============================================================
# 3. CREATE CLASSES (Grade 0 to Grade 10 + College)
# ============================================================
print("\n🏫 3. Creating Classes and Sections...")

# Primary Classes (Grade 0-4)
primary_classes = [
    {'name': 'Play Group', 'code': 'PG', 'grade': 0, 'program': 'PREP'},
    {'name': 'Nursery', 'code': 'NUR', 'grade': 1, 'program': 'PREP'},
    {'name': 'Prep', 'code': 'PREP', 'grade': 2, 'program': 'PREP'},
    {'name': 'Grade 1', 'code': 'G1', 'grade': 3, 'program': 'PREP'},
    {'name': 'Grade 2', 'code': 'G2', 'grade': 4, 'program': 'PREP'},
    {'name': 'Grade 3', 'code': 'G3', 'grade': 5, 'program': 'PREP'},
    {'name': 'Grade 4', 'code': 'G4', 'grade': 6, 'program': 'PREP'},
    {'name': 'Grade 5', 'code': 'G5', 'grade': 7, 'program': 'PREP'},
]

# Middle Classes (Grade 6-8)
middle_classes = [
    {'name': 'Grade 6', 'code': 'G6', 'grade': 8, 'program': 'MID'},
    {'name': 'Grade 7', 'code': 'G7', 'grade': 9, 'program': 'MID'},
    {'name': 'Grade 8', 'code': 'G8', 'grade': 10, 'program': 'MID'},
]

# Matric Classes (Grade 9-10)
matric_classes = [
    {'name': 'Grade 9', 'code': 'G9', 'grade': 11, 'program': 'MATRIC'},
    {'name': 'Grade 10', 'code': 'G10', 'grade': 12, 'program': 'MATRIC'},
]

# College/Intermediate Classes (Grade 11-12)
college_classes = [
    {'name': 'F.Sc Pre-Engineering (11)', 'code': 'FSC_E_11', 'grade': 13, 'program': 'FSC_PRE_ENG'},
    {'name': 'F.Sc Pre-Engineering (12)', 'code': 'FSC_E_12', 'grade': 14, 'program': 'FSC_PRE_ENG'},
    {'name': 'F.Sc Pre-Medical (11)', 'code': 'FSC_M_11', 'grade': 13, 'program': 'FSC_PRE_MED'},
    {'name': 'F.Sc Pre-Medical (12)', 'code': 'FSC_M_12', 'grade': 14, 'program': 'FSC_PRE_MED'},
    {'name': 'ICS (11)', 'code': 'ICS_11', 'grade': 13, 'program': 'ICS'},
    {'name': 'ICS (12)', 'code': 'ICS_12', 'grade': 14, 'program': 'ICS'},
]

# University Classes (BS Programs)
bs_classes = [
    {'name': 'BS CS Semester 1', 'code': 'BS_CS_1', 'grade': 15, 'program': 'BS_CS'},
    {'name': 'BS CS Semester 2', 'code': 'BS_CS_2', 'grade': 16, 'program': 'BS_CS'},
    {'name': 'BS CS Semester 3', 'code': 'BS_CS_3', 'grade': 17, 'program': 'BS_CS'},
    {'name': 'BS CS Semester 4', 'code': 'BS_CS_4', 'grade': 18, 'program': 'BS_CS'},
    {'name': 'BS SE Semester 1', 'code': 'BS_SE_1', 'grade': 15, 'program': 'BS_SE'},
    {'name': 'BS SE Semester 2', 'code': 'BS_SE_2', 'grade': 16, 'program': 'BS_SE'},
    {'name': 'BBA Semester 1', 'code': 'BBA_1', 'grade': 15, 'program': 'BBA'},
    {'name': 'BBA Semester 2', 'code': 'BBA_2', 'grade': 16, 'program': 'BBA'},
]

all_classes = primary_classes + middle_classes + matric_classes + college_classes + bs_classes

# Section configuration: For lower classes (1-8) - 4 sections (A, B, C, D)
# For higher classes - separate boys/girls sections

created_classes = {}

for cls_data in all_classes:
    # Determine sections based on grade
    grade = cls_data['grade']
    
    if grade <= 10:  # Up to Grade 10
        sections = ['A', 'B', 'C', 'D']
        is_gender_separate = False
    elif grade <= 12:  # Grade 11-12 (College)
        sections = ['Boys', 'Girls']
        is_gender_separate = True
    else:  # University level
        sections = ['Morning', 'Evening']
        is_gender_separate = False
    
    # Get program
    program = Program.objects.get(code=cls_data['program'])
    
    # Create class
    school_class, created = SchoolClass.objects.get_or_create(
        code=cls_data['code'],
        defaults={
            'name': cls_data['name'],
            'academic_year': academic_year_2024,
            'program': program,
            'capacity': 40 * len(sections),
            'is_active': True
        }
    )
    
    if created:
        print(f"  ✅ Created class: {cls_data['name']}")
    
    created_classes[cls_data['code']] = school_class
    
    # Create sections
    for section_name in sections:
        section, sec_created = Section.objects.get_or_create(
            class_ref=school_class,
            code=f"{cls_data['code']}_{section_name[:2]}",
            defaults={
                'name': section_name,
                'capacity': 40,
                'is_active': True
            }
        )
        if sec_created:
            print(f"      📚 Section: {section_name}")

# ============================================================
# 4. GENERATE STUDENTS (1000+)
# ============================================================
print("\n👨‍🎓 4. Generating Students...")

# Pakistani names data
boys_names = [
    'Ahmed', 'Ali', 'Hamza', 'Hassan', 'Hussain', 'Omar', 'Umar', 'Bilal', 'Saad', 'Zain',
    'Rayan', 'Ayaan', 'Ibrahim', 'Muhammad', 'Abdullah', 'Abdul', 'Haris', 'Saif', 'Fahad',
    'Shahzaib', 'Danish', 'Usman', 'Waqas', 'Noman', 'Sultan', 'Faisal', 'Imran', 'Junaid'
]

girls_names = [
    'Fatima', 'Zainab', 'Ayesha', 'Mariam', 'Sara', 'Hina', 'Sana', 'Sadia', 'Nadia', 'Alishba',
    'Eman', 'Hoorain', 'Zara', 'Laiba', 'Manahil', 'Rimsha', 'Dua', 'Hania', 'Iqra', 'Maham'
]

last_names = [
    'Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Butt', 'Chaudhry', 'Rana', 'Shah', 'Sheikh',
    'Siddiqui', 'Hashmi', 'Naqvi', 'Bukhari', 'Gilani', 'Qureshi', 'Syed', 'Mirza', 'Abbasi'
]

def generate_student_name(gender, grade):
    if gender == 'boy' or (grade < 11 and random.choice(['boy', 'girl']) == 'boy' and not (grade >= 9 and grade <= 10)):
        first = random.choice(boys_names)
        gender_code = 'M'
    else:
        first = random.choice(girls_names)
        gender_code = 'F'
    last = random.choice(last_names)
    return f"{first} {last}", gender_code

def generate_pak_phone():
    return f"03{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}"

# Delete existing students to start fresh
Student.objects.all().delete()
print("🧹 Cleared existing students")

total_students = 0
student_counter = 1

# Generate students for each class
for class_code, school_class in created_classes.items():
    sections = Section.objects.filter(class_ref=school_class)
    grade = [c for c in all_classes if c['code'] == class_code][0]['grade']
    
    # Determine number of students per class (30-45 per section)
    students_per_section = random.randint(30, 45)
    
    for section in sections:
        section_students = []
        for i in range(students_per_section):
            name, gender = generate_student_name('', grade)
            student_id = f"STU{str(student_counter).zfill(6)}"
            
            # Generate realistic dates
            enrollment_date = date(2024, random.randint(8, 11), random.randint(1, 28))
            
            # Guardian names
            father_name = f"{random.choice(last_names)} {fake.first_name_male()}"
            mother_name = f"{random.choice(last_names)} {fake.first_name_female()}"
            
            student = Student(
                student_id=student_id,
                full_name=name,
                email=f"{name.lower().replace(' ', '.')}@school.edu.pk",
                phone=generate_pak_phone(),
                father_name=father_name,
                mother_name=mother_name,
                guardian_phone=generate_pak_phone(),
                enrollment_date=enrollment_date,
                program=school_class.program.name if school_class.program else '',
                current_semester=1,
                current_class=school_class,
                current_section=section,
                current_academic_year=academic_year_2024,
                is_active=True
            )
            section_students.append(student)
            student_counter += 1
        
        # Bulk create students for this section
        Student.objects.bulk_create(section_students)
        total_students += len(section_students)
        print(f"  ✅ {school_class.name} - {section.name}: {len(section_students)} students")

print(f"\n✅ Total students created: {total_students}")

# ============================================================
# 5. GENERATE ATTENDANCE RECORDS
# ============================================================
print("\n📅 5. Generating Attendance Records...")

Attendance.objects.all().delete()

attendance_statuses = ['present', 'present', 'present', 'present', 'absent', 'late']
attendance_count = 0

students = Student.objects.all()
start_date = date(2024, 9, 1)
end_date = date(2025, 3, 31)

current_date = start_date
attendance_batch = []

while current_date <= end_date:
    # Skip weekends
    if current_date.weekday() >= 5:
        current_date += timedelta(days=1)
        continue
    
    for student in students:
        status = random.choice(attendance_statuses)
        attendance_batch.append(Attendance(
            student=student,
            date=current_date,
            status=status,
            course_id='GEN101',
            remarks=''
        ))
        attendance_count += 1
        
        # Batch save every 1000 records
        if len(attendance_batch) >= 1000:
            Attendance.objects.bulk_create(attendance_batch)
            attendance_batch = []
    
    current_date += timedelta(days=1)

# Save remaining
if attendance_batch:
    Attendance.objects.bulk_create(attendance_batch)

print(f"✅ Total attendance records created: {attendance_count}")

# ============================================================
# 6. CREATE EXAM AND RESULTS
# ============================================================
print("\n📝 6. Creating Exams and Results...")

Exam.objects.all().delete()
ExamResult.objects.all().delete()

exams = [
    {'title': 'Mid Term Examination', 'code': 'MID_2024', 'date': date(2024, 12, 15)},
    {'title': 'Final Term Examination', 'code': 'FINAL_2025', 'date': date(2025, 3, 20)},
]

for exam_data in exams:
    exam, _ = Exam.objects.get_or_create(
        code=exam_data['code'],
        defaults={
            'title': exam_data['title'],
            'exam_date': exam_data['date'],
            'duration_minutes': 180,
            'total_marks': 100,
            'passing_marks': 40,
            'status': 'completed',
            'is_active': True
        }
    )
    
    # Generate results for all students
    results_batch = []
    for student in students:
        marks = random.randint(40, 98)
        result = ExamResult(
            exam=exam,
            student=student,
            student_name=student.full_name,
            roll_number=student.student_id,
            obtained_marks=marks,
            total_marks=100,
            remarks=''
        )
        results_batch.append(result)
    
    ExamResult.objects.bulk_create(results_batch)
    print(f"  ✅ {exam_data['title']}: {len(results_batch)} results")

# ============================================================
# 7. CREATE FEE STRUCTURE AND INVOICES
# ============================================================
print("\n💰 7. Creating Fee Structure and Invoices...")

# Fee structures by grade level
fee_structures = [
    {'name': 'Primary School Fee', 'grade_range': (0, 5), 'amount': 5000},
    {'name': 'Middle School Fee', 'grade_range': (6, 8), 'amount': 7000},
    {'name': 'Matric Fee', 'grade_range': (9, 10), 'amount': 10000},
    {'name': 'College Fee', 'grade_range': (11, 12), 'amount': 15000},
    {'name': 'University Fee', 'grade_range': (13, 20), 'amount': 25000},
]

for fs_data in fee_structures:
    FeeStructure.objects.get_or_create(
        name=fs_data['name'],
        defaults={
            'amount': fs_data['amount'],
            'frequency': 'monthly',
            'is_active': True
        }
    )

# Create invoices for students
Invoice.objects.all().delete()
Payment.objects.all().delete()

invoice_count = 0
payment_count = 0

for student in students:
    # Determine fee amount based on class grade
    grade = student.current_class.grade if hasattr(student.current_class, 'grade') else 7
    if grade <= 5:
        amount = 5000
    elif grade <= 8:
        amount = 7000
    elif grade <= 10:
        amount = 10000
    elif grade <= 12:
        amount = 15000
    else:
        amount = 25000
    
    # Create monthly invoices (Sep to Mar)
    for month in range(9, 13):  # Sep-Dec
        due_date = date(2024, month, 15)
        status = random.choice(['paid', 'paid', 'pending', 'overdue'])
        paid_amount = amount if status == 'paid' else (amount * 0.5 if status == 'pending' else 0)
        
        Invoice.objects.create(
            invoice_number=f"INV-2024-{student.student_id}-{month}",
            student=student,
            amount=amount,
            paid_amount=paid_amount,
            due_date=due_date,
            status=status
        )
        invoice_count += 1
        
        # Create payment record if paid
        if paid_amount > 0:
            Payment.objects.create(
                payment_id=f"PAY-2024-{student.student_id}-{month}",
                invoice=Invoice.objects.last(),
                amount=paid_amount,
                payment_date=due_date - timedelta(days=random.randint(1, 10)),
                payment_method=random.choice(['cash', 'bank_transfer', 'card']),
                status='completed'
            )
            payment_count += 1

print(f"✅ Invoices created: {invoice_count}")
print(f"✅ Payments created: {payment_count}")

# ============================================================
# 8. FINAL SUMMARY
# ============================================================
print("\n" + "=" * 60)
print("📊 FINAL SUMMARY")
print("=" * 60)
print(f"\n✅ Academic Years: 2")
print(f"✅ Programs: {Program.objects.count()}")
print(f"✅ Classes: {SchoolClass.objects.count()}")
print(f"✅ Sections: {Section.objects.count()}")
print(f"✅ Students: {Student.objects.count()}")
print(f"✅ Attendance Records: {Attendance.objects.count()}")
print(f"✅ Exams: {Exam.objects.count()}")
print(f"✅ Exam Results: {ExamResult.objects.count()}")
print(f"✅ Invoices: {Invoice.objects.count()}")
print(f"✅ Payments: {Payment.objects.count()}")

print("\n" + "=" * 60)
print("🎉 SCHOOL DATA GENERATION COMPLETE!")
print("=" * 60)
