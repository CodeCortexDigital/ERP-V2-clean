from django.contrib import admin
from .models import FeeStructure, Invoice, Payment

@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount', 'frequency', 'is_active')
    list_filter = ('frequency', 'is_active')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'student', 'amount', 'paid_amount', 'balance', 'due_date', 'status')
    list_filter = ('status',)
    search_fields = ('invoice_number', 'student__full_name')
    raw_id_fields = ('student',)
    
    def balance(self, obj):
        return obj.amount - obj.paid_amount
    balance.short_description = 'Balance'

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_id', 'invoice', 'amount', 'payment_date', 'payment_method')
    list_filter = ('payment_method',)
