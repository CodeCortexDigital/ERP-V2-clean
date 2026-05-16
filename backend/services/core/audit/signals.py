from django.db.models.signals import pre_save, post_save, pre_delete
from django.dispatch import receiver
from django.apps import apps
from django.forms.models import model_to_dict
from .models import AuditLog


def serialize_instance(instance):
    try:
        return model_to_dict(instance)
    except Exception:
        # Fallback: basic field reading
        data = {}
        for f in instance._meta.fields:
            try:
                data[f.name] = getattr(instance, f.name)
            except Exception:
                data[f.name] = None
        return data


MONITORED = [
    ('education_students', 'Student'),
    ('education_attendance', 'AttendanceRecord'),
    ('education_finance', 'Invoice'),
]


@receiver(pre_save)
def cache_old_instance(sender, instance, **kwargs):
    for app_label, model_name in MONITORED:
        if sender._meta.app_label == app_label and sender.__name__ == model_name:
            if instance.pk:
                try:
                    old = sender.objects.get(pk=instance.pk)
                    instance._audit_old = serialize_instance(old)
                except sender.DoesNotExist:
                    instance._audit_old = None


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    for app_label, model_name in MONITORED:
        if sender._meta.app_label == app_label and sender.__name__ == model_name:
            try:
                old = getattr(instance, '_audit_old', None)
                new = serialize_instance(instance)
                action = 'CREATE' if created else 'UPDATE'
                AuditLog.objects.create(
                    user=getattr(instance, '_last_modified_by', None),
                    action=action,
                    resource_type=f"{sender._meta.app_label}.{sender.__name__}",
                    resource_id=getattr(instance, 'id', None),
                    old_data=old,
                    new_data=new,
                )
            except Exception:
                pass


@receiver(pre_delete)
def log_model_delete(sender, instance, **kwargs):
    for app_label, model_name in MONITORED:
        if sender._meta.app_label == app_label and sender.__name__ == model_name:
            try:
                old = serialize_instance(instance)
                AuditLog.objects.create(
                    user=getattr(instance, '_last_modified_by', None),
                    action='DELETE',
                    resource_type=f"{sender._meta.app_label}.{sender.__name__}",
                    resource_id=getattr(instance, 'id', None),
                    old_data=old,
                    new_data=None,
                )
            except Exception:
                pass
