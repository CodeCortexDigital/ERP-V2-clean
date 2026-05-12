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


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email_or_student_id = request.data.get('email') or request.data.get('student_id')
    password = request.data.get('password')
    
    if not email_or_student_id or not password:
        return Response({'error': 'Email/Student ID and password required'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = None
    
    # Try to find user by student_id first
    from services.education.students.models import Student
    try:
        student = Student.objects.get(student_id=email_or_student_id)
        # Find user by student's email
        try:
            user = User.objects.get(email=student.email)
        except User.DoesNotExist:
            pass
    except Student.DoesNotExist:
        pass
    
    # If not found by student_id, try by email
    if not user:
        try:
            user_obj = User.objects.get(email=email_or_student_id)
            user = authenticate(request, username=user_obj.email, password=password)
        except User.DoesNotExist:
            user = None
    
    # Also try direct authentication with email
    if not user:
        user = authenticate(request, username=email_or_student_id, password=password)
    
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


def logout_view(request):
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'})
    except Exception:
        return Response({'message': 'Logged out'}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user"""
    user = request.user
    return Response({
        'id': str(user.id),
        'email': user.email,
        'full_name': user.full_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    })


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


class ParentDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # FIRST: Check if user is a student
        from services.education.students.models import Student
        try:
            student = Student.objects.get(email=user.email)
            data = {
                'is_student': True,
                'student_name': student.full_name,
                'class': student.current_class.name if student.current_class else None,
                'section': student.current_section.name if student.current_section else None,
                'student_id': student.student_id,
                'attendance_percentage': 85,
                'gpa': 3.8,
            }
            return Response(data)
        except Student.DoesNotExist:
            pass
        
        # SECOND: Check if user is a parent
        if hasattr(user, 'parent_profile'):
            parent = user.parent_profile
            students = parent.linked_students.all()
            
            data = {
                'is_student': False,
                'parent_name': user.full_name or user.email,
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
        
        return Response({'error': 'No profile found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_list(request):
    """Get all students"""
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    from .serializers import StudentSerializer
    students = Student.objects.filter(is_active=True)
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)

class ClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    lookup_url_kwarg = 'pk'
    
    def get_queryset(self):
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        return SchoolClass.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        from .serializers import ClassSerializer
        return ClassSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_count(request):
    """Get total student count"""
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    count = Student.objects.filter(is_active=True).count()
    return Response({'count': count})


# ============================================================
# ATTENDANCE VIEWS
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance(request):
    """Get attendance for a specific date"""
    date = request.GET.get('date')
    if not date:
        return Response({'error': 'Date required'}, status=400)
    
    from django.apps import apps
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    
    attendance = Attendance.objects.filter(date=date)
    attendance_list = []
    for record in attendance:
        attendance_list.append({
            'id': str(record.id),
            'student_id': str(record.student.id),
            'student_name': record.student.full_name,
            'status': record.status,
            'date': str(record.date),
        })
    return Response(attendance_list)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_attendance(request):
    """Save multiple attendance records at once"""
    data = request.data
    records = data.get('records', [])
    
    from django.apps import apps
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    Student = apps.get_model('education_students', 'Student')
    
    created = 0
    updated = 0
    
    for record in records:
        student_id = record.get('student_id')
        date = record.get('date')
        status = record.get('status')
        
        student = Student.objects.get(id=student_id)
        
        attendance, is_new = Attendance.objects.update_or_create(
            student=student,
            date=date,
            defaults={'status': status}
        )
        
        if is_new:
            created += 1
        else:
            updated += 1
    
    return Response({
        'success': True,
        'message': f'Attendance saved: {created} created, {updated} updated'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_stats(request):
    """Get attendance statistics for a student or class"""
    student_id = request.GET.get('student_id')
    class_id = request.GET.get('class_id')
    
    from django.apps import apps
    from django.db.models import Count, Q
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    Student = apps.get_model('education_students', 'Student')
    
    if student_id:
        student = Student.objects.get(id=student_id)
        total = Attendance.objects.filter(student=student).count()
        present = Attendance.objects.filter(student=student, status='present').count()
        
        stats = {
            'student_name': student.full_name,
            'total_days': total,
            'present_days': present,
            'percentage': round((present / total * 100) if total > 0 else 0, 1)
        }
        return Response(stats)
    
    if class_id:
        students = Student.objects.filter(current_class_id=class_id)
        stats = []
        for student in students:
            total = Attendance.objects.filter(student=student).count()
            present = Attendance.objects.filter(student=student, status='present').count()
            stats.append({
                'student_id': str(student.id),
                'student_name': student.full_name,
                'percentage': round((present / total * 100) if total > 0 else 0, 1)
            })
        return Response(stats)
    
    return Response({'error': 'student_id or class_id required'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_attendance(request, student_id):
    """Get attendance for a specific student"""
    from django.apps import apps
    from django.utils import timezone
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    
    year = request.GET.get('year')
    month = request.GET.get('month')
    
    attendance_records = Attendance.objects.filter(student_id=student_id)
    if year and month:
        attendance_records = attendance_records.filter(date__year=year, date__month=month)
    
    data = []
    for record in attendance_records:
        data.append({
            'id': str(record.id),
            'date': str(record.date),
            'status': record.status,
        })
    return Response(data)
