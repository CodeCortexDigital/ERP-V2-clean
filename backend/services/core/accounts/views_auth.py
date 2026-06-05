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


@api_view(['POST'])
@permission_classes([AllowAny])
def demo_login(request):
    """Create or login demo/guest account"""
    try:
        from .demo_auth import DemoAccountService
        from rest_framework_simplejwt.tokens import RefreshToken
        from .serializers import UserSerializer
        
        # Parse JSON body properly
        try:
            import json
            data = json.loads(request.body.decode('utf-8'))
        except:
            data = request.data
        
        email = data.get('email')
        name = data.get('name', '')
        
        if not email:
            # Auto-generate anonymous demo email
            email = f"demo_{uuid.uuid4().hex[:8]}@demo.local"
        
        # Create or get demo user
        user = DemoAccountService.create_demo_user(email, name)
        
        # Check if demo is still valid
        if hasattr(user, 'demo_expiry') and user.demo_expiry:
            from django.utils import timezone
            if user.demo_expiry < timezone.now():
                return Response(
                    {'error': 'Demo account expired. Please contact sales.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Get remaining days
        remaining_days = 7
        if hasattr(user, 'demo_expiry') and user.demo_expiry:
            from django.utils import timezone
            remaining = (user.demo_expiry - timezone.now()).days
            remaining_days = max(0, remaining)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'is_demo': True,
                'demo_remaining_days': remaining_days
                , 'role': get_user_role(user)
            },
            'is_demo': True,
            'demo_warning': remaining_days <= 3,
            'demo_message': f'Demo expires in {remaining_days} days'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Demo login failed: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def demo_status(request):
    """Check if email is available for demo"""
    email = request.query_params.get('email')
    if not email:
        return Response({'available': True})
    
    exists = User.objects.filter(email=email).exists()
    return Response({'available': not exists})
