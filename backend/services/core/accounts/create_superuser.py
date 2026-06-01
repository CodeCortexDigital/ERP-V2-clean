import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'accounts_project.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

if not ADMIN_PASSWORD:
    raise EnvironmentError('ADMIN_PASSWORD environment variable is required to create the superuser.')

if not User.objects.filter(email=ADMIN_EMAIL).exists():
    user = User.objects.create_superuser(
        email=ADMIN_EMAIL,
        password=ADMIN_PASSWORD,
        full_name='Admin User',
        is_active=True,
        is_staff=True,
        is_superuser=True
    )
    print('✅ Superuser created successfully!')
    print(f'   Email: {user.email}')
else:
    print('⚠️ Superuser already exists')
    user = User.objects.get(email=ADMIN_EMAIL)
    print(f'   Email: {user.email}')
    print(f'   Is Superuser: {user.is_superuser}')





