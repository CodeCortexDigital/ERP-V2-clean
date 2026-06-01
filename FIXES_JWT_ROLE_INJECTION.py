"""
FIXED: Remove JWT Role Injection Vulnerability
This file should replace the vulnerable authentication.py in:
backend/services/education/students/authentication.py
backend/services/education/academics/authentication.py

CRITICAL FIX:
- Removed role assignment from JWT payload
- Role must ONLY be determined server-side from database
- No longer trusting client-provided role
"""

import jwt
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication

User = get_user_model()
logger = logging.getLogger(__name__)


class CustomTokenAuthentication(TokenAuthentication):
    """
    SECURE: Token authentication without trusting JWT role claim
    
    Role is determined server-side only:
    1. Check if user is superuser
    2. Check user.profile.role from database
    3. Check related profile models (teacher, parent, student)
    4. Return None if no role found
    """
    
    keyword = 'Bearer'

    def authenticate_credentials(self, key):
        cache_key = f'auth_token_{key[:20]}'
        user = cache.get(cache_key)
        
        if user:
            return (user, key)
        
        try:
            # Verify JWT signature
            payload = jwt.decode(
                key,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            user_id = payload.get('user_id')
            user_email = payload.get('email')
            
            # CRITICAL FIX: Don't trust role from JWT
            # Remove this line that was accepting role from JWT:
            # user_role = payload.get('role', 'user')
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                # Create user from JWT payload if needed
                user = User.objects.create_user(
                    email=user_email or f"user_{user_id}",
                    password=None,
                )
                user.id = user_id
                user.save()
            
            # IMPORTANT: Do NOT attach role to user here
            # user.role = user_role  # ← REMOVED - THIS WAS THE VULNERABILITY
            
            # Role will be determined server-side via:
            # - services.core.accounts.decorators.get_user_role()
            # This function checks:
            # 1. is_superuser flag
            # 2. user.profile.role from database
            # 3. user.teacher_profile
            # 4. user.parent_profile
            # 5. Student model lookup
            
            # Cache for 5 minutes
            cache.set(cache_key, user, timeout=300)
            
            return (user, key)
            
        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired token attempt")
            raise exceptions.AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise exceptions.AuthenticationFailed('Authentication failed')


# Alternative: Use DRF Simple JWT with custom token claims
from rest_framework_simplejwt.tokens import Token


class CustomAccessToken(Token):
    """
    Custom JWT token that includes role as a computed claim
    
    SECURE: Role is computed server-side before token is signed
    Client cannot modify the role claim because it's signed by server
    """
    
    token_type = 'access'
    lifetime = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME')
    
    @classmethod
    def for_user(cls, user):
        """
        Create access token with server-computed role
        """
        from services.core.accounts.decorators import get_user_role
        
        token = super().for_user(user)
        
        # Add role computed server-side (not from client/JWT payload)
        user_role = get_user_role(user)
        if user_role:
            token['role'] = user_role
        
        return token


class SecureTokenObtainPairView:
    """
    Example of secure token generation
    
    1. User logs in with email/password
    2. Server verifies credentials
    3. Server computes role from database relationships
    4. Server creates JWT token with role claim
    5. Client cannot modify role because JWT is signed
    
    Usage:
        POST /api/auth/token/
        {
            "email": "user@example.com",
            "password": "password"
        }
        
        Returns:
        {
            "access": "eyJ...",  # Contains server-computed role
            "refresh": "eyJ...",
            "user": {
                "id": "uuid",
                "email": "user@example.com",
                "full_name": "Name",
                "role": "student"  # Computed server-side
            }
        }
    """
    
    def get_tokens_for_user(self, user):
        """Generate tokens with server-computed role"""
        from services.core.accounts.decorators import get_user_role
        from rest_framework_simplejwt.tokens import RefreshToken
        
        # Compute role from database (NOT from client input)
        user_role = get_user_role(user)
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Add role to both tokens (computed server-side)
        if user_role:
            refresh['role'] = user_role
            refresh.access_token['role'] = user_role
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'role': user_role  # Server-computed
            }
        }


# Important Notes
"""
SECURITY IMPROVEMENTS IN THIS FIX:

1. REMOVED: user.role = payload.get('role', 'user')
   - No longer trusting client-provided role
   - Client cannot inject admin role via JWT

2. ADDED: Server-side role computation
   - Role determined from database relationships only
   - get_user_role() function is the single source of truth

3. ADDED: Role in JWT claims (signed by server)
   - Client receives role in JWT response
   - But client cannot modify it (JWT is signed)
   - Server re-computes role on each request verification

4. SECURE TOKEN GENERATION:
   - Token includes role claim
   - Role is computed BEFORE token is signed
   - Client cannot modify role without breaking signature

5. VALIDATION PROCESS:
   Before:
   ┌─────────────────────┐
   │ Token arrives       │
   │ Extract JWT payload │ ← Client can modify!
   │ Trust role claim    │ ← Insecure
   │ Grant access        │
   └─────────────────────┘
   
   After:
   ┌──────────────────────────┐
   │ Token arrives            │
   │ Verify JWT signature     │ ← Signature check
   │ Extract user_id          │ ← Only ID trusted
   │ Load user from database  │
   │ Compute role server-side │ ← Server control
   │ Check signature          │ ← Prevent tampering
   │ Grant access based on    │
   │ server-computed role     │
   └──────────────────────────┘

TESTING THE FIX:

1. Attacker tries to modify JWT role:
   Original: {"user_id": "123", "email": "student@example.com", "role": "student"}
   Modified: {"user_id": "123", "email": "student@example.com", "role": "admin"}
   Result: Signature mismatch → 401 Unauthorized ✅

2. Attacker tries to create new token with admin role:
   Impossible - they don't have the JWT_SECRET_KEY

3. Attacker tries to spoof role in HTTP headers:
   Server only trusts JWT signature, ignores headers ✅

DEPLOYMENT:
1. Test with both simple JWT and custom token views
2. Verify role is computed correctly in all cases
3. Monitor logs for authentication failures
4. Update API docs to remove role from input fields
"""
