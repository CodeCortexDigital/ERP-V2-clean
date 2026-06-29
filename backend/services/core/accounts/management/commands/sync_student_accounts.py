from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from services.core.accounts.models import UserProfile
from services.rbac_models.models import Role


User = get_user_model()


class Command(BaseCommand):
    help = 'Create or update login accounts for all active students.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            default='Student@123',
            help='Temporary password to assign to every active student account.',
        )
        parser.add_argument(
            '--force-password',
            action='store_true',
            help='Reset passwords even for existing student user accounts.',
        )
        parser.add_argument(
            '--inactive-too',
            action='store_true',
            help='Also sync inactive students.',
        )

    def handle(self, *args, **options):
        password = options['password']
        force_password = options['force_password']
        include_inactive = options['inactive_too']

        Student = apps.get_model('education_students', 'Student')
        student_role, _ = Role.objects.get_or_create(
            role_type=Role.RoleType.STUDENT,
            defaults={
                'name': 'Student',
                'description': 'Default student role for login accounts.',
                'permissions': {},
                'is_active': True,
            },
        )

        student_qs = Student.objects.all()
        if not include_inactive:
            student_qs = student_qs.filter(is_active=True)

        created_users = 0
        updated_users = 0
        skipped_students = 0

        with transaction.atomic():
            for student in student_qs.select_related('current_class', 'current_section'):
                if not student.email:
                    skipped_students += 1
                    continue

                user = User.objects.filter(email__iexact=student.email).first()
                user_created = False
                if not user:
                    user = User.objects.create_user(
                        email=student.email,
                        password=password,
                        full_name=student.full_name,
                        is_active=True,
                        account_status=User.AccountStatus.ACTIVE,
                        email_verified=True,
                    )
                    user_created = True
                else:
                    user.full_name = student.full_name or user.full_name
                    user.is_active = True
                    user.account_status = User.AccountStatus.ACTIVE
                    user.email_verified = True
                    if force_password:
                        user.set_password(password)

                user.save()

                UserProfile.objects.update_or_create(
                    user=user,
                    defaults={
                        'role': student_role,
                        'is_verified': True,
                    },
                )

                if user_created:
                    created_users += 1
                else:
                    updated_users += 1

        total_students = student_qs.count()
        self.stdout.write(self.style.SUCCESS(
            f'Student login sync complete: {created_users} created, {updated_users} updated, {skipped_students} skipped, {total_students} processed.'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Login pattern: student email + password "{password}"'
        ))
