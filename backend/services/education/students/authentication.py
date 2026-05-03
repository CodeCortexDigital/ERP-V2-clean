import jwt
from rest_framework import authentication, exceptions
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class CustomJWTAuthentication(authentication.BaseAuthentication):
    """
    JWT Authentication for students service
    """
    
    def authenticate(self, request):
        # Check for API Key first (service-to-service)
        api_key = request.headers.get('X-API-Key')
        if api_key and api_key == settings.INTERNAL_API_KEY:
            # Return system user
            try:
                user = User.objects.get(username='system')
            except User.DoesNotExist:
                user = User.objects.create_user(
                    username='system',
                    email='system@internal',
                    password=None
                )
            return (user, None)
        
        # Check for Bearer token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        # Check cache
        cache_key = f"jwt_token_{token}"
        cached_user = cache.get(cache_key)
        if cached_user:
            return (cached_user, token)
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            user_id = payload.get('user_id')
            user_email = payload.get('email')
            user_role = payload.get('role', 'user')
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                # Create user from JWT payload
                user = User.objects.create_user(
                    username=user_email or f"user_{user_id}",
                    email=user_email,
                    password=None,
                )
                user.id = user_id
                user.save()
            
            # Attach role to user for permission checks
            user.role = user_role
            
            # Cache for 5 minutes
            cache.set(cache_key, user, timeout=300)
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired token attempt")
            raise exceptions.AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise exceptions.AuthenticationFailed('Authentication failed')