"""
Firebase Google Login Authentication Backend
Supports Google Sign-In via Firebase Auth
"""

import os
import logging
from google.auth.exceptions import GoogleAuthError
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from rest_framework import authentication, exceptions
from django.conf import settings

# Try to import id_token, handle if not available
try:
    from google.auth import id_token as google_id_token
except ImportError:
    google_id_token = None

logger = logging.getLogger(__name__)

# Firebase credentials path
FIREBASE_CREDENTIALS = os.environ.get('FIREBASE_CREDENTIALS_JSON', None)
FIREBASE_PROJECT_ID = os.environ.get('FIREBASE_PROJECT_ID', 'your-project-id')

# Initialize Firebase (lazy loading)
_firebase_app = None

def get_firebase_app():
    """Get or initialize Firebase app"""
    global _firebase_app
    if _firebase_app is None:
        try:
            if FIREBASE_CREDENTIALS:
                # Use credentials from environment variable
                import json
                cred_dict = json.loads(FIREBASE_CREDENTIALS)
                cred = credentials.Certificate(cred_dict)
            elif os.path.exists('firebase-credentials.json'):
                # Use credentials file
                cred = credentials.Certificate('firebase-credentials.json')
            else:
                # Try to use default credentials
                cred = credentials.ApplicationDefault()
            _firebase_app = firebase_admin.initialize_app(cred)
        except Exception as e:
            logger.warning(f"Firebase initialization skipped: {e}")
            _firebase_app = False
    return _firebase_app if _firebase_app else None

class FirebaseUser:
    """Represents a user authenticated via Firebase"""
    
    def __init__(self, firebase_user, token_data):
        self.firebase_user = firebase_user
        self.token_data = token_data
        self.uid = firebase_user.uid
        self.email = firebase_user.email
        self.display_name = firebase_user.display_name
        self.photo_url = firebase_user.photo_url
        self.phone_number = firebase_user.phone_number
        self.email_verified = firebase_user.email_verified
        self.provider_data = firebase_user.provider_data
        
    def __str__(self):
        return self.email or self.uid

class FirebaseAuthenticationBackend:
    """
    Custom authentication backend for Firebase Google Login
    """
    
    def authenticate(self, request):
        """Authenticate using Firebase ID token"""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        try:
            return self.verify_firebase_token(token)
        except Exception as e:
            logger.error(f"Firebase authentication failed: {e}")
            return None
    
    def verify_firebase_token(self, id_token_str):
        """
        Verify Firebase ID token and return user
        """
        firebase_app = get_firebase_app()
        
        if not firebase_app:
            # Firebase not configured, try Google auth directly
            return self.verify_google_token(id_token_str)
        
        try:
            # Verify using Firebase Admin SDK
            decoded_token = firebase_auth.verify_id_token(id_token_str)
            firebase_user = firebase_auth.get_user(decoded_token['uid'])
            
            user = self.get_or_create_user(firebase_user, decoded_token)
            return (user, id_token_str)
            
        except firebase_auth.InvalidIdTokenError as e:
            raise exceptions.AuthenticationFailed(f'Invalid Firebase token: {e}')
        except firebase_auth.UserNotFoundError:
            raise exceptions.AuthenticationFailed('User not found')
        except Exception as e:
            logger.error(f"Firebase token verification failed: {e}")
            raise exceptions.AuthenticationFailed(f'Token verification failed: {e}')
    
    def verify_google_token(self, token):
        """
        Fallback: Verify Google ID token directly
        """
        if not google_id_token:
            raise exceptions.AuthenticationFailed('Google ID token library not available')
        
        try:
            # Specify the audience for your Google Cloud project
            audience = FIREBASE_PROJECT_ID
            
            # Verify the token
            idinfo = google_id_token.verify_token(token, audience=audience)
            
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise exceptions.AuthenticationFailed('Invalid issuer')
            
            # Get or create user
            user = self.get_or_create_google_user(idinfo)
            return (user, token)
            
        except GoogleAuthError as e:
            raise exceptions.AuthenticationFailed(f'Google token verification failed: {e}')
    
    def get_or_create_user(self, firebase_user, token_data):
        """
        Get or create Django user from Firebase user
        """
        from services.core.accounts.models import User
        
        # Try to find user by google_id or email
        email = firebase_user.email
        uid = firebase_user.uid
        
        try:
            user = User.objects.get(google_id=uid)
            return user
        except User.DoesNotExist:
            pass
        
        try:
            user = User.objects.get(email=email)
            # Link Google ID if not set
            if not user.google_id:
                user.google_id = uid
                user.save(update_fields=['google_id'])
            return user
        except User.DoesNotExist:
            pass
        
        # Create new user
        user = User.objects.create_user(
            email=email,
            password=None,  # No password for OAuth users
            full_name=firebase_user.display_name or '',
            google_id=uid,
            email_verified=firebase_user.email_verified,
            is_active=True
        )
        
        return user
    
    def get_or_create_google_user(self, idinfo):
        """
        Get or create Django user from Google token info
        """
        from services.core.accounts.models import User
        
        email = idinfo.get('email')
        sub = idinfo.get('sub')  # Google user ID
        
        try:
            user = User.objects.get(google_id=sub)
            return user
        except User.DoesNotExist:
            pass
        
        try:
            user = User.objects.get(email=email)
            if not user.google_id:
                user.google_id = sub
                user.save(update_fields=['google_id'])
            return user
        except User.DoesNotExist:
            pass
        
        # Create new user
        user = User.objects.create_user(
            email=email,
            password=None,
            full_name=idinfo.get('name', ''),
            google_id=sub,
            email_verified=idinfo.get('email_verified', False),
            is_active=True
        )
        
        return user
    
    def authenticate_header(self, request):
        """Return authentication scheme"""
        return 'Bearer'

class FirebaseTokenObtainPairView:
    """
    Custom token view for Firebase authentication
    """
    pass  # Will be implemented in views

def verify_firebase_token(token):
    """
    Standalone function to verify Firebase token
    Returns (user, token) tuple or raises exception
    """
    backend = FirebaseAuthenticationBackend()
    return backend.verify_firebase_token(token)

def get_user_from_firebase(google_id):
    """
    Get user by Google ID
    """
    from services.core.accounts.models import User
    
    try:
        return User.objects.get(google_id=google_id)
    except User.DoesNotExist:
        return None

def link_google_account(user, google_id, email):
    """
    Link Google account to existing user
    """
    from services.core.accounts.models import User
    
    if User.objects.filter(google_id=google_id).exclude(pk=user.pk).exists():
        raise exceptions.AuthenticationFailed('Google account already linked to another user')
    
    if User.objects.filter(email=email).exclude(pk=user.pk).exists():
        raise exceptions.AuthenticationFailed('Email already in use')
    
    user.google_id = google_id
    user.email = email
    user.save(update_fields=['google_id', 'email'])
    
    return user