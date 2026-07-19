from rest_framework import serializers
from .models import EmployeeTask, Timesheet, EmployeeDocument


class EmployeeTaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source='assignee.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = EmployeeTask
        fields = [
            'id', 'tenant', 'title', 'description', 'assignee', 'assignee_name',
            'created_by', 'created_by_name', 'priority', 'status', 'due_date',
            'completed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class TimesheetSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)

    class Meta:
        model = Timesheet
        fields = [
            'id', 'tenant', 'employee', 'employee_name', 'date',
            'hours_worked', 'note', 'approved', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    file_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EmployeeDocument
        fields = [
            'id', 'tenant', 'owner', 'owner_name', 'title', 'document_type',
            'file', 'file_name', 'file_url', 'uploaded_by', 'shared',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_url']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            try:
                url = obj.file.url
                if request:
                    return request.build_absolute_uri(url)
                return url
            except Exception:
                return None
        return None
