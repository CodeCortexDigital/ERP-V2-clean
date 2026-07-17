from functools import cached_property

from django.db import models
import uuid

from services.core.db.softdelete import SoftDeleteModel
from services.core.storage.utils import student_profile_upload_to
from services.core.tenants.mixins import SchoolAliasMixin


class Student(SchoolAliasMixin, SoftDeleteModel):
    tenant = models.ForeignKey(
        'core_tenants.School',
        on_delete=models.CASCADE,
        related_name='students',
        null=True,
        blank=True,
        db_index=True,
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], null=True, blank=True)
    guardian_name = models.CharField(max_length=255, blank=True)
    emergency_contact = models.CharField(max_length=20, blank=True)
    father_name = models.CharField(max_length=255, blank=True)
    mother_name = models.CharField(max_length=255, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    additional_note = models.TextField(blank=True, default='')
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    # Extended "Other Information" / guardian detail fields
    discount_in_fee = models.CharField(max_length=20, blank=True, default='')
    identification_mark = models.TextField(blank=True, default='')
    blood_group = models.CharField(max_length=10, blank=True, default='')
    disease = models.TextField(blank=True, default='')
    birth_form_id = models.CharField(max_length=100, blank=True, default='')
    cast = models.CharField(max_length=100, blank=True, default='')
    previous_school = models.CharField(max_length=200, blank=True, default='')
    previous_id = models.CharField(max_length=100, blank=True, default='')
    orphan_student = models.CharField(max_length=20, blank=True, default='')
    osc = models.CharField(max_length=100, blank=True, default='')
    religion = models.CharField(max_length=100, blank=True, default='')
    select_family = models.CharField(max_length=100, blank=True, default='')
    family_type = models.CharField(max_length=100, blank=True, default='')
    total_siblings = models.IntegerField(null=True, blank=True)
    father_national_id = models.CharField(max_length=100, blank=True, default='')
    father_occupation = models.CharField(max_length=100, blank=True, default='')
    father_education = models.CharField(max_length=100, blank=True, default='')
    father_mobile = models.CharField(max_length=20, blank=True, default='')
    father_profession = models.CharField(max_length=100, blank=True, default='')
    father_income = models.CharField(max_length=20, blank=True, default='')
    mother_national_id = models.CharField(max_length=100, blank=True, default='')
    mother_occupation = models.CharField(max_length=100, blank=True, default='')
    mother_education = models.CharField(max_length=100, blank=True, default='')
    mother_mobile = models.CharField(max_length=20, blank=True, default='')
    mother_profession = models.CharField(max_length=100, blank=True, default='')
    mother_income = models.CharField(max_length=20, blank=True, default='')
    current_class = models.ForeignKey(
        'education_academics.SchoolClass',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        db_index=True,
    )
    current_section = models.ForeignKey(
        'education_academics.Section',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
    )
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    profile_picture = models.ImageField(
        upload_to=student_profile_upload_to,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['student_id']),
            models.Index(fields=['current_class', 'is_active']),
            models.Index(fields=['created_at']),
        ]

    @property
    def class_obj(self):
        return self.current_class

    @class_obj.setter
    def class_obj(self, value):
        self.current_class = value

    @property
    def section(self):
        return self.current_section

    @section.setter
    def section(self, value):
        self.current_section = value

    def __str__(self):
        return self.display_label

    @cached_property
    def display_label(self) -> str:
        """Cached per-instance label for serializers and admin (avoids repeated string formatting)."""
        class_name = self.current_class.name if self.current_class_id else ''
        section_name = self.current_section.name if self.current_section_id else ''
        if class_name and section_name:
            return f'{self.full_name} ({self.student_id}) — {class_name}-{section_name}'
        return f'{self.full_name} ({self.student_id})'


class Certificate(models.Model):
    """Generated certificates for students and employees"""
    RECIPIENT_CHOICES = [
        ('student', 'Student'),
        ('employee', 'Employee'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.CharField(max_length=100)
    recipient_type = models.CharField(max_length=20, choices=RECIPIENT_CHOICES)
    recipient_name = models.CharField(max_length=255)
    recipient_id = models.CharField(max_length=100, blank=True, default='')
    recipient_details = models.JSONField(default=dict, blank=True)
    custom_text = models.TextField(blank=True, default='')
    issue_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.template} - {self.recipient_name}"
    
    class Meta:
        ordering = ['-issue_date', '-created_at']