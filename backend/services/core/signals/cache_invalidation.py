"""
Cache invalidation signals — clear Redis keys when models change.
"""
import logging

from django.apps import apps
from django.db.models.signals import post_delete, post_save
from services.core.utils.cache import (
    invalidate_class_cache,
    invalidate_dashboard_cache,
    invalidate_dropdown_cache,
    invalidate_student_cache,
)

logger = logging.getLogger(__name__)


def _on_student_change(sender, instance, **kwargs):
    deleted = invalidate_student_cache()
    invalidate_dashboard_cache()
    logger.debug('Student cache invalidated (%s) for pk=%s', deleted, instance.pk)


def _on_class_related_change(sender, instance, **kwargs):
    deleted = invalidate_class_cache()
    invalidate_dropdown_cache('classes')
    invalidate_dropdown_cache('sections')
    logger.debug('Class-related cache invalidated (%s) for %s', deleted, sender.__name__)


def connect_cache_invalidation_signals():
    """Wire post_save/post_delete handlers (idempotent)."""
    Student = apps.get_model('education_students', 'Student')
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    Section = apps.get_model('education_academics', 'Section')
    Subject = apps.get_model('education_academics', 'Subject')

    for signal in (post_save, post_delete):
        signal.connect(_on_student_change, sender=Student, dispatch_uid='cache_student_invalidate')
        signal.connect(_on_class_related_change, sender=SchoolClass, dispatch_uid='cache_class_invalidate')
        signal.connect(_on_class_related_change, sender=Section, dispatch_uid='cache_section_invalidate')
        signal.connect(_on_class_related_change, sender=Subject, dispatch_uid='cache_subject_invalidate')
