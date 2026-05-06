from rest_framework import serializers
from .models import Applicant, Application

class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        fields = '__all__'


class ApplicationSerializer(serializers.ModelSerializer):
    applicant = ApplicantSerializer(read_only=True)
    applicant_id = serializers.UUIDField(write_only=True, required=False)
    
    class Meta:
        model = Application
        fields = '__all__'
        read_only_fields = ('application_no', 'submitted_at')
    
    def create(self, validated_data):
        applicant_id = validated_data.pop('applicant_id', None)
        if applicant_id:
            from .models import Applicant
            applicant = Applicant.objects.get(id=applicant_id)
            validated_data['applicant'] = applicant
        return super().create(validated_data)
