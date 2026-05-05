import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()
from django.apps import apps
from django.utils import timezone

Student = apps.get_model('education_students', 'Student')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')

# Clear existing students
Student.objects.all().delete()
print('Cleared existing students')

# Student name pools
first_names_male = ['Ahmed', 'Omar', 'Bilal', 'Hamza', 'Usman', 'Ali', 'Hassan', 'Zain', 'Rayyan', 'Ayan']
first_names_female = ['Fatima', 'Zainab', 'Ayesha', 'Sara', 'Iqra', 'Mariam', 'Hina', 'Sana', 'Laiba', 'Eman']
last_names = ['Khan', 'Ali', 'Ahmed', 'Hassan', 'Malik', 'Chaudhry', 'Raza', 'Shah', 'Begum', 'Akhtar']

students_created = 0
student_counter = 1

for class_obj in SchoolClass.objects.filter(is_active=True).order_by('code'):
    # Delete existing sections first
    Section.objects.filter(class_ref=class_obj).delete()
    
    # Create sections A, B, C
    for section_name in ['A', 'B', 'C']:
        section = Section.objects.create(
            class_ref=class_obj,
            name=section_name,
            code=f"{class_obj.code}_{section_name}",
            capacity=class_obj.capacity // 3,
            is_active=True
        )
        print(f'   Created section: {class_obj.name} - Section {section_name}')
        
        # Create 2 students per section
        for i in range(2):
            # Alternate between male and female names
            if student_counter % 2 == 0:
                first_name = first_names_female[student_counter % len(first_names_female)]
            else:
                first_name = first_names_male[student_counter % len(first_names_male)]
            
            last_name = last_names[student_counter % len(last_names)]
            full_name = f"{first_name} {last_name}"
            
            # Create student ID
            class_code_clean = class_obj.code.replace('-', '')
            student_id = f"{class_code_clean}{section_name}{i+1}"
            if len(student_id) > 20:
                student_id = f"{class_obj.code[:8]}{section_name}{i+1}"
            
            email = f"{first_name.lower()}.{last_name.lower()}@demo.edu"
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
            print(f'   ✅ {student_id}: {full_name} ({class_obj.name} - Section {section_name})')

print(f'\n{"="*50}')
print(f'✅ Total students created: {students_created}')
print(f'   Classes: {SchoolClass.objects.count()}')
print(f'   Sections: {Section.objects.count()}')
print(f'{"="*50}')
