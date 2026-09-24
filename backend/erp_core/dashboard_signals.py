"""
Dashboard real-time broadcast signals.

Whenever a Student, Teacher, or SchoolClass is created/updated/deleted,
we push fresh KPI counts to every connected DashboardConsumer via the
channel layer (ws/dashboard/).

This file is imported in erp_core/apps.py → ready() so the receivers
are always registered.
"""

import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Helper: fire-and-forget broadcast
# -------------------------------------------------------------------

def _push_kpi(instance=None):
    """Push updated KPI to the dashboards of the record's school (non-blocking)."""
    try:
        from erp_core.consumers import broadcast_dashboard_kpi
        broadcast_dashboard_kpi(getattr(instance, 'tenant_id', None))
    except Exception as exc:
        logger.debug("Dashboard KPI broadcast skipped: %s", exc)


# -------------------------------------------------------------------
# Signal receivers
# -------------------------------------------------------------------

@receiver(post_save, sender='education_students.Student')
@receiver(post_delete, sender='education_students.Student')
def student_changed(sender, instance, **kwargs):
    """Push updated student count when any student is added/removed."""
    _push_kpi(instance)


@receiver(post_save, sender='education_academics.Teacher')
@receiver(post_delete, sender='education_academics.Teacher')
def teacher_changed(sender, instance, **kwargs):
    """Push updated teacher count when a teacher record changes."""
    _push_kpi(instance)


@receiver(post_save, sender='education_academics.SchoolClass')
@receiver(post_delete, sender='education_academics.SchoolClass')
def class_changed(sender, instance, **kwargs):
    """Push updated class count when a class is added/removed."""
    _push_kpi(instance)
