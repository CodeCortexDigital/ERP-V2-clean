# backend/services/core/accounts/middleware.py
from django.utils.deprecation import MiddlewareMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

class GlobalAuthenticationMiddleware(MiddlewareMixin):
    """Global authentication for all API requests"""
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        # Skip auth for login, health checks, and public endpoints
        public_paths = ['/api/auth/login/', '/api/auth/health/', '/api/auth/register/']
        
        if request.path.startswith('/api/') and not any(request.path.startswith(p) for p in public_paths):
            if not request.user.is_authenticated:
                return Response(
                    {'detail': 'Authentication required'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        return None
