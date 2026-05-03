import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'accounts_project.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(email='admin@example.com').exists():
    user = User.objects.create_superuser(
        email='admin@example.com',
        password='Admin@123456',
        full_name='Admin User',
        is_active=True,
        is_staff=True,
        is_superuser=True
    )
    print('✅ Superuser created successfully!')
    print(f'   Email: {user.email}')
    print(f'   Password: Admin@123456')
else:
    print('⚠️ Superuser already exists')
    user = User.objects.get(email='admin@example.com')
    print(f'   Email: {user.email}')
    print(f'   Is Superuser: {user.is_superuser}')





