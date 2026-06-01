import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'accounts_project.settings')
django.setup()

from accounts.models import User
from django.contrib.auth import authenticate

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

if not ADMIN_PASSWORD:
    raise EnvironmentError('ADMIN_PASSWORD environment variable is required to create the admin user.')

# Delete any existing admin
User.objects.filter(email=ADMIN_EMAIL).delete()

admin = User.objects.create(
    email=ADMIN_EMAIL,
    full_name='Admin User',
    is_superuser=True,
    is_staff=True,
    is_active=True,
    account_status='active',
    preferred_language='en',
    preferred_timezone='UTC'
)
admin.set_password(ADMIN_PASSWORD)
admin.save()

print('=' * 60)
print('SUPERUSER CREATED')
print('=' * 60)
print(f'Email: {admin.email}')
print(f'Is Superuser: {admin.is_superuser}')
print(f'Is Staff: {admin.is_staff}')
print(f'Is Active: {admin.is_active}')
print(f'Account Status: {admin.account_status}')

# Test authentication
print('\n' + '=' * 60)
print('TESTING AUTHENTICATION')
print('=' * 60)

# Test with authenticate function
auth_user = authenticate(username=ADMIN_EMAIL, password=ADMIN_PASSWORD)
if auth_user:
    print(f'✅ Authentication successful: {auth_user.email}')
    print(f'   Is Authenticated: {auth_user.is_authenticated}')
    print(f'   Is Superuser: {auth_user.is_superuser}')
else:
    print('❌ Authentication failed')

# Test direct password check
if admin.check_password(ADMIN_PASSWORD):
    print('✅ Password check passed')
else:
    print('❌ Password check failed')

print('\n' + '=' * 60)
print('ALL USERS:')
print('=' * 60)
for user in User.objects.all():
    print(f'  {user.email} - staff: {user.is_staff}, super: {user.is_superuser}, active: {user.is_active}')