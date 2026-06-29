import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from django.apps import apps
from services.core.accounts.models import User
from services.education.students.models import Student

Teacher = apps.get_model('education_academics', 'Teacher')

print("=" * 60)
print("[START] SYNCING ALL USER ACCOUNT CREDENTIALS")
print("=" * 60)

# 1. Sync Student Accounts
students = Student.objects.filter(is_active=True)
student_count = 0
for s in students:
    email = s.email if s.email else f"{s.student_id.lower()}@example.com"
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        user = User.objects.create(
            email=email,
            full_name=s.full_name,
            is_active=True
        )
    user.set_password('Student@123')
    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.save()
    student_count += 1

print(f"[OK] {student_count} Student user accounts updated with password 'Student@123'.")

# 2. Sync Teacher Accounts
teachers = Teacher.objects.all()
teacher_count = 0
for t in teachers:
    email = t.email if t.email else f"teacher_{t.id}@example.com font"
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        user = User.objects.create(
            email=email,
            full_name=t.full_name,
            is_active=True
        )
    user.set_password('Teacher@123')
    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.save()
    teacher_count += 1

print(f"[OK] {teacher_count} Teacher user accounts updated with password 'Teacher@123'.")

# 3. Ensure Admin & Parent Credentials
admin_user, _ = User.objects.get_or_create(email='admin@code.com', defaults={'full_name': 'System Admin', 'is_staff': True, 'is_superuser': True})
admin_user.set_password('Admin@123')
admin_user.failed_login_attempts = 0
admin_user.save()

parent_user, _ = User.objects.get_or_create(email='parent@code.com', defaults={'full_name': 'Parent User'})
parent_user.set_password('Parent@123')
parent_user.failed_login_attempts = 0
parent_user.save()

print("=" * 60)
print("[DONE] ALL ACCOUNTS CREDENTIALS SYNCHRONIZED SUCCESSFULLY!")
print("=" * 60)
