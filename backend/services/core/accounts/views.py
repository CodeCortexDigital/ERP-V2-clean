from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()


# ============================================================
# HEALTH CHECK
# ============================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Basic health check endpoint"""
    return JsonResponse({"status": "ok", "message": "Server is running"})


# ============================================================
# AUTHENTICATION
# ============================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login user and return JWT token"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Try to authenticate
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        # Try with email as username
        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.email, password=password)
        except User.DoesNotExist:
            pass
    
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            }
        })
    
    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current user info"""
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'full_name': user.full_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout user"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'})
    except Exception:
        return Response({'message': 'Logged out'}, status=200)
