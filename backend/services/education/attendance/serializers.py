from rest_framework import serializers
from .models import AttendanceRecord

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_id = serializers.UUIDField(source='student.id', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = '__all__'

    def validate(self, data):
        record_date = data.get('date')
        status = data.get('status')
        from django.utils import timezone
        if record_date and record_date > timezone.localtime().date():
            if status in ['present', 'absent', 'late']:
                raise serializers.ValidationError(
                    "Future dates can only be marked as Holiday or Excused."
                )
        return data
