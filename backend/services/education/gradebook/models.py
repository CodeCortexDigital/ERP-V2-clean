"""Gradebook: grading scales, weighted categories, assignments, scores, standards,
report-card comments and releases.

Grades are worked out from these rows (see ``calc.py``); nothing is stored twice.
Exams from the exams module can be linked to an assignment so marks entered
there flow into the gradebook.
"""
import uuid

from django.conf import settings
from django.db import models

from services.core.tenants.mixins import TenantScopedModel


class GradingScale(TenantScopedModel):
    KINDS = [('letter', 'Letter grades'), ('percentage', 'Percentages only'), ('standards', 'Standards levels (4–1)')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80)
    kind = models.CharField(max_length=12, choices=KINDS, default='letter')
    passing_percent = models.DecimalField(max_digits=5, decimal_places=2, default=60)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', 'name']

    def __str__(self):
        return self.name


class GradeBand(models.Model):
    """One step of a scale: 'A' from 93%, worth 4.0 grade points."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    scale = models.ForeignKey(GradingScale, on_delete=models.CASCADE, related_name='bands')
    label = models.CharField(max_length=20)
    min_percent = models.DecimalField(max_digits=5, decimal_places=2)
    gpa_points = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    description = models.CharField(max_length=120, blank=True, default='')

    class Meta:
        ordering = ['-min_percent']


class Category(TenantScopedModel):
    """A weighted group of work for one class-subject, e.g. Homework 20%, Tests 50%."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_subject = models.ForeignKey('education_academics.ClassSubject', on_delete=models.CASCADE,
                                      related_name='gradebook_categories')
    name = models.CharField(max_length=60)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text='Percent of the term grade')
    drop_lowest = models.PositiveSmallIntegerField(default=0, help_text='Ignore this many lowest scores')
    order = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        constraints = [models.UniqueConstraint(fields=['class_subject', 'name'], name='uniq_gradebook_category')]


class Standard(TenantScopedModel):
    """A learning standard or skill, e.g. 'MATH.5.NF.1: Add fractions with unlike denominators'."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey('education_academics.Subject', on_delete=models.CASCADE, null=True, blank=True,
                                related_name='standards')
    grade_level = models.SmallIntegerField(null=True, blank=True)
    code = models.CharField(max_length=40, blank=True, default='')
    description = models.CharField(max_length=300)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code', 'description']


class Assignment(TenantScopedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_subject = models.ForeignKey('education_academics.ClassSubject', on_delete=models.CASCADE,
                                      related_name='gradebook_assignments')
    section = models.ForeignKey('education_academics.Section', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='+', help_text='Leave empty for every section')
    term = models.ForeignKey('education_academics.Term', on_delete=models.SET_NULL, null=True, blank=True,
                             related_name='assignments')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    due_date = models.DateField(null=True, blank=True)
    points_possible = models.DecimalField(max_digits=7, decimal_places=2, default=100)
    counts_toward_grade = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True, help_text='Students and parents can see it and its scores')
    standards = models.ManyToManyField(Standard, blank=True, related_name='assignments')
    exam = models.OneToOneField('education_exams.Exam', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='gradebook_assignment')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date', 'created_at']


class Score(models.Model):
    STATUSES = [('graded', 'Graded'), ('missing', 'Missing'), ('excused', 'Excused'), ('late', 'Late'),
                ('incomplete', 'Incomplete')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='scores')
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='gradebook_scores')
    points = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=12, choices=STATUSES, default='graded')
    comment = models.CharField(max_length=255, blank=True, default='')
    graded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['assignment', 'student'], name='uniq_score')]


class StandardRating(TenantScopedModel):
    """Standards-based grade for one student, standard and term (4 Exceeds … 1 Beginning)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='standard_ratings')
    standard = models.ForeignKey(Standard, on_delete=models.CASCADE, related_name='ratings')
    term = models.ForeignKey('education_academics.Term', on_delete=models.CASCADE, related_name='standard_ratings')
    level = models.PositiveSmallIntegerField()
    comment = models.CharField(max_length=255, blank=True, default='')
    rated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'standard', 'term'], name='uniq_standard_rating')]


class ReportComment(TenantScopedModel):
    """The teacher's report-card comment for one student, subject and term (subject empty = homeroom)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='report_comments')
    class_subject = models.ForeignKey('education_academics.ClassSubject', on_delete=models.CASCADE, null=True,
                                      blank=True, related_name='+')
    term = models.ForeignKey('education_academics.Term', on_delete=models.CASCADE, related_name='+')
    comment = models.TextField()
    written_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'class_subject', 'term'], name='uniq_report_comment')]


class ReportCardRelease(TenantScopedModel):
    """Report cards for a term (optionally one class) are visible to families once released."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    term = models.ForeignKey('education_academics.Term', on_delete=models.CASCADE, related_name='releases')
    school_class = models.ForeignKey('education_academics.SchoolClass', on_delete=models.CASCADE, null=True,
                                     blank=True, related_name='+')
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='+')
    released_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['term', 'school_class'], name='uniq_report_release')]
