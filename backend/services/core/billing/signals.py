"""Plan limits on new students and staff (P11). Raised as a 402 by the API; imports report the row."""
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .service import check_limit


def _school(instance):
    return getattr(instance, 'tenant', None) if getattr(instance, 'tenant_id', None) else None


@receiver(pre_save, sender='education_students.Student')
def student_limit(sender, instance, raw=False, **kwargs):
    if raw or not instance._state.adding or not instance.is_active:
        return
    school = _school(instance)
    if school is not None:
        check_limit(school, 'students')


@receiver(pre_save, sender='education_academics.Teacher')
def staff_limit(sender, instance, raw=False, **kwargs):
    if raw or not instance._state.adding or not getattr(instance, 'is_active', True):
        return
    school = _school(instance)
    if school is not None:
        check_limit(school, 'staff')
