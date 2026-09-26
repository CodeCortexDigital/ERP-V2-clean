from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.contrib.auth import get_user_model
import json
import uuid

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Authenticate user with Google OAuth token"""
    try:
        from .google_auth import GoogleAuthService
        
        # Parse JSON body
        try:
            data = json.loads(request.body)
        except:
            data = request.data
        
        token = data.get('token')
        if not token:
            return Response(
                {'error': 'Google token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify Google token (will work after setting CLIENT_ID)
        google_data = GoogleAuthService.verify_google_token(token)
        
        # Get or create user
        user = GoogleAuthService.get_or_create_user(google_data)
        
        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        
        from .serializers import UserSerializer
        from .decorators import get_user_role
        serializer = UserSerializer(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Google login failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
