import os
import hashlib
import time
from django.core.exceptions import ValidationError

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from services.core.accounts.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

# User model imported from core.accounts()
TOKEN_STORE = {}
ADMIN_PASSWORD_RESET_KEY = os.environ.get('ADMIN_PASSWORD_RESET_KEY', '')

print("=" * 60)
print("AUTH_API MODULE LOADED - CLEAN VERSION")
print("=" * 60)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (
            request.data.get('user_id')
            or request.data.get('identifier')
            or request.data.get('email')
        )
        password = request.data.get('password')

        if not identifier or not password:
            return Response({'error': 'User ID and password required'}, status=400)

        try:
            if '@' in identifier:
                user = User.objects.get(email__iexact=identifier)
            else:
                user = User.objects.get(id=identifier)
        except (User.DoesNotExist, ValidationError, ValueError):
            return Response({'error': 'Invalid credentials'}, status=401)

        if not user.check_password(password) or not user.is_account_active():
            user.increment_failed_attempts()
            return Response({'error': 'Invalid credentials'}, status=401)

        user.reset_failed_attempts()
        token = hashlib.md5(f"{user.email}{time.time()}".encode()).hexdigest()
        TOKEN_STORE[token] = {
            'id': str(user.id),
            'email': user.email,
            'full_name': user.full_name,
        }
        return Response({
            'access': token,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.full_name,
            },
        })


@method_decorator(csrf_exempt, name='dispatch')
class MeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        token = auth[7:] if auth.startswith('Bearer ') else None
        if token and token in TOKEN_STORE:
            return Response(TOKEN_STORE[token])
        return Response({'error': 'Invalid token'}, status=401)


@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('user_id') or request.data.get('email')
        new_password = request.data.get('new_password')
        reset_key = request.data.get('reset_key')
        current_password = request.data.get('current_password')

        if not identifier or not new_password:
            return Response(
                {'error': 'user_id/email and new_password are required.'},
                status=400,
            )

        try:
            if '@' in identifier:
                user = User.objects.get(email__iexact=identifier)
            else:
                user = User.objects.get(id=identifier)
        except (User.DoesNotExist, ValidationError, ValueError):
            return Response({'error': 'User not found.'}, status=404)

        if user.is_superuser:
            if not ADMIN_PASSWORD_RESET_KEY:
                return Response(
                    {'error': 'Admin password reset is not configured.'},
                    status=500,
                )
            if reset_key != ADMIN_PASSWORD_RESET_KEY:
                return Response(
                    {'error': 'Admin reset key is required to reset this password.'},
                    status=403,
                )
        else:
            if not current_password or not user.check_password(current_password):
                return Response(
                    {'error': 'Current password is required to reset this account.'},
                    status=403,
                )

        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password updated successfully.'})


@method_decorator(csrf_exempt, name='dispatch')
class StudentsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'message': 'Students API - GET working', 'count': 0, 'results': []})

    def post(self, request):
        return Response({'message': 'Students API - POST working'}, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class CoursesView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'message': 'Courses API - GET working', 'count': 0, 'results': []})

    def post(self, request):
        return Response({'message': 'Courses API - POST working'}, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class ExamsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'message': 'Exams API - GET working', 'count': 0, 'results': []})

    def post(self, request):
        return Response({'message': 'Exams API - POST working'}, status=201)


@method_decorator(csrf_exempt, name='dispatch')
class AttendanceView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'message': 'Attendance API - GET working'})

    def post(self, request):
        return Response({'message': 'Attendance API - POST working'}, status=201)

