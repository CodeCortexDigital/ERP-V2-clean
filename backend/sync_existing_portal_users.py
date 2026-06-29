import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()
Student = apps.get_model('education_students', 'Student')
Teacher = apps.get_model('education_academics', 'Teacher')
TeacherProfile = apps.get_model('core_accounts', 'TeacherProfile')
ParentProfile = apps.get_model('core_accounts', 'ParentProfile')
TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')

print("=" * 60)
print("SYNCING EXISTING PORTAL USERS & PROFILES")
print("=" * 60)

# Clear existing profiles to prevent UNIQUE/Integrity errors from previous runs
TeacherProfile.objects.all().delete()
ParentProfile.objects.all().delete()
print("[INFO] Cleared existing TeacherProfile and ParentProfile records.")

# Pre-configuration: Update emails for demo accounts to align them with quick login
first_teacher = Teacher.objects.first()
if first_teacher:
    # Update email in Teacher record
    Teacher.objects.filter(id=first_teacher.id).update(email='teacher@code.com')
    print("[INFO] Configured first teacher as teacher@code.com")

all_active_students = list(Student.objects.filter(is_active=True))
if len(all_active_students) >= 43:
    student43 = all_active_students[42] # 0-indexed
    Student.objects.filter(id=student43.id).update(email='student43@example.com')
    print("[INFO] Configured 43rd student as student43@example.com")
elif all_active_students:
    s_student = all_active_students[0]
    Student.objects.filter(id=s_student.id).update(email='student43@example.com')
    print("[INFO] Configured first student as student43@example.com (fallback)")

# 1. Sync Students
students = Student.objects.filter(is_active=True)
student_count = 0
for student in students:
    if not student.email:
        continue
    user, created = User.objects.get_or_create(
        email=student.email,
        defaults={
            'full_name': student.full_name,
            'phone_number': student.phone,
            'account_status': 'active',
            'is_active': True
        }
    )
    if created or user.check_password('student123') is False:
        user.set_password('student123')
        user.save()
    student_count += 1

print(f"[OK] Synced {student_count} student user accounts.")

# 2. Sync Teachers
teachers = Teacher.objects.filter(is_active=True)
teacher_count = 0
for teacher in teachers:
    if not teacher.email:
        continue
    user, created = User.objects.get_or_create(
        email=teacher.email,
        defaults={
            'full_name': teacher.full_name,
            'phone_number': teacher.phone,
            'account_status': 'active',
            'is_active': True
        }
    )
    if created or user.check_password('teacher123') is False:
        user.set_password('teacher123')
        user.save()
    
    # Create TeacherProfile
    teacher_profile, profile_created = TeacherProfile.objects.get_or_create(
        user=user,
        defaults={
            'employee_id': teacher.employee_id,
            'phone': teacher.phone,
            'qualification': ', '.join(teacher.qualifications) if isinstance(teacher.qualifications, list) else str(teacher.qualifications),
            'specialization': ', '.join(teacher.specializations) if isinstance(teacher.specializations, list) else str(teacher.specializations),
            'hire_date': teacher.joining_date,
            'is_active': teacher.is_active
        }
    )
    
    # Sync classes/subjects
    assignments = TeacherSubjectAssignment.objects.filter(teacher=teacher, is_active=True)
    for ass in assignments:
        if ass.class_subject and ass.class_subject.class_ref:
            teacher_profile.assigned_classes.add(ass.class_subject.class_ref)
        if ass.class_subject and ass.class_subject.subject:
            teacher_profile.assigned_subjects.add(ass.class_subject.subject)
            
    teacher_count += 1

print(f"[OK] Synced {teacher_count} teacher user profiles.")

# 3. Sync Parents
# Group students by guardian phone
from collections import defaultdict
phone_groups = defaultdict(list)
for student in Student.objects.filter(is_active=True):
    if student.guardian_phone:
        clean_phone = ''.join(c for c in student.guardian_phone if c.isdigit())
        if clean_phone:
            phone_groups[clean_phone].append(student)

parent_count = 0
for clean_phone, linked_students in phone_groups.items():
    first_student = linked_students[0]
    parent_email = f"parent.{clean_phone}@school.edu"
    parent_user, created = User.objects.get_or_create(
        email=parent_email,
        defaults={
            'full_name': first_student.father_name or f"Parent of {first_student.full_name}",
            'phone_number': first_student.guardian_phone,
            'account_status': 'active',
            'is_active': True
        }
    )
    if created or parent_user.check_password('parent123') is False:
        parent_user.set_password('parent123')
        parent_user.save()
        
    parent_profile, profile_created = ParentProfile.objects.get_or_create(
        user=parent_user,
        defaults={
            'phone': first_student.guardian_phone,
            'relationship_type': 'father' if first_student.father_name else 'guardian'
        }
    )
    for s in linked_students:
        parent_profile.linked_students.add(s)
        
    parent_count += 1

print(f"[OK] Synced {parent_count} parent user profiles (grouped by guardian phone).")

# 4. Create/Configure Quick Login Demo Accounts (admin, teacher, parent, student)
# Admin
admin_user = User.objects.filter(email='admin@code.com').first()
if admin_user:
    admin_user.set_password('Admin@123')
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.account_status = 'active'
    admin_user.save()
    print("[OK] Verified Admin quick-login credentials (admin@code.com / Admin@123).")

# Teacher
t_user = User.objects.filter(email='teacher@code.com').first()
if t_user:
    t_user.set_password('Teacher@123')
    t_user.save()
    print("[OK] Verified Teacher quick-login credentials (teacher@code.com / Teacher@123).")

# Student
s_user = User.objects.filter(email='student43@example.com').first()
if s_user:
    s_user.set_password('Student@123')
    s_user.save()
    print("[OK] Verified Student quick-login credentials (student43@example.com / Student@123).")

# Parent
p_user, created = User.objects.get_or_create(
    email='parent@code.com',
    defaults={
        'full_name': 'Demo Parent',
        'account_status': 'active',
        'is_active': True
    }
)
p_user.set_password('Parent@123')
p_user.save()

p_profile, _ = ParentProfile.objects.get_or_create(
    user=p_user,
    defaults={
        'phone': '03001234567',
        'relationship_type': 'guardian'
    }
)
# Link to first 2 students
for student in Student.objects.filter(is_active=True)[:2]:
    p_profile.linked_students.add(student)
print("[OK] Verified Parent quick-login credentials (parent@code.com / Parent@123).")

print("=" * 60)
print("PORTAL USER SYNC COMPLETED SUCCESSFULLY!")
print("=" * 60)
