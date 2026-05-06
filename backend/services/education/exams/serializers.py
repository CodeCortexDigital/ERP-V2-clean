from rest_framework import serializers
from .models import Exam, ExamResult

class ExamSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = Exam
        fields = '__all__'
        read_only_fields = ('exam_code',)


class ExamResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    subject_name = serializers.CharField(source='exam.subject.name', read_only=True)
    
    class Meta:
        model = ExamResult
        fields = '__all__'
        read_only_fields = ('percentage', 'grade', 'is_pass')
