from django.contrib import admin
from .models import FeeStructure, Invoice, Payment
from .models import PaymentGatewayConfig, PaymentTransaction

@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ['id', 'class_ref', 'fee_name', 'amount', 'due_date']
    list_filter = ['class_ref', 'is_recurring']
    search_fields = ['fee_name', 'class_ref__name']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'student', 'amount', 'status', 'due_date']
    list_filter = ['status', 'due_date']
    search_fields = ['invoice_number', 'student__full_name']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'amount', 'payment_method', 'payment_date']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['invoice__invoice_number', 'transaction_id']


@admin.register(PaymentGatewayConfig)
class PaymentGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ['id', 'provider', 'name', 'merchant_id', 'is_active']
    list_filter = ['provider', 'is_active']
    search_fields = ['name', 'merchant_id']


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'gateway', 'amount', 'status', 'created_at']
    list_filter = ['gateway', 'status', 'created_at']
    search_fields = ['gateway_reference', 'invoice__invoice_number']
