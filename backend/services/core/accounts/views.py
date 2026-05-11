from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from rest_framework import generics
from django.apps import apps
from .serializers import UserSerializer, StudentSerializer

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return JsonResponse({"status": "ok", "message": "Server is running"})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user_obj = User.objects.get(email=email)
        user = authenticate(request, username=user_obj.email, password=password)
    except User.DoesNotExist:
        user = None
    
    if user and user.is_active:
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': getattr(user, 'full_name', user.email),
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            }
        })
    
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'full_name': getattr(user, 'full_name', user.email),
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'})
    except Exception:
        return Response({'message': 'Logged out'}, status=200)


class StudentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        Student = apps.get_model('education_students', 'Student')
        return Student.objects.all()
    
    def get_serializer_class(self):
        return StudentSerializer


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    
    def get_queryset(self):
        Student = apps.get_model('education_students', 'Student')
        return Student.objects.all()
    
    def get_serializer_class(self):
        return StudentSerializer
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'message': 'Student deactivated'}, status=status.HTTP_200_OK)

# ============================================================
# CLASS VIEWS
# ============================================================
class ClassListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        return SchoolClass.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        from .serializers import ClassSerializer
        return ClassSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """Get attendance summary for dashboard"""
    try:
        from django.apps import apps
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        
        total_records = Attendance.objects.count()
        present = Attendance.objects.filter(status='present').count()
        absent = Attendance.objects.filter(status='absent').count()
        late = Attendance.objects.filter(status='late').count()
        
        return Response({
            'total_records': total_records,
            'present': present,
            'absent': absent,
            'late': late,
            'attendance_rate': round((present / total_records * 100), 1) if total_records > 0 else 0
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
# Add to services/core/accounts/views.py (at the end of the file)

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import ParentProfile
from .permissions import IsParent

class ParentDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsParent]
    
    def get(self, request):
        parent = request.user.parent_profile
        students = parent.linked_students.all()
        
        data = {
            'parent_name': request.user.get_full_name() or request.user.email,
            'children_count': students.count(),
            'students': [
                {
                    'id': str(s.id),
                    'name': s.full_name,
                    'class': s.current_class.name if s.current_class else None,
                    'attendance_percentage': 85,
                    'fee_status': 'paid'
                }
                for s in students
            ]
        }
        return Response(data)

