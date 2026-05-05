import django
import os
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps

AcademicYear = apps.get_model('education_academics', 'AcademicYear')
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

# 2. Create Classes
classes_data = [
    # Primary (Play Group to Grade 5)
    ('Play Group', 'PG'),
    ('Nursery', 'NUR'),
    ('Prep', 'PREP'),
    ('Grade 1', 'G1'),
    ('Grade 2', 'G2'),
    ('Grade 3', 'G3'),
    ('Grade 4', 'G4'),
    ('Grade 5', 'G5'),
    
    # Middle (Grade 6-8)
    ('Grade 6', 'G6'),
    ('Grade 7', 'G7'),
    ('Grade 8', 'G8'),
    
    # Matric (Grade 9-10) - Science & General
    ('Grade 9 (Science)', 'G9_SCI'),
    ('Grade 9 (General)', 'G9_GEN'),
    ('Grade 10 (Science)', 'G10_SCI'),
    ('Grade 10 (General)', 'G10_GEN'),
    
    # FSc (Grade 11-12)
    ('FSc Pre-Engineering (11)', 'FSC_E_11'),
    ('FSc Pre-Engineering (12)', 'FSC_E_12'),
    ('FSc Pre-Medical (11)', 'FSC_M_11'),
    ('FSc Pre-Medical (12)', 'FSC_M_12'),
    ('ICS (11)', 'ICS_11'),
    ('ICS (12)', 'ICS_12'),
]

print("\n📚 Creating Classes:")
created_classes = {}

for name, code in classes_data:
    school_class, created = SchoolClass.objects.get_or_create(
        code=code,
        defaults={
            'name': name,
            'academic_year': academic_year,
            'capacity': 100,
            'is_active': True
        }
    )
    created_classes[code] = school_class
    if created:
        print(f"  ✅ Created: {name} ({code})")

# 3. Create Sections
print("\n📚 Creating Sections:")

section_config = {
    # Primary (Play Group to Grade 5) - 3 sections
    'PG': ['A', 'B', 'C'],
    'NUR': ['A', 'B', 'C'],
    'PREP': ['A', 'B', 'C'],
    'G1': ['A', 'B', 'C'],
    'G2': ['A', 'B', 'C'],
    'G3': ['A', 'B', 'C'],
    'G4': ['A', 'B', 'C'],
    'G5': ['A', 'B', 'C'],
    
    # Middle (Grade 6-8) - 2 sections
    'G6': ['A', 'B'],
    'G7': ['A', 'B'],
    'G8': ['A', 'B'],
    
    # Matric - Girls/Boys separate
    'G9_SCI': ['Girls', 'Boys'],
    'G9_GEN': ['Girls', 'Boys'],
    'G10_SCI': ['Girls', 'Boys'],
    'G10_GEN': ['Girls', 'Boys'],
    
    # FSc - Girls/Boys separate
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

# 4. Summary
print("\n" + "=" * 70)
print("📊 SCHOOL STRUCTURE SUMMARY")
print("=" * 70)
print(f"✅ Academic Years: {AcademicYear.objects.count()}")
print(f"✅ Classes: {SchoolClass.objects.count()}")
print(f"✅ Sections: {Section.objects.count()}")
print(f"✅ Students: {Student.objects.count()}")

print("\n📋 Classes Created:")
for code, cls in created_classes.items():
    sections_count = Section.objects.filter(class_ref=cls).count()
    print(f"   • {cls.name}: {sections_count} sections")

print("\n" + "=" * 70)
print("🎉 SCHOOL HIERARCHY CREATION COMPLETE!")
print("=" * 70)
