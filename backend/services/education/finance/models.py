from django.db import models
from django.utils import timezone
import uuid

class FeeStructure(models.Model):
    """Fee structure for classes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_ref = models.ForeignKey('education_academics.SchoolClass', on_delete=models.CASCADE, related_name='fee_structures')
    section = models.ForeignKey('education_academics.Section', on_delete=models.SET_NULL, null=True, blank=True)
    fee_name = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    academic_year = models.CharField(max_length=20, default='2026-2027')
    is_recurring = models.BooleanField(default=False)
    frequency = models.CharField(max_length=20, choices=[('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], default='yearly')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.class_ref.name} - {self.fee_name} (${self.amount})"
    
    class Meta:
        ordering = ['-due_date']


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='invoices')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    issue_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year = timezone.now().year
            last_invoice = Invoice.objects.filter(invoice_number__startswith=f'INV-{year}').order_by('-invoice_number').first()
            if last_invoice:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            self.invoice_number = f'INV-{year}-{str(new_num).zfill(4)}'
        super().save(*args, **kwargs)
    
    @property
    def balance_due(self):
        return self.amount - self.paid_amount
    
    def __str__(self):
        return f"{self.invoice_number} - {self.student.full_name} - ${self.amount}"
    
    class Meta:
        ordering = ['-due_date']


class Payment(models.Model):
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card'),
        ('cheque', 'Cheque'),
        ('online', 'Online Payment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    transaction_id = models.CharField(max_length=100, blank=True)
    received_by = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update invoice paid amount
        total_paid = self.invoice.payments.aggregate(total=models.Sum('amount'))['total'] or 0
        self.invoice.paid_amount = total_paid
        if total_paid >= self.invoice.amount:
            self.invoice.status = 'paid'
        elif total_paid > 0:
            self.invoice.status = 'issued'
        self.invoice.save()
    
    def __str__(self):
        return f"Payment for {self.invoice.invoice_number} - ${self.amount}"
    
    class Meta:
        ordering = ['-payment_date']
