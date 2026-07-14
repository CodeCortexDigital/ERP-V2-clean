import re
import uuid

from rest_framework import serializers
from .models import Student


def generate_unique_student_id(base=None):
    """Return a unique student_id, avoiding collisions with existing rows.

    Uses all_objects (unscoped) because the student_id unique constraint is
    global across tenants, while the default manager is tenant-scoped.
    """
    if base:
        candidate = base
    else:
        last = Student.all_objects.order_by('-created_at').values_list('student_id', flat=True).first()
        match = re.search(r'\d+', last) if last else None
        if match:
            incremented = str(int(match.group()) + 1).zfill(len(match.group()))
            candidate = last[: match.start()] + incremented + last[match.end():]
        else:
            candidate = f"STU{uuid.uuid4().hex[:8].upper()}"

    while Student.all_objects.filter(student_id=candidate).exists():
        match = re.search(r'\d+', candidate)
        if match:
            incremented = str(int(match.group()) + 1).zfill(len(match.group()))
            candidate = candidate[: match.start()] + incremented + candidate[match.end():]
        else:
            candidate = f"{candidate}-{uuid.uuid4().hex[:6].upper()}"
    return candidate

class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='current_class.name', read_only=True)
    section_name = serializers.CharField(source='current_section.name', read_only=True)
    attendance_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = '__all__'
        extra_kwargs = {
            'date_of_birth': {'required': False, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
        }
        
    def get_attendance_rate(self, obj):
        from services.education.attendance.models import AttendanceRecord
        records = AttendanceRecord.objects.filter(student=obj).exclude(status='holiday')
        total = records.count()
        if total == 0:
            return 0
        present = records.filter(status__in=['present', 'late']).count()
        return round((present / total) * 100)
    
    def to_internal_value(self, data):
        # Handle empty date strings
        if data.get('date_of_birth') == '':
            data['date_of_birth'] = None
        if data.get('admission_date') == '':
            data['admission_date'] = None
        return super().to_internal_value(data)

    def validate_student_id(self, value):
        # Guarantee uniqueness (and a value) so a 400 is never raised for
        # duplicate/blank student_id. Conflicts are resolved server-side.
        # On update, the instance's own current student_id is allowed.
        if not value:
            return generate_unique_student_id()
        qs = Student.all_objects.filter(student_id=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            return generate_unique_student_id()
        return value
