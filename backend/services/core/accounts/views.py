from django.http import JsonResponse, HttpResponse
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
    
    from services.education.students.models import Student
    try:
        student = Student.objects.get(student_id=email_or_student_id)
        try:
            user = User.objects.get(email=student.email)
        except User.DoesNotExist:
            pass
    except Student.DoesNotExist:
        pass
    
    if not user:
        try:
            user_obj = User.objects.get(email=email_or_student_id)
            user = authenticate(request, username=user_obj.email, password=password)
        except User.DoesNotExist:
            user = None
    
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


class ClassListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        return SchoolClass.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        from .serializers import ClassSerializer
        return ClassSerializer


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


class ParentDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
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
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    from .serializers import StudentSerializer
    students = Student.objects.filter(is_active=True)
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_count(request):
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
    """Get attendance for a specific date or student"""
    date = request.GET.get('date')
    student_id = request.GET.get('student_id')
    
    from django.apps import apps
    Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
    
    if student_id:
        attendance = Attendance.objects.filter(student_id=student_id)
    elif date:
        attendance = Attendance.objects.filter(date=date)
    else:
        return Response({'error': 'Date or student_id required'}, status=400)
    
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
        status_val = record.get('status')
        
        student = Student.objects.get(id=student_id)
        
        attendance, is_new = Attendance.objects.update_or_create(
            student=student,
            date=date,
            defaults={'status': status_val}
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
    student_id = request.GET.get('student_id')
    class_id = request.GET.get('class_id')
    
    from django.apps import apps
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
    from django.apps import apps
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


# ============================================================
# PDF GENERATION
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_result_card(request, student_id):
    """Download result card PDF"""
    from services.pdf.pdf_generator import PDFGenerator
    
    from django.apps import apps
    Student = apps.get_model('education_students', 'Student')
    
    try:
        student = Student.objects.get(id=student_id)
        generator = PDFGenerator()
        pdf_buffer = generator.generate_result_card(student, [], None)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="result_card_{student.student_id}.pdf"'
        return response
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_fee_receipt(request, invoice_id):
    """Download fee receipt PDF"""
    from services.pdf.pdf_generator import PDFGenerator
    
    try:
        generator = PDFGenerator()
        pdf_buffer = generator.generate_fee_receipt(None, None, [])
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fee_receipt_{invoice_id}.pdf"'
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=500)