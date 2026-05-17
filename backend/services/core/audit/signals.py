from django.db.models.signals import pre_save, post_save, pre_delete
from django.dispatch import receiver
from django.apps import apps
from django.forms.models import model_to_dict
import uuid
import json
from decimal import Decimal
from datetime import date, datetime
from .models import AuditLog


def serialize_instance(instance):
    """Convert model instance to dict with JSON-safe values"""
    try:
        data = model_to_dict(instance)
        return make_json_safe(data)
    except Exception:
        # Fallback: basic field reading
        data = {}
        for f in instance._meta.fields:
            try:
                value = getattr(instance, f.name)
                data[f.name] = make_json_safe_value(value)
            except Exception:
                data[f.name] = None
        return data


def make_json_safe_value(value):
    """Convert a single value to JSON-serializable format"""
    if value is None:
        return None
    elif isinstance(value, uuid.UUID):
        return str(value)
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, (date, datetime)):
        return value.isoformat()
    elif isinstance(value, dict):
        return make_json_safe(value)
    elif isinstance(value, (list, tuple)):
        return [make_json_safe_value(item) for item in value]
    elif hasattr(value, '__dict__') and not isinstance(value, (str, int, float, bool)):
        # For other objects, try to convert to string
        try:
            return str(value)
        except Exception:
            return None
    else:
        return value


def make_json_safe(data):
    """Recursively convert data to JSON-serializable format"""
    if isinstance(data, dict):
        return {
            str(k): make_json_safe_value(v)
            for k, v in data.items()
        }
    elif isinstance(data, (list, tuple)):
        return [make_json_safe_value(item) for item in data]
    else:
        return make_json_safe_value(data)


MONITORED = [
    ('education', 'Student'),  # Fixed: was 'education_students'
    ('education', 'AttendanceRecord'),  # Fixed: was 'education_attendance'
    ('education', 'Invoice'),  # Fixed: was 'education_finance'
]


@receiver(pre_save)
def cache_old_instance(sender, instance, **kwargs):
    """Cache old instance state before save for comparison"""
    for app_label, model_name in MONITORED:
        if sender._meta.app_label == app_label and sender.__name__ == model_name:
            if instance.pk:
                try:
                    old = sender.objects.get(pk=instance.pk)
                    instance._audit_old = serialize_instance(old)
                except sender.DoesNotExist:
                    instance._audit_old = None
            break  # Found matching model, exit loop


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    """Log create/update operations to audit log"""
    for app_label, model_name in MONITORED:
        if sender._meta.app_label == app_label and sender.__name__ == model_name:
            try:
                # Get old state from cached attribute
                old = getattr(instance, '_audit_old', None)
                
                # Serialize new state with JSON-safe conversion
                new = serialize_instance(instance)
                
                # Determine action
                action = 'CREATE' if created else 'UPDATE'
                
                # Get user who made the change (if tracking)
                user = getattr(instance, '_last_modified_by', None)
                
                # For updates, calculate what actually changed
                changes = None
                if not created and old:
                    changes = {}
                    for key in new.keys():
                        if key in old and new[key] != old[key]:
                            changes[key] = {
                                'old': make_json_safe_value(old[key]),
                                'new': make_json_safe_value(new[key])
                            }
                
                # Create audit log entry with JSON-safe data
                audit_entry = AuditLog.objects.create(
                    user=user,
                    action=action,
                    resource_type=f"{sender._meta.app_label}.{sender.__name__}",
                    resource_id=str(getattr(instance, 'id', None)) if getattr(instance, 'id', None) else None,
                    old_data=make_json_safe(old) if old else None,
                    new_data=make_json_safe(new) if new else None,
                    changes=make_json_safe(changes) if changes else None,
                )
                
                # Optional: Log successful audit creation for debugging
                # print(f"Audit log created: {audit_entry.id} - {action} - {sender.__name__}")
                
            except Exception as e:
                # Log error but don't break the main operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create audit log for {sender.__name__}: {str(e)}")
                # Optionally print for debugging
                # print(f"Audit log error: {e}")
            break  # Found matching model, exit loop


@receiver(pre_delete)
def log_model_delete(sender, instance, **kwargs):
    """Log delete operations to audit log"""
    for app_label, model_name in MONITORED:
        if sender._meta.app_label == app_label and sender.__name__ == model_name:
            try:
                # Serialize the instance before deletion with JSON-safe conversion
                old = serialize_instance(instance)
                
                # Get user who made the change (if tracking)
                user = getattr(instance, '_last_modified_by', None)
                
                # Create audit log entry
                audit_entry = AuditLog.objects.create(
                    user=user,
                    action='DELETE',
                    resource_type=f"{sender._meta.app_label}.{sender.__name__}",
                    resource_id=str(getattr(instance, 'id', None)) if getattr(instance, 'id', None) else None,
                    old_data=make_json_safe(old) if old else None,
                    new_data=None,
                    changes=None,
                )
                
                # Optional: Log successful audit creation for debugging
                # print(f"Audit log created: {audit_entry.id} - DELETE - {sender.__name__}")
                
            except Exception as e:
                # Log error but don't break the main operation
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to create audit log for {sender.__name__} DELETE: {str(e)}")
                # Optionally print for debugging
                # print(f"Audit log error: {e}")
            break  # Found matching model, exit loop


# Optional: Context manager to set the current user for auditing
from contextlib import contextmanager

@contextmanager
def audit_with_user(user):
    """Context manager to set user for audit logging"""
    from threading import local
    _thread_local = local()
    
    # Store user in thread local
    old_user = getattr(_thread_local, 'current_user', None)
    _thread_local.current_user = user
    
    try:
        yield
    finally:
        # Restore old user
        if old_user is not None:
            _thread_local.current_user = old_user
        else:
            delattr(_thread_local, 'current_user')


def get_current_audit_user():
    """Get current user from thread local storage"""
    from threading import local
    _thread_local = local()
    return getattr(_thread_local, 'current_user', None)


# Optional: Middleware to automatically set user for audit logging
# Add this to your middleware if you want automatic user tracking
"""
class AuditUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        from threading import local
        _thread_local = local()
        
        # Store user in thread local if authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            _thread_local.current_user = request.user
        
        response = self.get_response(request)
        return response
"""