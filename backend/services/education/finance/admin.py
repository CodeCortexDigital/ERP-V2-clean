from django.contrib import admin
from .models import FeeStructure, Invoice, Payment

@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ['id', 'fee_name', 'class_ref', 'amount', 'due_date']
    list_filter = ['class_ref', 'is_recurring']
    search_fields = ['fee_name', 'class_ref__name']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'student', 'amount', 'paid_amount', 'status', 'due_date']
    list_filter = ['status', 'due_date']
    search_fields = ['invoice_number', 'student__full_name']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'amount', 'payment_date', 'payment_method']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['invoice__invoice_number', 'transaction_id']
