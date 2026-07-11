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
    FinanceSettings,
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
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    class_name = serializers.CharField(source='student.current_class.name', read_only=True)
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


class PaymentHistorySerializer(serializers.ModelSerializer):
    """Lightweight serializer for embedding payment history inside an invoice."""
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_date', 'payment_method',
            'payment_method_display', 'transaction_id', 'notes',
            'received_by_name', 'created_at',
        ]

    def get_received_by_name(self, obj):
        if obj.received_by:
            return obj.received_by.get_full_name() or obj.received_by.username
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id_num = serializers.CharField(source='student.student_id', read_only=True)
    class_name = serializers.SerializerMethodField()
    installment_plan_name = serializers.CharField(source='installment_plan.name', read_only=True)
    scholarship_name = serializers.CharField(source='scholarship.scholarship.name', read_only=True)

    # Computed properties — read-only
    total_amount = serializers.ReadOnlyField()
    balance_due = serializers.ReadOnlyField()

    # Payment history embedded in each invoice response
    payment_history = serializers.SerializerMethodField()

    # Ledger breakdown for frontend display
    ledger = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('invoice_number', 'issue_date')

    def get_class_name(self, obj):
        try:
            return obj.student.current_class.name if obj.student.current_class else None
        except Exception:
            return None

    def get_payment_history(self, obj):
        payments = obj.payments.order_by('payment_date')
        return PaymentHistorySerializer(payments, many=True).data

    def get_ledger(self, obj):
        """
        Returns a structured ledger for the invoice detail view.
        
        Example:
            Opening Balance (B/F):   2,500.00
            Monthly Fee:             4,500.00
            Late Fee:                  500.00
            Discount:               -  200.00
            ─────────────────────────────────
            Total Due:               7,300.00
            Amount Paid:            -3,500.00
            ─────────────────────────────────
            Balance Due:             3,800.00
        """
        return {
            'opening_balance': float(obj.opening_balance),
            'fee_amount': float(obj.amount),
            'late_fee_amount': float(obj.late_fee_amount),
            'discount_amount': float(obj.discount_amount),
            'total_due': float(obj.total_amount),
            'paid_amount': float(obj.paid_amount),
            'balance_due': float(obj.balance_due),
            'invoice_month_label': (
                obj.invoice_month.strftime('%B %Y') if obj.invoice_month else ''
            ),
        }


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    student_name = serializers.CharField(source='invoice.student.full_name', read_only=True)
    student_id = serializers.CharField(source='invoice.student.student_id', read_only=True)
    class_name = serializers.CharField(source='invoice.student.current_class.name', default='', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('payment_date', 'received_by')
    
    def validate(self, attrs):
        """Validate payment amount against remaining balance"""
        invoice = attrs.get('invoice')
        amount = attrs.get('amount')
        
        if not invoice or not amount:
            return attrs
        
        remaining_balance = invoice.balance_due
        
        if amount > remaining_balance:
            raise serializers.ValidationError({
                'amount': (
                    f'Payment amount ({amount}) exceeds remaining balance ({remaining_balance}). '
                    'Please enter a valid amount.'
                )
            })
        
        if amount <= 0:
            raise serializers.ValidationError({
                'amount': 'Payment amount must be greater than zero.'
            })
        
        return attrs


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


class FinanceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceSettings
        fields = '__all__'
