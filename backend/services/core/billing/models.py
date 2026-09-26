"""SaaS plans and each school's subscription (P11). Platform-level: not scoped to a school."""
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

# Optional areas a plan can include. Everything else (students, attendance, gradebook, fees, messages, calendar,
# admissions, security...) is in every plan.
MODULES = {
    'library': 'Library',
    'transport': 'Transport',
    'inventory': 'Inventory',
    'cafeteria': 'Cafeteria',
    'reports': 'Advanced reports',
    'integrations': 'Integrations (Microsoft, Google Classroom, own email)',
    'ai': 'AI assistant',
    'online_payments': 'Online fee payments',
}

GRACE_DAYS = 7  # after a missed renewal the school keeps working this long before becoming read-only


class Plan(models.Model):
    code = models.SlugField(max_length=30, unique=True)
    name = models.CharField(max_length=60)
    description = models.CharField(max_length=255, blank=True)
    currency = models.CharField(max_length=3, default='USD')
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    student_limit = models.PositiveIntegerField(null=True, blank=True, help_text='Empty = unlimited')
    staff_limit = models.PositiveIntegerField(null=True, blank=True, help_text='Empty = unlimited')
    modules = models.JSONField(default=list, blank=True)
    trial_days = models.PositiveSmallIntegerField(default=30)
    contact_sales = models.BooleanField(default=False, help_text='Priced per school; not chosen in the app')
    is_public = models.BooleanField(default=True)
    sort = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['sort', 'price_monthly']

    def __str__(self):
        return self.name

    def price(self, cycle):
        return self.price_yearly if cycle == 'yearly' else self.price_monthly


class Subscription(models.Model):
    STATUSES = [
        ('trialing', 'Free trial'),
        ('active', 'Active'),
        ('past_due', 'Payment overdue'),
        ('read_only', 'Read-only'),
        ('suspended', 'Suspended'),
        ('cancelled', 'Cancelled'),
    ]
    CYCLES = [('monthly', 'Monthly'), ('yearly', 'Yearly')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.OneToOneField('core_tenants.School', on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='subscriptions')
    status = models.CharField(max_length=12, choices=STATUSES, default='trialing')
    billing_cycle = models.CharField(max_length=8, choices=CYCLES, default='monthly')
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    pending_plan = models.ForeignKey(Plan, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    pending_cycle = models.CharField(max_length=8, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.school} on {self.plan}'

    def effective_status(self, now=None):
        """The status that applies right now, taking expired trials and missed renewals into account."""
        now = now or timezone.now()
        if self.status in ('suspended', 'read_only'):
            return self.status
        if self.status == 'trialing':
            return 'trialing' if (self.trial_ends_at and self.trial_ends_at > now) else 'read_only'
        if self.status == 'cancelled':
            return 'cancelled' if (self.current_period_end and self.current_period_end > now) else 'read_only'
        if self.status in ('active', 'past_due'):
            if self.current_period_end is None or self.current_period_end > now:
                return 'active' if self.status == 'active' else 'past_due'
            if self.current_period_end + timedelta(days=GRACE_DAYS) > now:
                return 'past_due'
            return 'read_only'
        return self.status

    def can_write(self, now=None):
        return self.effective_status(now) in ('trialing', 'active', 'past_due', 'cancelled')

    def has_module(self, key):
        return key in (self.plan.modules or [])


class SubscriptionEvent(models.Model):
    """History: trial started, plan changed, renewed, cancelled, status set by the platform owner..."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='subscription_events')
    kind = models.CharField(max_length=30)
    summary = models.CharField(max_length=255)
    by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class TaxRule(models.Model):
    """Tax added to platform invoices for schools in a country (P12)."""
    country = models.CharField(max_length=2, unique=True, help_text='ISO country code, e.g. GB, DE, PK')
    label = models.CharField(max_length=30, default='VAT')
    rate = models.DecimalField(max_digits=5, decimal_places=2, help_text='Percent, e.g. 20.00')
    exempt_with_tax_id = models.BooleanField(default=False, help_text='Reverse charge: no tax when the school gives a tax ID')

    class Meta:
        ordering = ['country']

    def __str__(self):
        return f'{self.country} {self.label} {self.rate}%'


class PlatformInvoice(models.Model):
    """What the platform charges a school: one paid period, or the difference for an upgrade (P12)."""
    STATUSES = [('open', 'Open'), ('paid', 'Paid'), ('void', 'Void')]
    KINDS = [('period', 'Subscription period'), ('proration', 'Upgrade difference')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=20, unique=True)
    school = models.ForeignKey('core_tenants.School', on_delete=models.CASCADE, related_name='platform_invoices')
    kind = models.CharField(max_length=10, choices=KINDS, default='period')
    plan = models.ForeignKey(Plan, null=True, on_delete=models.SET_NULL, related_name='+')
    plan_name = models.CharField(max_length=60)
    billing_cycle = models.CharField(max_length=8, default='monthly')
    period_start = models.DateField()
    period_end = models.DateField()
    currency = models.CharField(max_length=3, default='USD')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_label = models.CharField(max_length=30, blank=True)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_note = models.CharField(max_length=200, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=6, choices=STATUSES, default='open')
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    paid_via = models.CharField(max_length=20, blank=True)
    payment_reference = models.CharField(max_length=120, blank=True)
    bill_to = models.JSONField(default=dict, blank=True)
    reminders = models.JSONField(default=list, blank=True)
    stripe_session_id = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issue_date', '-number']

    def __str__(self):
        return f'{self.number} {self.school} {self.total} {self.currency}'

    def is_overdue(self, today=None):
        return self.status == 'open' and self.due_date < (today or timezone.localdate())
