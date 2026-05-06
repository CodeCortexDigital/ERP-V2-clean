from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.apps import apps
from django.db.models import Count, Q, Prefetch
from datetime import datetime, date
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer

Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
Student = apps.get_model('education_students', 'Student')


class AttendanceListCreateView(generics.ListCreateAPIView):
    """List attendance records or create new ones"""
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer
    
    def get_queryset(self):
        queryset = Attendance.objects.select_related('student').all()
        date_param = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(date=date_param)
        student_id = self.request.query_params.get('student_id')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset.order_by('-date')
    
    def perform_create(self, serializer):
        serializer.save()


class AttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete an attendance record"""
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer
    lookup_field = 'id'
    queryset = Attendance.objects.select_related('student').all()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_attendance(request):
    """Save multiple attendance records at once"""
    try:
        records = request.data.get('records', [])
        created_count = 0
        updated_count = 0
        errors = []
        
        for record in records:
            student_id = record.get('student_id')
            status_val = record.get('status')
            date_str = record.get('date')
            class_id = record.get('class_id', '')
            
            # Parse date
            try:
                record_date = datetime.strptime(date_str, '%Y-%m-%d').date() if isinstance(date_str, str) else date.today()
            except:
                record_date = date.today()
            
            # Get the student object
            try:
                student = Student.objects.get(id=student_id)
            except Student.DoesNotExist:
                errors.append(f'Student not found: {student_id}')
                continue
            
            # Update or create attendance record
            attendance, created = Attendance.objects.update_or_create(
                student=student,
                date=record_date,
                defaults={
                    'status': status_val,
                    'course_id': class_id,
                    'remarks': ''
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'message': f'Attendance saved: {created_count} created, {updated_count} updated',
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """Get attendance summary for dashboard"""
    try:
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
