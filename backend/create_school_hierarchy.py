import django
import os
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps

AcademicYear = apps.get_model('education_academics', 'AcademicYear')
Program = apps.get_model('education_academics', 'Program')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
Student = apps.get_model('education_students', 'Student')

print("=" * 70)
print("🏫 CREATING COMPLETE SCHOOL HIERARCHY")
print("=" * 70)

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
print("✅ Academic Year: 2024-2025")

# 2. Create Programs
programs_data = [
    {'code': 'PRIMARY', 'name': 'Primary Education', 'duration_years': 5},
    {'code': 'MIDDLE', 'name': 'Middle School', 'duration_years': 3},
    {'code': 'MATRIC', 'name': 'Matriculation', 'duration_years': 2},
    {'code': 'FSC_PRE_ENG', 'name': 'F.Sc Pre-Engineering', 'duration_years': 2},
    {'code': 'FSC_PRE_MED', 'name': 'F.Sc Pre-Medical', 'duration_years': 2},
    {'code': 'ICS', 'name': 'ICS (Computer Science)', 'duration_years': 2},
]

for prog in programs_data:
    program, created = Program.objects.get_or_create(
        code=prog['code'],
        defaults={'name': prog['name'], 'duration_years': prog['duration_years'], 'is_active': True}
    )
    if created:
        print(f"  ✅ Created Program: {prog['name']}")

# 3. Create Classes with proper hierarchy
classes_data = [
    # Primary (Play Group to Grade 5)
    {'name': 'Play Group', 'code': 'PG', 'program': 'PRIMARY', 'order': 0},
    {'name': 'Nursery', 'code': 'NUR', 'program': 'PRIMARY', 'order': 1},
    {'name': 'Prep', 'code': 'PREP', 'program': 'PRIMARY', 'order': 2},
    {'name': 'Grade 1', 'code': 'G1', 'program': 'PRIMARY', 'order': 3},
    {'name': 'Grade 2', 'code': 'G2', 'program': 'PRIMARY', 'order': 4},
    {'name': 'Grade 3', 'code': 'G3', 'program': 'PRIMARY', 'order': 5},
    {'name': 'Grade 4', 'code': 'G4', 'program': 'PRIMARY', 'order': 6},
    {'name': 'Grade 5', 'code': 'G5', 'program': 'PRIMARY', 'order': 7},
    
    # Middle (Grade 6-8)
    {'name': 'Grade 6', 'code': 'G6', 'program': 'MIDDLE', 'order': 8},
    {'name': 'Grade 7', 'code': 'G7', 'program': 'MIDDLE', 'order': 9},
    {'name': 'Grade 8', 'code': 'G8', 'program': 'MIDDLE', 'order': 10},
    
    # Matric (Grade 9-10) with groups
    {'name': 'Grade 9 (Science)', 'code': 'G9_SCI', 'program': 'MATRIC', 'order': 11},
    {'name': 'Grade 9 (General)', 'code': 'G9_GEN', 'program': 'MATRIC', 'order': 12},
    {'name': 'Grade 10 (Science)', 'code': 'G10_SCI', 'program': 'MATRIC', 'order': 13},
    {'name': 'Grade 10 (General)', 'code': 'G10_GEN', 'program': 'MATRIC', 'order': 14},
    
    # FSc (Grade 11-12)
    {'name': 'FSc Pre-Engineering (11)', 'code': 'FSC_E_11', 'program': 'FSC_PRE_ENG', 'order': 15},
    {'name': 'FSc Pre-Engineering (12)', 'code': 'FSC_E_12', 'program': 'FSC_PRE_ENG', 'order': 16},
    {'name': 'FSc Pre-Medical (11)', 'code': 'FSC_M_11', 'program': 'FSC_PRE_MED', 'order': 17},
    {'name': 'FSc Pre-Medical (12)', 'code': 'FSC_M_12', 'program': 'FSC_PRE_MED', 'order': 18},
    {'name': 'ICS (11)', 'code': 'ICS_11', 'program': 'ICS', 'order': 19},
    {'name': 'ICS (12)', 'code': 'ICS_12', 'program': 'ICS', 'order': 20},
]

print("\n📚 Creating Classes:")
created_classes = {}

for cls_data in classes_data:
    program = Program.objects.get(code=cls_data['program'])
    school_class, created = SchoolClass.objects.get_or_create(
        code=cls_data['code'],
        defaults={
            'name': cls_data['name'],
            'academic_year': academic_year,
            'program': program,
            'capacity': 100,
            'is_active': True
        }
    )
    created_classes[cls_data['code']] = school_class
    if created:
        print(f"  ✅ Created: {cls_data['name']} ({cls_data['code']})")

# 4. Create Sections for each class
print("\n📚 Creating Sections:")

# Section configuration
section_config = {
    # Primary (Play Group to Grade 5) - 3 sections: A, B, C
    'PG': ['A', 'B', 'C'],
    'NUR': ['A', 'B', 'C'],
    'PREP': ['A', 'B', 'C'],
    'G1': ['A', 'B', 'C'],
    'G2': ['A', 'B', 'C'],
    'G3': ['A', 'B', 'C'],
    'G4': ['A', 'B', 'C'],
    'G5': ['A', 'B', 'C'],
    
    # Middle (Grade 6-8) - 2 sections: A, B
    'G6': ['A', 'B'],
    'G7': ['A', 'B'],
    'G8': ['A', 'B'],
    
    # Matric Science - Girls/Boys separate
    'G9_SCI': ['Girls', 'Boys'],
    'G9_GEN': ['Girls', 'Boys'],
    'G10_SCI': ['Girls', 'Boys'],
    'G10_GEN': ['Girls', 'Boys'],
    
    # FSc groups - Girls/Boys separate
    'FSC_E_11': ['Girls', 'Boys'],
    'FSC_E_12': ['Girls', 'Boys'],
    'FSC_M_11': ['Girls', 'Boys'],
    'FSC_M_12': ['Girls', 'Boys'],
    'ICS_11': ['Girls', 'Boys'],
    'ICS_12': ['Girls', 'Boys'],
}

for code, sections in section_config.items():
    if code in created_classes:
        school_class = created_classes[code]
        for section_name in sections:
            section_code = f"{code}_{section_name[:2]}"
            section, created = Section.objects.get_or_create(
                class_ref=school_class,
                code=section_code,
                defaults={'name': section_name, 'capacity': 35, 'is_active': True}
            )
            if created:
                print(f"  ✅ {school_class.name} - Section {section_name}")

# 5. Summary
print("\n" + "=" * 70)
print("📊 SCHOOL STRUCTURE SUMMARY")
print("=" * 70)
print(f"✅ Academic Years: {AcademicYear.objects.count()}")
print(f"✅ Programs: {Program.objects.count()}")
print(f"✅ Classes: {SchoolClass.objects.count()}")
print(f"✅ Sections: {Section.objects.count()}")
print(f"✅ Students: {Student.objects.count()}")

print("\n📋 Classes by Level:")
for cls in SchoolClass.objects.all().order_by('program__code'):
    sections_count = Section.objects.filter(class_ref=cls).count()
    students_count = Student.objects.filter(current_class=cls).count()
    print(f"   • {cls.name}: {sections_count} sections, {students_count} students")

print("\n" + "=" * 70)
print("🎉 SCHOOL HIERARCHY CREATION COMPLETE!")
print("=" * 70)
