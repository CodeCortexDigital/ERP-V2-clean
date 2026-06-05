# assign_roles.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# Add role field if missing
if not hasattr(User, 'role'):
    from django.db import models
    User.add_to_class('role', models.CharField(max_length=20, default='student', blank=True))
    print('✅ Added role field to User model')

# Assign roles
User.objects.filter(is_superuser=True).update(role='admin')
User.objects.filter(is_staff=True, is_superuser=False).update(role='teacher')
User.objects.filter(role='').update(role='student')

print(f'Admins: {User.objects.filter(role="admin").count()}')
print(f'Teachers: {User.objects.filter(role="teacher").count()}')
print(f'Students: {User.objects.filter(role="student").count()}')
print('✅ Roles assigned successfully!')
