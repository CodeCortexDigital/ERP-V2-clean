"""School library: the catalogue (books and their copies), members, loans, reservations and fines."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel


class LibrarySettings(TenantScopedModel):
    """One row per school: loan rules."""
    loan_days_student = models.PositiveSmallIntegerField(default=14)
    loan_days_staff = models.PositiveSmallIntegerField(default=28)
    max_loans_student = models.PositiveSmallIntegerField(default=3)
    max_loans_staff = models.PositiveSmallIntegerField(default=10)
    max_renewals = models.PositiveSmallIntegerField(default=2)
    hold_days = models.PositiveSmallIntegerField(default=3, help_text='Days a returned copy is kept for the person who reserved it')
    fine_per_day = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0'),
                                       help_text='0 means no fines')
    block_when_overdue = models.BooleanField(default=True, help_text='No new loans while something is overdue')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['tenant'], name='uniq_library_settings')]


class Book(TenantScopedModel):
    """A title in the catalogue. Physical books are its copies."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    subtitle = models.CharField(max_length=300, blank=True, default='')
    authors = models.CharField(max_length=300, blank=True, default='')
    isbn = models.CharField(max_length=20, blank=True, default='', db_index=True)
    publisher = models.CharField(max_length=200, blank=True, default='')
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    edition = models.CharField(max_length=50, blank=True, default='')
    subject = models.CharField(max_length=100, blank=True, default='', help_text='e.g. Fiction, Science, Urdu')
    language = models.CharField(max_length=50, blank=True, default='')
    reading_level = models.CharField(max_length=50, blank=True, default='', help_text='e.g. Grades 3–5')
    call_number = models.CharField(max_length=50, blank=True, default='', help_text='Shelf mark, e.g. 530 KHA')
    description = models.TextField(blank=True, default='')
    cover_url = models.URLField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class BookCopy(TenantScopedModel):
    STATUSES = [
        ('available', 'On the shelf'), ('on_loan', 'On loan'), ('on_hold', 'Held for a reservation'),
        ('lost', 'Lost'), ('damaged', 'Damaged'), ('withdrawn', 'Withdrawn'),
    ]
    CONDITIONS = [('new', 'New'), ('good', 'Good'), ('fair', 'Fair'), ('poor', 'Poor')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='copies')
    barcode = models.CharField(max_length=40, db_index=True)
    status = models.CharField(max_length=10, choices=STATUSES, default='available')
    condition = models.CharField(max_length=10, choices=CONDITIONS, default='good')
    location = models.CharField(max_length=100, blank=True, default='', help_text='Shelf or branch')
    acquired_on = models.DateField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['barcode']
        constraints = [models.UniqueConstraint(fields=['tenant', 'barcode'], name='uniq_library_barcode')]


class Member(TenantScopedModel):
    """A library card: a student or a member of staff."""
    KINDS = [('student', 'Student'), ('staff', 'Staff')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=10, choices=KINDS)
    student = models.OneToOneField('education_students.Student', on_delete=models.CASCADE, null=True, blank=True,
                                   related_name='library_member')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    name = models.CharField(max_length=200)
    card_number = models.CharField(max_length=40, db_index=True)
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [models.UniqueConstraint(fields=['tenant', 'card_number'], name='uniq_library_card')]


class Loan(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    copy = models.ForeignKey(BookCopy, on_delete=models.PROTECT, related_name='loans')
    member = models.ForeignKey(Member, on_delete=models.PROTECT, related_name='loans')
    issued_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    returned_at = models.DateTimeField(null=True, blank=True)
    renewals = models.PositiveSmallIntegerField(default=0)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    returned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    condition_on_return = models.CharField(max_length=10, blank=True, default='')
    fine_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    fine_status = models.CharField(max_length=10, default='none',
                                   choices=[('none', 'No fine'), ('due', 'To pay'), ('paid', 'Paid'), ('waived', 'Waived')])
    last_reminded_at = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-issued_at']
        indexes = [models.Index(fields=['member', 'returned_at']), models.Index(fields=['due_date', 'returned_at'])]


class Reservation(TenantScopedModel):
    STATUSES = [('waiting', 'In the queue'), ('ready', 'Ready to collect'), ('collected', 'Collected'),
                ('cancelled', 'Cancelled'), ('expired', 'Not collected in time')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations')
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='reservations')
    status = models.CharField(max_length=10, choices=STATUSES, default='waiting')
    copy = models.ForeignKey(BookCopy, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    hold_until = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    ready_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
