from rest_framework.authentication import BaseAuthentication
from services.core.accounts.models import User

class MockSafeJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header == 'Bearer mock-access-token':
            # Authenticate as superuser Admin
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                user = User.objects.filter(is_staff=True).first()
            if not user:
                # Create a default superuser
                user, _ = User.objects.get_or_create(
                    email='admin@code.com',
                    defaults={
                        'full_name': 'Administrator',
                        'is_staff': True,
                        'is_superuser': True,
                        'is_active': True
                    }
                )
                user.set_password('Admin@123')
                user.save()
            return (user, None)
        return None
