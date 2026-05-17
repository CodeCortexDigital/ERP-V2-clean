from django.db import models
from django.utils import timezone
import uuid

from services.core.db.softdelete import SoftDeleteModel

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


class Invoice(SoftDeleteModel):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='invoices',
        null=True,
        blank=True,
        db_index=True,
    )
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, blank=True, editable=False)
    student = models.ForeignKey(
        'education_students.Student',
        on_delete=models.CASCADE,
        related_name='invoices',
        db_index=True,
    )
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.SET_NULL, null=True, blank=True)
    installment_plan = models.ForeignKey('InstallmentPlan', on_delete=models.SET_NULL, null=True, blank=True)
    scholarship = models.ForeignKey('StudentScholarship', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    late_fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField(db_index=True)
    issue_date = models.DateField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    description = models.TextField(blank=True)
    is_installment = models.BooleanField(default=False)
    installment_number = models.PositiveIntegerField(null=True, blank=True)
    parent_invoice = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='installments')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date']
        indexes = [
            models.Index(fields=['student', 'due_date']),
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['issue_date']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        """Generate invoice number if not exists"""
        if not self.invoice_number:
            # Generate unique invoice number using UUID
            self.invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
        
        # Calculate late fees if overdue
        if self.due_date < timezone.now().date() and self.status not in ['paid', 'cancelled']:
            self.late_fee_amount = self.calculate_late_fee()
        
        super().save(*args, **kwargs)
    
    @property
    def balance_due(self):
        """Calculate correct balance due including discounts and late fees"""
        total_due = self.amount - self.discount_amount + self.late_fee_amount
        balance = total_due - self.paid_amount
        return max(balance, 0)  # Never return negative
    
    @property
    def total_amount(self):
        """Total amount including late fees and excluding discounts"""
        return self.amount + self.late_fee_amount - self.discount_amount
    
    def calculate_late_fee(self):
        """Calculate late fee based on applicable rules"""
        if not LateFeeRule.objects.filter(is_active=True).exists():
            return 0
        
        days_overdue = (timezone.now().date() - self.due_date).days
        if days_overdue <= 0:
            return 0
        
        # Find applicable late fee rule
        rule = LateFeeRule.objects.filter(
            is_active=True,
            applicable_classes__in=[self.student.current_class]
        ).first()
        
        if not rule:
            rule = LateFeeRule.objects.filter(is_active=True, applicable_classes__isnull=True).first()
        
        if not rule:
            return 0
        
        # Apply grace period
        effective_days = max(0, days_overdue - rule.grace_period_days)
        if effective_days <= 0:
            return 0
        
        if rule.late_fee_type == 'fixed':
            late_fee = rule.late_fee_value
        elif rule.late_fee_type == 'percentage':
            outstanding = self.amount - self.paid_amount
            late_fee = (outstanding * rule.late_fee_value) / 100
        elif rule.late_fee_type == 'daily':
            late_fee = effective_days * rule.late_fee_value
        else:
            late_fee = 0
        
        # Apply maximum late fee if set
        if rule.max_late_fee and late_fee > rule.max_late_fee:
            late_fee = rule.max_late_fee
        
        return late_fee
    
    def apply_scholarship_discount(self):
        """Apply scholarship discount to invoice"""
        if self.scholarship and self.scholarship.is_active:
            scholarship = self.scholarship.scholarship
            if scholarship.scholarship_type == 'percentage':
                self.discount_amount = (self.amount * scholarship.value) / 100
            elif scholarship.scholarship_type == 'fixed':
                self.discount_amount = min(scholarship.value, self.amount)
            elif scholarship.scholarship_type == 'fee_waiver':
                self.discount_amount = self.amount
            self.save()
    
    def create_installments(self):
        """Create installment invoices based on plan"""
        if not self.installment_plan or self.is_installment:
            return
        
        plan = self.installment_plan
        base_amount = self.amount / plan.number_of_installments
        
        for i in range(1, plan.number_of_installments + 1):
            due_date = self.due_date
            if plan.frequency == 'monthly':
                # Handle month overflow
                month = self.due_date.month + i - 1
                year = self.due_date.year
                while month > 12:
                    month -= 12
                    year += 1
                due_date = self.due_date.replace(year=year, month=month)
            elif plan.frequency == 'quarterly':
                month = self.due_date.month + (i-1)*3
                year = self.due_date.year
                while month > 12:
                    month -= 12
                    year += 1
                due_date = self.due_date.replace(year=year, month=month)
            elif plan.frequency == 'yearly':
                due_date = self.due_date.replace(year=self.due_date.year + i - 1)
            
            installment = Invoice.objects.create(
                student=self.student,
                fee_structure=self.fee_structure,
                amount=base_amount,
                due_date=due_date,
                description=f"Installment {i} of {plan.number_of_installments} - {plan.name}",
                is_installment=True,
                installment_number=i,
                parent_invoice=self
            )
        
        # Mark parent as installment plan
        self.description += f" (Installment Plan: {plan.name})"
        self.save()
    
    def __str__(self):
        return f"{self.invoice_number} - {self.student.full_name} - ${self.amount}"


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
        # Validate amount is positive
        if self.amount <= 0:
            raise ValueError(f"Payment amount (${self.amount}) must be greater than zero.")
        
        # Validate overpayment before saving
        if self.invoice:
            # Use the correct balance_due property that accounts for discounts & late fees
            remaining_balance = self.invoice.balance_due
            
            if self.amount > remaining_balance:
                raise ValueError(
                    f"Payment amount (${self.amount}) exceeds remaining balance (${remaining_balance}). "
                    f"Please enter a valid amount."
                )
        
        super().save(*args, **kwargs)
        
        # Update invoice paid amount using correct total_amount
        from django.db.models import Sum
        total_paid = self.invoice.payments.aggregate(total=Sum('amount'))['total'] or 0
        self.invoice.paid_amount = total_paid
        
        # Update invoice status based on correct total_amount
        if total_paid >= self.invoice.total_amount:
            self.invoice.status = 'paid'
        elif total_paid > 0:
            self.invoice.status = 'issued'
        else:
            self.invoice.status = 'issued'
        
        self.invoice.save()
    
    def __str__(self):
        return f"Payment for {self.invoice.invoice_number} - ${self.amount}"
    
    class Meta:
        ordering = ['-payment_date']


class PaymentGatewayConfig(models.Model):
    GATEWAY_PROVIDERS = [
        ('jazzcash', 'JazzCash'),
        ('easypaisa', 'Easypaisa'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=30, choices=GATEWAY_PROVIDERS)
    name = models.CharField(max_length=100, blank=True)
    merchant_id = models.CharField(max_length=200, blank=True)
    api_key = models.CharField(max_length=200, blank=True)
    api_secret = models.CharField(max_length=200, blank=True)
    api_url = models.URLField(blank=True)
    webhook_secret = models.CharField(max_length=200, blank=True)
    callback_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f"{self.get_provider_display()} Configuration"

    class Meta:
        unique_together = ('provider', 'merchant_id')
        ordering = ['provider']


class PaymentTransaction(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payment_transactions')
    gateway = models.CharField(max_length=30, choices=PaymentGatewayConfig.GATEWAY_PROVIDERS)
    config = models.ForeignKey(PaymentGatewayConfig, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='PKR')
    gateway_reference = models.CharField(max_length=128, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    request_payload = models.JSONField(null=True, blank=True)
    response_payload = models.JSONField(null=True, blank=True)
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_gateway_display()} transaction for {self.invoice.invoice_number}"

    class Meta:
        ordering = ['-created_at']


class InstallmentPlan(models.Model):
    """Installment plan for fee payments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    number_of_installments = models.PositiveIntegerField()
    installment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=[
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly')
    ], default='monthly')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.number_of_installments} installments of ${self.installment_amount}"
    
    class Meta:
        ordering = ['-created_at']


class Scholarship(models.Model):
    """Scholarship/Discount management"""
    SCHOLARSHIP_TYPES = [
        ('percentage', 'Percentage Discount'),
        ('fixed', 'Fixed Amount Discount'),
        ('fee_waiver', 'Fee Waiver'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    scholarship_type = models.CharField(max_length=20, choices=SCHOLARSHIP_TYPES, default='percentage')
    value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage (0-100) or fixed amount")
    is_active = models.BooleanField(default=True)
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    applicable_classes = models.ManyToManyField('education_academics.SchoolClass', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        if self.scholarship_type == 'percentage':
            return f"{self.name} - {self.value}% discount"
        return f"{self.name} - ${self.value} discount"
    
    class Meta:
        ordering = ['-created_at']


class StudentScholarship(models.Model):
    """Student scholarship assignments"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='scholarships')
    scholarship = models.ForeignKey(Scholarship, on_delete=models.CASCADE)
    assigned_date = models.DateField(auto_now_add=True)
    assigned_by = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.student.full_name} - {self.scholarship.name}"
    
    class Meta:
        ordering = ['-assigned_date']
        unique_together = ['student', 'scholarship']


class LateFeeRule(models.Model):
    """Late fee calculation rules"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    grace_period_days = models.PositiveIntegerField(default=0)
    late_fee_type = models.CharField(max_length=20, choices=[
        ('fixed', 'Fixed Amount'),
        ('percentage', 'Percentage of Outstanding'),
        ('daily', 'Daily Rate'),
    ], default='fixed')
    late_fee_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_late_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    applicable_classes = models.ManyToManyField('education_academics.SchoolClass', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.late_fee_type} late fee"
    
    class Meta:
        ordering = ['-created_at']


class TransactionLog(models.Model):
    """Audit log for all financial transactions"""
    ACTION_TYPES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('payment', 'Payment Made'),
        ('refund', 'Refund Issued'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    model_name = models.CharField(max_length=50)
    object_id = models.CharField(max_length=100)
    object_name = models.CharField(max_length=200)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.get_full_name() if self.user else 'System'} - {self.action} {self.model_name}"
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'timestamp']),
        ]