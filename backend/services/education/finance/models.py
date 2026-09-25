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
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
        ('carried_forward', 'Carried Forward'),
    ]
    
    INVOICE_TYPE_CHOICES = [
        ('tuition', 'Tuition'),
        ('transport', 'Transport'),
        ('hostel', 'Hostel'),
        ('miscellaneous', 'Miscellaneous'),
        ('composite', 'Composite'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_type = models.CharField(
        max_length=20,
        choices=INVOICE_TYPE_CHOICES,
        default='tuition',
        help_text="The category of charges billed on this invoice"
    )
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
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Pure monthly fee — no carry-forward
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Balance brought forward (B/F) from previous unpaid invoices")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    late_fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField(db_index=True)
    issue_date = models.DateField(auto_now_add=True, db_index=True)
    invoice_month = models.DateField(null=True, blank=True, db_index=True, help_text="First day of the month this invoice belongs to (e.g. 2026-06-01)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    description = models.TextField(blank=True)
    cancellation_remarks = models.TextField(blank=True, null=True)
    breakdown = models.JSONField(default=dict, blank=True)
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
            # Format: INV-YYYY-MM-XXXX (sequential per month)
            today = timezone.localtime().date()
            prefix = f"INV-{today.year}-{today.month:02d}-"
            # Count existing invoices this month (including soft-deleted) to build sequential number
            existing_count = Invoice.all_objects.filter(
                invoice_number__startswith=prefix
            ).count()
            
            sequence = existing_count + 1
            while True:
                candidate = f"{prefix}{sequence:04d}"
                if not Invoice.all_objects.filter(invoice_number=candidate).exists():
                    self.invoice_number = candidate
                    break
                sequence += 1
        
        # Set invoice_month if not set
        if self.invoice_month is None and self.issue_date:
            self.invoice_month = self.issue_date.replace(day=1) if hasattr(self.issue_date, 'replace') else None
        
        # Apply discount automatically from active student scholarship if discount_amount is 0
        if self.discount_amount == 0:
            if not self.scholarship:
                try:
                    from services.education.finance.models import StudentScholarship
                    active_ss = StudentScholarship.objects.filter(student=self.student, is_active=True).first()
                    if active_ss:
                        self.scholarship = active_ss
                except Exception:
                    pass

            if self.scholarship and self.scholarship.is_active:
                try:
                    sc = self.scholarship.scholarship
                    if sc.scholarship_type == 'percentage':
                        self.discount_amount = (self.amount * sc.value) / 100
                    elif sc.scholarship_type == 'fixed':
                        self.discount_amount = min(sc.value, self.amount)
                    elif sc.scholarship_type == 'fee_waiver':
                        self.discount_amount = self.amount
                except Exception:
                    pass

        # NOTE: Late fees are NOT auto-calculated here.
        # They are applied exclusively by the 'apply_late_fees' management command
        # on the 10th of each month. This prevents fees being added on every save.
        
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        # Automatic carry-forward update:
        # If this is a new invoice and has opening_balance > 0, mark older unpaid/partial/overdue invoices as carried_forward
        if is_new and self.status in ['issued', 'partial', 'overdue'] and self.opening_balance > 0:
            Invoice.objects.filter(
                student=self.student,
                status__in=['issued', 'partial', 'overdue']
            ).exclude(id=self.id).update(status='carried_forward')
    
    @property
    def balance_due(self):
        if self.status in ['carried_forward', 'cancelled']:
            return 0
        """Balance due = opening_balance + this month fee + late fee - discount - paid"""
        total_due = self.opening_balance + self.amount - self.discount_amount + self.late_fee_amount
        balance = total_due - self.paid_amount
        return max(balance, 0)  # Never return negative
    
    @property
    def total_amount(self):
        """Total amount payable = opening_balance + fee + late fee - discount"""
        return self.opening_balance + self.amount + self.late_fee_amount - self.discount_amount
    
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
        ('account_credit', 'Account credit'),
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
        
        recalculate_invoice(self.invoice)
    
    def __str__(self):
        return f"Payment for {self.invoice.invoice_number} - ${self.amount}"
    
    class Meta:
        ordering = ['-payment_date']


def recalculate_invoice(invoice):
    """Set paid_amount (payments minus refunds) and the matching status on an invoice."""
    from django.db.models import Sum

    if invoice.status in ('cancelled', 'carried_forward'):
        return invoice
    paid = invoice.payments.aggregate(total=Sum('amount'))['total'] or 0
    refunded = Refund.objects.filter(payment__invoice=invoice).aggregate(total=Sum('amount'))['total'] or 0
    total_paid = paid - refunded
    invoice.paid_amount = total_paid
    overdue = invoice.due_date < timezone.now().date()
    if total_paid >= invoice.total_amount:
        invoice.status = 'paid'
    elif total_paid > 0:
        invoice.status = 'overdue' if overdue else 'partial'
    else:
        invoice.status = 'overdue' if overdue else 'issued'
    invoice.save()
    return invoice


class Refund(models.Model):
    """Money given back on a payment: to the card, in cash or bank transfer, or kept as account credit."""
    METHODS = [
        ('original', 'Back to the original payment method'),
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank transfer'),
        ('account_credit', 'Kept as account credit'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHODS, default='original')
    reason = models.TextField(blank=True, default='')
    gateway_reference = models.CharField(max_length=128, blank=True, default='')
    created_by = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        from django.db.models import Sum

        if self.amount <= 0:
            raise ValueError('The refund amount must be greater than zero.')
        already = Refund.objects.filter(payment=self.payment).exclude(pk=self.pk).aggregate(t=Sum('amount'))['t'] or 0
        if self.amount + already > self.payment.amount:
            raise ValueError(f'You can refund at most {self.payment.amount - already} on this payment.')
        super().save(*args, **kwargs)
        recalculate_invoice(self.payment.invoice)


class AccountCredit(models.Model):
    """Credit held for a family (or a student without a household).

    Positive rows add credit (overpayment, goodwill, refund kept as credit);
    negative rows use it (applied to an invoice). The balance is the sum.
    """
    KINDS = [
        ('overpayment', 'Overpayment'),
        ('goodwill', 'Credit given by the school'),
        ('refund', 'Refund kept as credit'),
        ('applied', 'Applied to an invoice'),
        ('adjustment', 'Adjustment'),
    ]

    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    household = models.ForeignKey('education_students.Household', on_delete=models.CASCADE, null=True, blank=True,
                                  related_name='credits')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, null=True, blank=True,
                                related_name='account_credits')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    kind = models.CharField(max_length=20, choices=KINDS)
    note = models.CharField(max_length=255, blank=True, default='')
    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_by = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class PaymentGatewayConfig(models.Model):
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    GATEWAY_PROVIDERS = [
        ('jazzcash', 'JazzCash'),
        ('easypaisa', 'Easypaisa'),
        ('stripe', 'Stripe (cards, Apple Pay, Google Pay)'),
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
        # One configuration per provider and merchant account within each school.
        unique_together = ('tenant', 'provider', 'merchant_id')
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
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    number_of_installments = models.PositiveIntegerField()
    installment_amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=[
        ('weekly', 'Weekly'),
        ('biweekly', 'Every two weeks'),
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
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
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
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
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
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
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




class FinanceSettings(models.Model):
    """Tenant-level finance system settings"""
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    school_name = models.CharField(max_length=255, default='School Management System')
    grace_period_days = models.PositiveIntegerField(default=7)

    auto_send_reminders = models.CharField(
        max_length=30,
        choices=[
            ('disabled', 'Disabled'),
            ('7_days_before', '7 Days Before'),
            ('3_days_before', '3 Days Before'),
            ('on_due_date', 'On Due Date'),
        ],
        default='disabled'
    )

    default_late_fee = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.50
    )

    academic_year = models.CharField(
        max_length=20,
        default='2026-2027'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.school_name} Settings"


class AccountHead(models.Model):
    """Chart of accounts - income and expense heads"""
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    
    class Meta:
        constraints = [models.UniqueConstraint(fields=['tenant', 'code'], name='uniq_accounthead_code_per_school')]
        ordering = ['type', 'name']
    
    def save(self, *args, **kwargs):
        if not self.code:
            prefix = 'INC' if self.type == 'income' else 'EXP'
            count = AccountHead.objects.filter(type=self.type).count()
            self.code = f"{prefix}-{count + 1:04d}"
        super().save(*args, **kwargs)


class LedgerEntry(models.Model):
    """General ledger entries for income and expense tracking"""
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(db_index=True)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    account_head = models.ForeignKey(AccountHead, on_delete=models.SET_NULL, null=True, blank=True, related_name='ledger_entries')
    reference = models.CharField(max_length=100, blank=True, help_text="Optional reference number")
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('core_accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.date} - {self.description} - {self.get_type_display()} - {self.amount}"
    
    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['type', 'date']),
            models.Index(fields=['account_head', 'date']),
        ]


class Payslip(models.Model):
    """Monthly salary records for employees"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('education_academics.Teacher', on_delete=models.CASCADE, related_name='payslips')
    month = models.DateField(help_text="First day of the month (e.g. 2026-07-01)")
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.month.strftime('%B %Y')} - {self.get_status_display()}"
    
    class Meta:
        ordering = ['-month', 'employee']
        unique_together = ['employee', 'month']
        indexes = [
            models.Index(fields=['employee', 'month']),
            models.Index(fields=['status']),
        ]
    
    def save(self, *args, **kwargs):
        self.net_salary = self.basic_salary + self.allowances - self.deductions
        if self.paid_amount >= self.net_salary and self.net_salary > 0:
            self.status = 'paid'
        elif self.paid_amount > 0:
            self.status = 'partial'
        super().save(*args, **kwargs)


class EmployeeCredit(models.Model):
    """Employee advance payments and credits"""
    TYPE_CHOICES = [
        ('advance', 'Advance Payment'),
        ('bonus', 'Bonus'),
        ('loan', 'Loan'),
        ('deduction', 'Deduction'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('education_academics.Teacher', on_delete=models.CASCADE, related_name='credits')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    description = models.CharField(max_length=255, blank=True)
    is_settled = models.BooleanField(default=False)
    settled_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.get_type_display()} - {self.amount}"
    
    class Meta:
        ordering = ['-date']
        indexes = [
            models.Index(fields=['employee', 'type']),
            models.Index(fields=['date']),
        ]


class WeekdayConfig(models.Model):
    """School weekday configuration"""
    # School (tenant) this row belongs to; filled in automatically (tenants/scoping.py).
    tenant = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, null=True, blank=True,
                               related_name='+', db_index=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20)
    day_code = models.CharField(max_length=10)
    is_active = models.BooleanField(default=True)
    is_half_day = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {'Active' if self.is_active else 'Inactive'}"
    
    class Meta:
        constraints = [models.UniqueConstraint(fields=['tenant', 'day_code'], name='uniq_weekdayconfig_day_code_per_school')]
        ordering = ['order']
        verbose_name_plural = 'Weekday Configs'
    


    