"""
Firebase Google Login Views
Provides JWT token generation after Firebase authentication
"""

import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView as SimpleJWTTokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .firebase_auth import verify_firebase_token, get_user_from_firebase, link_google_account
from .models import User

logger = logging.getLogger(__name__)

class FirebaseLoginView(APIView):
    """
    View to handle Firebase Google Login
    Accepts Firebase ID token and returns JWT tokens
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        POST /api/auth/firebase/login/
        
        Body:
        {
            "id_token": "Firebase ID token from Google Sign-In"
        }
        
        Returns:
        {
            "access": "JWT access token",
            "refresh": "JWT refresh token",
            "user": {
                "id": "user UUID",
                "email": "user email",
                "full_name": "user full name"
            }
        }
        """
        id_token = request.data.get('id_token')
        
        if not id_token:
            return Response(
                {'error': 'id_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify Firebase token and get/create user
            user, token = verify_firebase_token(id_token)
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'full_name': user.full_name,
                    'is_active': user.is_active,
                    'account_status': user.account_status
                }
            })
            
        except Exception as e:
            logger.error(f"Firebase login failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class FirebaseTokenObtainPairView(SimpleJWTTokenObtainPairView):
    """
    Custom JWT token view that supports Firebase authentication
    """
    def post(self, request, *args, **kwargs):
        # Check if this is a Firebase token
        id_token = request.data.get('id_token')
        
        if id_token:
            # Handle Firebase authentication
            return self.handle_firebase_login(request)
        
        # Handle regular email/password login
        return super().post(request, *args, **kwargs)
    
    def handle_firebase_login(self, request):
        """Handle Firebase token login"""
        try:
            user, token = verify_firebase_token(request.data.get('id_token'))
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'full_name': user.full_name
                }
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def link_google_view(request):
    """
    Link Google account to existing user
    
    POST /api/auth/google/link/
    
    Body:
    {
        "id_token": "Firebase ID token"
    }
    """
    id_token = request.data.get('id_token')
    
    if not id_token:
        return Response(
            {'error': 'id_token is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify the Firebase token
        firebase_user, token_data = verify_firebase_token(id_token)
        
        # Link to current user
        link_google_account(
            request.user,
            firebase_user.uid,
            firebase_user.email
        )
        
        return Response({
            'message': 'Google account linked successfully',
            'google_id': firebase_user.uid
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_login_status(request):
    """
    Check if user has Google account linked
    
    GET /api/auth/google/status/
    """
    user = request.user
    
    return Response({
        'has_google_account': bool(user.google_id),
        'google_id': user.google_id,
        'email': user.email
    })

# URL patterns for Firebase authentication
firebase_auth_urls = [
    ('firebase/login/', FirebaseLoginView.as_view(), 'firebase-login'),
    ('google/link/', link_google_view, 'google-link'),
    ('google/status/', google_login_status, 'google-status'),
]