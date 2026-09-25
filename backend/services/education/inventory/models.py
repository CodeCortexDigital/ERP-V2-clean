"""School inventory: items and their stock, suppliers, every movement in and out, and purchase orders."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel

QTY = dict(max_digits=12, decimal_places=2)
MONEY = dict(max_digits=12, decimal_places=2)


class Category(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['name']


class Supplier(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150, blank=True, default='')
    phone = models.CharField(max_length=30, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    tax_number = models.CharField(max_length=50, blank=True, default='', help_text='NTN / VAT / tax ID')
    notes = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']


class Item(TenantScopedModel):
    UNITS = [('pcs', 'Pieces'), ('box', 'Boxes'), ('pack', 'Packs'), ('ream', 'Reams'), ('set', 'Sets'),
             ('pair', 'Pairs'), ('kg', 'Kilograms'), ('litre', 'Litres'), ('metre', 'Metres')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=40, db_index=True, help_text='Item code')
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='items')
    unit = models.CharField(max_length=10, choices=UNITS, default='pcs')
    description = models.TextField(blank=True, default='')
    location = models.CharField(max_length=100, blank=True, default='', help_text='Store room / shelf')
    quantity = models.DecimalField(default=Decimal('0'), **QTY)
    reorder_level = models.DecimalField(default=Decimal('0'), help_text='Warn when stock falls to this', **QTY)
    reorder_quantity = models.DecimalField(default=Decimal('0'), help_text='How much to order', **QTY)
    unit_cost = models.DecimalField(default=Decimal('0'), help_text='Average cost of one unit', **MONEY)
    sale_price = models.DecimalField(null=True, blank=True, help_text='Price when sold to a student (uniform, books)', **MONEY)
    preferred_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    is_active = models.BooleanField(default=True)
    low_alert_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [models.UniqueConstraint(fields=['tenant', 'sku'], name='uniq_inventory_sku')]

    @property
    def is_low(self):
        return self.is_active and self.quantity <= self.reorder_level


class Movement(TenantScopedModel):
    """One change to an item's stock. Positive quantity = in, negative = out."""
    KINDS = [
        ('received', 'Received'), ('returned', 'Returned to store'), ('count_up', 'Stock count (more)'),
        ('issued', 'Issued'), ('sold', 'Sold to a student'), ('damaged', 'Damaged / lost'), ('count_down', 'Stock count (less)'),
    ]
    IN_KINDS = ('received', 'returned', 'count_up')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='movements')
    kind = models.CharField(max_length=12, choices=KINDS)
    quantity = models.DecimalField(**QTY)
    unit_cost = models.DecimalField(default=Decimal('0'), **MONEY)
    balance_after = models.DecimalField(**QTY)
    issued_to = models.CharField(max_length=150, blank=True, default='', help_text='Department, classroom or person')
    student = models.ForeignKey('education_students.Student', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    invoice = models.ForeignKey('education_finance.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    purchase_line = models.ForeignKey('PurchaseLine', on_delete=models.SET_NULL, null=True, blank=True, related_name='movements')
    reference = models.CharField(max_length=100, blank=True, default='')
    note = models.CharField(max_length=255, blank=True, default='')
    by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-at']
        indexes = [models.Index(fields=['item', 'at']), models.Index(fields=['kind', 'at'])]


class PurchaseOrder(TenantScopedModel):
    STATUSES = [('draft', 'Draft'), ('ordered', 'Ordered'), ('partial', 'Partly received'), ('received', 'Received'),
                ('cancelled', 'Cancelled')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=30, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=10, choices=STATUSES, default='draft')
    order_date = models.DateField(null=True, blank=True)
    expected_date = models.DateField(null=True, blank=True)
    supplier_invoice = models.CharField(max_length=100, blank=True, default='', help_text="The supplier's bill number")
    notes = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [models.UniqueConstraint(fields=['tenant', 'number'], name='uniq_purchase_order_number')]


class PurchaseLine(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='lines')
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='+')
    quantity = models.DecimalField(**QTY)
    unit_cost = models.DecimalField(**MONEY)
    received_quantity = models.DecimalField(default=Decimal('0'), **QTY)

    class Meta:
        ordering = ['item__name']
