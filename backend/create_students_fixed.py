import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()
from django.apps import apps
from django.utils import timezone

Student = apps.get_model('education_students', 'Student')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')

# Clear existing students and sections
Student.objects.all().delete()
Section.objects.all().delete()
print('Cleared existing students and sections')

# Student name pools
first_names = ['Ahmed', 'Fatima', 'Omar', 'Zainab', 'Bilal', 'Ayesha', 'Hamza', 'Sara', 'Usman', 'Iqra', 
               'Ali', 'Mariam', 'Hassan', 'Laiba', 'Zain', 'Hina', 'Rayyan', 'Eman', 'Ayan', 'Sana']
last_names = ['Khan', 'Ali', 'Ahmed', 'Hassan', 'Malik', 'Chaudhry', 'Raza', 'Shah', 'Begum', 'Akhtar']

students_created = 0
student_counter = 1

for class_obj in SchoolClass.objects.filter(is_active=True).order_by('code'):
    # Create sections A, B, C
    for section_name in ['A', 'B', 'C']:
        section = Section.objects.create(
            class_ref=class_obj,
            name=section_name,
            code=f"{class_obj.code}_{section_name}",
            capacity=class_obj.capacity // 3,
            is_active=True
        )
        print(f'   Created: {class_obj.name} - Section {section_name}')
        
        # Create 2-3 students per section
        for i in range(3):
            name_idx = (student_counter * 7) % len(first_names)
            last_idx = (student_counter * 11) % len(last_names)
            full_name = f"{first_names[name_idx]} {last_names[last_idx]}"
            
            # Create unique email
            email = f"student_{student_counter}_{full_name.lower().replace(' ', '.')}@demo.edu"
            
            # Create student ID
            class_code_clean = class_obj.code.replace('-', '')
            student_id = f"{class_code_clean}{section_name}{i+1}"
            
            phone = f"+92300{str(student_counter).zfill(7)}"
            
            student = Student.objects.create(
                student_id=student_id,
                full_name=full_name,
                email=email,
                phone=phone,
                current_class=class_obj,
                current_section=section,
                enrollment_date=timezone.now().date(),
                is_active=True
            )
            students_created += 1
            student_counter += 1
            print(f'   ✅ {student_id}: {full_name} (Class: {class_obj.name}, Section: {section_name})')

print(f'\n{"="*60}')
print(f'✅ SUCCESS! Created {students_created} students')
print(f'   Classes: {SchoolClass.objects.count()}')
print(f'   Sections: {Section.objects.count()}')
print(f'{"="*60}')
