from rest_framework import serializers
from .models import AttendanceRecord

class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'student_id', 'student_name', 'course_id', 'course_name', 
                  'date', 'status', 'remarks', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
