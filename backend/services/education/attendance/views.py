from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [AllowAny]  # Temporarily allow all requests
    
    @action(detail=False, methods=['post'], url_path='mark')
    def mark_attendance(self, request):
        """Mark attendance for a single student"""
        print(f"Received attendance data: {request.data}")
        
        serializer = AttendanceRecordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='bulk-mark')
    def bulk_mark(self, request):
        """Mark attendance for multiple students at once"""
        records = request.data.get('records', [])
        created = []
        errors = []
        
        for record in records:
            serializer = AttendanceRecordSerializer(data=record)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append(serializer.errors)
        
        return Response({
            'created': created,
            'errors': errors,
            'total': len(created)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], url_path='summary')
    def get_summary(self, request):
        """Get attendance summary for a course or student"""
        course_id = request.query_params.get('course_id')
        student_id = request.query_params.get('student_id')
        
        queryset = self.queryset
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        
        total = queryset.count()
        present = queryset.filter(status='present').count()
        absent = queryset.filter(status='absent').count()
        late = queryset.filter(status='late').count()
        
        return Response({
            'total': total,
            'present': present,
            'absent': absent,
            'late': late,
            'attendance_rate': round((present / total * 100) if total > 0 else 0, 2)
        })
