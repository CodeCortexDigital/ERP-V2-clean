"""
Firebase Google Login Views
Provides JWT token generation after Firebase authentication
"""

import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView as SimpleJWTTokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .firebase_auth import verify_firebase_token, get_user_from_firebase, link_google_account
from .models import User

logger = logging.getLogger(__name__)

class FirebaseLoginView(APIView):
    """
    POST /api/v1/auth/firebase/login/  {"id_token": "<Firebase ID token>"}

    Signs in an EXISTING account with Google. Unknown Google users are not
    given an account here (that would let anyone in); the response tells the
    app to send them to school signup instead:
        404 {"needs_signup": true, "email": ..., "name": ...}
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        from .google_identity import GoogleIdentityError, verify_google_identity
        from .views import build_login_response

        try:
            ident = verify_google_identity(request.data.get('id_token') or request.data.get('token'))
        except GoogleIdentityError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
        if not ident.email_verified:
            return Response({'error': 'Please verify your Google email address first.'},
                            status=status.HTTP_401_UNAUTHORIZED)

        user = (User.objects.filter(firebase_uid=ident.uid).first() if ident.uid else None)             or User.objects.filter(email__iexact=ident.email).first()
        if user is None:
            return Response({'needs_signup': True, 'email': ident.email, 'name': ident.name},
                            status=status.HTTP_404_NOT_FOUND)
        if not user.is_active:
            return Response({'error': 'This account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        if ident.uid and not user.firebase_uid:
            user.firebase_uid = ident.uid
            user.save(update_fields=['firebase_uid'])
        return build_login_response(request, user, method='google')


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