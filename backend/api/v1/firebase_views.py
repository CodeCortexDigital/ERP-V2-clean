# backend/api/v1/firebase_views.py
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


class FirebaseLoginView(APIView):
    """Firebase/Google OAuth login view"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        id_token = request.data.get('id_token')
        
        if not id_token:
            return Response(
                {'error': 'id_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # For demo purposes, return a mock response
        # In production, you would verify the token with Firebase Admin SDK
        return Response({
            'access': 'firebase-access-token',
            'refresh': 'firebase-refresh-token',
            'user': {
                'id': 'firebase-user-1',
                'email': 'firebase@school.edu',
                'full_name': 'Firebase User',
                'role': 'admin',
                'is_active': True,
            },
            'message': 'Firebase login successful'
        }, status=status.HTTP_200_OK)