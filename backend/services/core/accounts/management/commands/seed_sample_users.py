from django.core.management.base import BaseCommand
from django.db import transaction

from services.core.accounts.models import UserProfile, User
from services.rbac_models.models import Role

class Command(BaseCommand):
    help = 'Seed development sample accounts for admin, teacher, parent, and student.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Force update passwords and status for sample users')

    def handle(self, *args, **options):
        force_update = options.get('force', False)

        with transaction.atomic():
            self.stdout.write('Seeding sample roles...')
            roles = {
                'super_admin': 'Super Admin',
                'teacher': 'Teacher',
                'parent': 'Parent',
                'student': 'Student',
                'staff': 'Staff',
            }

            saved_roles = {}
            for role_type, name in roles.items():
                role, created = Role.objects.get_or_create(
                    role_type=role_type,
                    defaults={
                        'name': name,
                        'description': f'Default {name} role for development.',
                        'permissions': {},
                        'is_active': True,
                    },
                )
                saved_roles[role_type] = role
                if created:
                    self.stdout.write(self.style.SUCCESS(f'Created role: {name}'))

            self.stdout.write('Seeding sample users...')
            sample_users = [
                {
                    'email': 'admin@code.com',
                    'password': 'Admin@123',
                    'full_name': 'Admin User',
                    'is_superuser': True,
                    'is_staff': True,
                    'role_type': 'super_admin',
                },
                {
                    'email': 'teacher@code.com',
                    'password': 'Teacher@123',
                    'full_name': 'Teacher User',
                    'is_superuser': False,
                    'is_staff': True,
                    'role_type': 'teacher',
                },
                {
                    'email': 'parent@code.com',
                    'password': 'Parent@123',
                    'full_name': 'Parent User',
                    'is_superuser': False,
                    'is_staff': False,
                    'role_type': 'parent',
                },
                {
                    'email': 'student@code.com',
                    'password': 'Student@123',
                    'full_name': 'Student User',
                    'is_superuser': False,
                    'is_staff': False,
                    'role_type': 'student',
                },
            ]

            for user_data in sample_users:
                email = user_data['email']
                existing = User.objects.filter(email=email).first()
                if existing:
                    if force_update:
                        existing.set_password(user_data['password'])
                        existing.account_status = User.AccountStatus.ACTIVE
                        existing.email_verified = True
                        existing.is_staff = user_data.get('is_staff', existing.is_staff)
                        existing.is_superuser = user_data.get('is_superuser', existing.is_superuser)
                        existing.save()
                        self.stdout.write(self.style.SUCCESS(f'Force-updated existing user: {email}'))
                    else:
                        # If it's the superuser we previously allowed update in non-force mode
                        if user_data.get('is_superuser'):
                            existing.set_password(user_data['password'])
                            existing.account_status = User.AccountStatus.ACTIVE
                            existing.email_verified = True
                            existing.is_staff = user_data.get('is_staff', existing.is_staff)
                            existing.save()
                            self.stdout.write(self.style.SUCCESS(f'Updated existing superuser: {email}'))
                        else:
                            self.stdout.write(self.style.WARNING(f'Skipped existing user: {email}'))
                    continue

                if user_data['is_superuser']:
                    user = User.objects.create_superuser(
                        email=email,
                        password=user_data['password'],
                        full_name=user_data['full_name'],
                        account_status=User.AccountStatus.ACTIVE,
                        email_verified=True,
                    )
                else:
                    user = User.objects.create_user(
                        email=email,
                        password=user_data['password'],
                        full_name=user_data['full_name'],
                        account_status=User.AccountStatus.ACTIVE,
                        email_verified=True,
                    )
                    user.is_staff = user_data['is_staff']
                    user.save()

                if user_data['role_type'] in saved_roles:
                    UserProfile.objects.update_or_create(
                        user=user,
                        defaults={
                            'role': saved_roles[user_data['role_type']],
                            'is_verified': True,
                        },
                    )

                self.stdout.write(self.style.SUCCESS(f'Created sample user: {email}'))

            self.stdout.write(self.style.SUCCESS('Sample users seeded successfully.'))
