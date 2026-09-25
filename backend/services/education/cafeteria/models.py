"""School cafeteria: what is sold, the weekly menu, meal plans, each student's prepaid account and every transaction."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel

MONEY = dict(max_digits=10, decimal_places=2)


class CafeteriaSettings(TenantScopedModel):
    default_daily_limit = models.DecimalField(null=True, blank=True, help_text='Blank = no limit unless a parent sets one', **MONEY)
    low_balance_level = models.DecimalField(default=Decimal('200'), help_text='Tell the family when the balance falls to this', **MONEY)
    allow_negative = models.DecimalField(default=Decimal('0'), help_text='How far below zero a student may go (0 = never)', **MONEY)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['tenant'], name='uniq_cafeteria_settings')]


class FoodItem(TenantScopedModel):
    CATEGORIES = [('meal', 'Meal'), ('snack', 'Snack'), ('drink', 'Drink'), ('fruit', 'Fruit'), ('dessert', 'Dessert'), ('other', 'Other')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=10, choices=CATEGORIES, default='meal')
    price = models.DecimalField(**MONEY)
    description = models.CharField(max_length=255, blank=True, default='')
    allergens = models.CharField(max_length=255, blank=True, default='', help_text='Comma separated, e.g. nuts, milk, egg, gluten')
    is_vegetarian = models.BooleanField(default=False)
    is_halal = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'name']

    def allergen_list(self):
        return [a.strip().lower() for a in self.allergens.split(',') if a.strip()]


class MenuDay(TenantScopedModel):
    """What is served on one date at one meal time."""
    MEALS = [('breakfast', 'Breakfast'), ('lunch', 'Lunch'), ('snack', 'Snack')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(db_index=True)
    meal = models.CharField(max_length=10, choices=MEALS, default='lunch')
    items = models.ManyToManyField(FoodItem, blank=True, related_name='menus')
    note = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['date', 'meal']
        constraints = [models.UniqueConstraint(fields=['tenant', 'date', 'meal'], name='uniq_menu_day')]


class MealPlan(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120, help_text='e.g. Lunch every school day')
    meal = models.CharField(max_length=10, choices=MenuDay.MEALS, default='lunch')
    monthly_fee = models.DecimalField(**MONEY)
    description = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']


class MealPlanMember(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan = models.ForeignKey(MealPlan, on_delete=models.CASCADE, related_name='members')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='meal_plans')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['plan', 'student__full_name']


class Account(TenantScopedModel):
    """A student's prepaid cafeteria balance."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField('education_students.Student', on_delete=models.CASCADE, related_name='cafeteria_account')
    balance = models.DecimalField(default=Decimal('0'), **MONEY)
    daily_limit = models.DecimalField(null=True, blank=True, help_text='Set by the family; blank = the school default', **MONEY)
    is_blocked = models.BooleanField(default=False)
    low_alert_sent = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class Transaction(TenantScopedModel):
    KINDS = [('top_up', 'Top-up'), ('purchase', 'Purchase'), ('meal_plan', 'Meal plan meal'), ('refund', 'Refund'),
             ('adjustment', 'Adjustment')]
    METHODS = [('cash', 'Cash'), ('invoice', 'Invoice / online'), ('other', 'Other')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transactions')
    kind = models.CharField(max_length=10, choices=KINDS)
    amount = models.DecimalField(help_text='Positive adds to the balance, negative takes from it', **MONEY)
    balance_after = models.DecimalField(**MONEY)
    items = models.JSONField(default=list, blank=True)  # [{name, quantity, price}]
    method = models.CharField(max_length=10, choices=METHODS, blank=True, default='')
    meal = models.CharField(max_length=10, blank=True, default='')
    refund_of = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='refunds')
    note = models.CharField(max_length=255, blank=True, default='')
    by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']
        indexes = [models.Index(fields=['account', 'at']), models.Index(fields=['kind', 'at'])]


class TopUpRequest(TenantScopedModel):
    """A family asks to add money; it is billed as an invoice and credited when the invoice is paid."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='top_up_requests')
    amount = models.DecimalField(**MONEY)
    invoice = models.OneToOneField('education_finance.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='cafeteria_top_up')
    status = models.CharField(max_length=10, default='pending', choices=[('pending', 'Waiting for payment'), ('credited', 'Added'), ('cancelled', 'Cancelled')])
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    credited_at = models.DateTimeField(null=True, blank=True)
