# backend/api/v1/views_auth.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
@permission_classes([AllowAny])
def demo_login(request):
    """Demo login endpoint"""
    name = request.data.get('name', 'Demo User')
    
    # For demo purposes, return a mock response
    return Response({
        'access': 'demo-access-token',
        'refresh': 'demo-refresh-token',
        'user': {
            'id': 'demo-user-1',
            'email': 'demo@school.edu',
            'full_name': name,
            'role': 'admin',
            'is_active': True,
            'is_demo': True,
        },
        'is_demo': True,
        'demo_message': 'You are logged in as a demo user.'
    }, status=status.HTTP_200_OK)