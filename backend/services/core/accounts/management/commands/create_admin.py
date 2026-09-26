import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a superuser programmatically'
    
    def handle(self, *args, **options):
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
        admin_password = os.environ.get('ADMIN_PASSWORD')

        if not admin_password:
            # Runs in the Render start command: a missing password must not stop the server from starting.
            self.stdout.write(self.style.WARNING('ADMIN_PASSWORD is not set; skipping admin creation.'))
            return

        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                email=admin_email,
                password=admin_password,
                full_name='Admin User'
            )
            self.stdout.write(self.style.SUCCESS('Superuser created successfully'))
        else:
            self.stdout.write(self.style.WARNING('Superuser already exists'))






