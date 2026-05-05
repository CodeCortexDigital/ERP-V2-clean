from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.apps import apps
from django.utils import timezone
from datetime import datetime

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_list(request):
    """Get attendance records with filters"""
    try:
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        Student = apps.get_model('education_students', 'Student')
        
        date = request.query_params.get('date')
        class_id = request.query_params.get('class_id')
        student_id = request.query_params.get('student_id')
        
        queryset = Attendance.objects.all()
        
        if date:
            queryset = queryset.filter(date=date)
        if class_id:
            # Filter by class through student relationship
            students_in_class = Student.objects.filter(current_class_id=class_id).values_list('id', flat=True)
            queryset = queryset.filter(student_id__in=students_in_class)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        data = []
        for record in queryset:
            data.append({
                'id': str(record.id),
                'student_id': str(record.student.id),
                'student_name': record.student.full_name,
                'date': record.date.isoformat(),
                'status': record.status,
                'remarks': record.remarks
            })
        
        return Response(data, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f'Error in attendance_list: {e}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    """Mark attendance for a student"""
    try:
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        Student = apps.get_model('education_students', 'Student')
        
        student_id = request.data.get('student_id')
        date = request.data.get('date')
        status_value = request.data.get('status')
        remarks = request.data.get('remarks', '')
        
        if not student_id or not date or not status_value:
            return Response(
                {'error': 'student_id, date, and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        attendance, created = Attendance.objects.update_or_create(
            student=student,
            date=date,
            defaults={
                'status': status_value,
                'remarks': remarks
            }
        )
        
        return Response({
            'message': 'Attendance marked successfully',
            'id': str(attendance.id),
            'status': attendance.status,
            'created': created
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f'Error in mark_attendance: {e}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_mark_attendance(request):
    """Mark attendance for multiple students at once"""
    try:
        Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
        Student = apps.get_model('education_students', 'Student')
        
        records = request.data.get('records', [])
        date = request.data.get('date')
        
        if not records or not date:
            return Response(
                {'error': 'records and date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        for record in records:
            student_id = record.get('student_id')
            status_value = record.get('status')
            remarks = record.get('remarks', '')
            
            try:
                student = Student.objects.get(id=student_id)
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    date=date,
                    defaults={
                        'status': status_value,
                        'remarks': remarks
                    }
                )
                results.append({
                    'student_id': student_id,
                    'status': status_value,
                    'success': True
                })
            except Exception as e:
                results.append({
                    'student_id': student_id,
                    'error': str(e),
                    'success': False
                })
        
        success_count = len([r for r in results if r.get('success')])
        return Response({
            'message': f'Processed {len(results)} records, {success_count} successful',
            'results': results
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f'Error in bulk_mark_attendance: {e}')
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
