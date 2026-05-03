import google.oauth2.id_token
from google.auth.transport import requests
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
import uuid

User = get_user_model()

class GoogleAuthService:
    """Handle Google OAuth2 authentication"""
    
    # Google's OAuth client ID (get from Google Cloud Console)
    # For development, you can use test client ID
    CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
    
    @classmethod
    def verify_google_token(cls, token):
        """Verify Google ID token and return user info"""
        try:
            # Verify token with Google
            request = requests.Request()
            id_info = google.oauth2.id_token.verify_oauth2_token(
                token, request, cls.CLIENT_ID
            )
            
            # Check token expiry
            if id_info['exp'] < timezone.now().timestamp():
                raise ValueError("Token expired")
            
            return {
                'email': id_info['email'],
                'first_name': id_info.get('given_name', ''),
                'last_name': id_info.get('family_name', ''),
                'full_name': id_info.get('name', ''),
                'google_id': id_info['sub'],
                'email_verified': id_info.get('email_verified', False)
            }
        except ValueError as e:
            raise Exception(f"Invalid token: {str(e)}")
    
    @classmethod
    def get_or_create_user(cls, google_data):
        """Get existing user or create new one from Google data"""
        email = google_data['email']
        
        # Try to get existing user
        user = User.objects.filter(email=email).first()
        
        if user:
            # Update Google ID if not set
            if not user.google_id:
                user.google_id = google_data['google_id']
                user.save()
            return user
        
        # Create new user
        username = email.split('@')[0]
        # Ensure unique username
        base_username = username
        counter = 1
        while User.objects.filter(email=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User.objects.create(
            email=email,
            full_name=google_data['full_name'],
            first_name=google_data['first_name'],
            last_name=google_data['last_name'],
            google_id=google_data['google_id'],
            email_verified=google_data['email_verified'],
            is_active=True,
            account_status='active'
        )
        
        return user
    
    @classmethod
    def get_jwt_tokens(cls, user):
        """Generate JWT tokens for user"""
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
