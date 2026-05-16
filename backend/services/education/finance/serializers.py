from rest_framework import serializers
from .models import (
    FeeStructure,
    Invoice,
    Payment,
    InstallmentPlan,
    Scholarship,
    StudentScholarship,
    LateFeeRule,
    TransactionLog,
    PaymentGatewayConfig,
    PaymentTransaction,
)


class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_ref.name', read_only=True)
    
    class Meta:
        model = FeeStructure
        fields = '__all__'


class InstallmentPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstallmentPlan
        fields = '__all__'


class ScholarshipSerializer(serializers.ModelSerializer):
    applicable_classes_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Scholarship
        fields = '__all__'
    
    def get_applicable_classes_names(self, obj):
        return [cls.name for cls in obj.applicable_classes.all()]


class StudentScholarshipSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    scholarship_name = serializers.CharField(source='scholarship.name', read_only=True)
    scholarship_type = serializers.CharField(source='scholarship.scholarship_type', read_only=True)
    scholarship_value = serializers.CharField(source='scholarship.value', read_only=True)
    
    class Meta:
        model = StudentScholarship
        fields = '__all__'


class LateFeeRuleSerializer(serializers.ModelSerializer):
    applicable_classes_names = serializers.SerializerMethodField()
    
    class Meta:
        model = LateFeeRule
        fields = '__all__'
    
    def get_applicable_classes_names(self, obj):
        return [cls.name for cls in obj.applicable_classes.all()]


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    installment_plan_name = serializers.CharField(source='installment_plan.name', read_only=True)
    scholarship_name = serializers.CharField(source='scholarship.scholarship.name', read_only=True)
    total_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('invoice_number', 'issue_date', 'late_fee_amount')


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    student_name = serializers.CharField(source='invoice.student.full_name', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('payment_date', 'received_by')


class PaymentGatewayConfigSerializer(serializers.ModelSerializer):
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)

    class Meta:
        model = PaymentGatewayConfig
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class PaymentTransactionSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    gateway_display = serializers.CharField(source='get_gateway_display', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        read_only_fields = ('gateway_reference', 'status', 'is_confirmed', 'created_at', 'updated_at')


class TransactionLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = TransactionLog
        fields = '__all__'
