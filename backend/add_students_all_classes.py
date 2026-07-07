import django
import os
import random
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps

SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
Student = apps.get_model('education_students', 'Student')

print("=" * 60)
print("📚 ADDING STUDENTS TO ALL CLASSES")
print("=" * 60)

# Pakistani names
boys_names = ['Ahmed', 'Ali', 'Hamza', 'Hassan', 'Hussain', 'Omar', 'Umar', 'Bilal', 'Saad', 'Zain']
girls_names = ['Fatima', 'Zainab', 'Ayesha', 'Mariam', 'Sara', 'Sana', 'Sadia', 'Nadia', 'Alishba', 'Dua']
last_names = ['Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Butt', 'Chaudhry', 'Rana', 'Shah']

def gen_phone():
    return f"03{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)} {random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}"

# Get all classes
all_classes = list(SchoolClass.objects.all().order_by('name'))
print(f"Total classes: {len(all_classes)}")

# Current student count
current_count = Student.objects.count()
print(f"Current students: {current_count}")

# Track existing students to avoid duplicates
existing_emails = set(Student.objects.values_list('email', flat=True))

# Add students to each class
new_students = []
student_counter = current_count
total_added = 0

for school_class in all_classes:
    current_students = Student.objects.filter(current_class=school_class).count()
    needed = max(0, 12 - current_students)
    
    if needed > 0:
        print(f"  Adding {needed} students to {school_class.name}")
        
        sections = list(Section.objects.filter(class_ref=school_class))
        if not sections:
            continue
            
        for i in range(needed):
            student_counter += 1
            # Alternate between boy and girl names
            if i % 2 == 0:
                name = random.choice(boys_names) + " " + random.choice(last_names)
            else:
                name = random.choice(girls_names) + " " + random.choice(last_names)
            
            email = name.lower().replace(" ", ".") + "@school.edu"
            
            # Ensure unique email
            counter = 1
            original_email = email
            while email in existing_emails:
                email = original_email.replace("@", str(counter) + "@")
                counter += 1
            existing_emails.add(email)
            
            new_students.append(Student(
                student_id=f"STU{str(student_counter).zfill(4)}",
                full_name=name,
                email=email,
                phone=gen_phone(),
                father_name=random.choice(last_names) + " " + random.choice(boys_names),
                mother_name=random.choice(last_names) + " " + random.choice(girls_names),
                guardian_phone=gen_phone(),
                admission_date=date(2024, random.randint(8, 11), random.randint(1, 28)),
                current_class=school_class,
                current_section=sections[i % len(sections)],
                is_active=True
            ))
            total_added += 1

# Bulk create new students
if new_students:
    Student.objects.bulk_create(new_students)
    print(f"\n✅ Added {total_added} new students")

# Final distribution
print("\n📊 FINAL STUDENT DISTRIBUTION:")
from django.db.models import Count
distribution = Student.objects.values('current_class__name').annotate(count=Count('id')).order_by('current_class__name')
classes_with_students = 0
for item in distribution:
    if item['count'] > 0:
        classes_with_students += 1
    print(f"  {item['current_class__name']}: {item['count']} students")

print(f"\n✅ Classes with students: {classes_with_students} / {len(all_classes)}")
print(f"✅ TOTAL STUDENTS: {Student.objects.count()}")
print("=" * 60)
