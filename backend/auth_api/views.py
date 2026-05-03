from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from services.core.accounts.models import User
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import hashlib
import time

# User model imported from core.accounts()
TOKEN_STORE = {}

print("=" * 60)
print("AUTH_API MODULE LOADED - CLEAN VERSION")
print("=" * 60)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=400)
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                token = hashlib.md5(f"{user.email}{time.time()}".encode()).hexdigest()
                TOKEN_STORE[token] = {'user_id': str(user.id), 'email': user.email}
                return Response({'access': token, 'user': {'id': str(user.id), 'email': user.email}})
        except:
            pass
        return Response({'error': 'Invalid credentials'}, status=401)


@method_decorator(csrf_exempt, name='dispatch')
class MeView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        token = auth[7:] if auth.startswith('Bearer ') else None
        if token and token in TOKEN_STORE:
            return Response({'email': TOKEN_STORE[token]['email']})
        return Response({'error': 'Invalid token'}, status=401)


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

