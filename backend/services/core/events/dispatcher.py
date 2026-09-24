import importlib
import logging
from typing import Any, Dict

from celery import current_app, signature

logger = logging.getLogger(__name__)

EVENT_TASK_MAP = {
    'attendance_marked': 'services.core.tasks.notification_tasks.send_attendance_notification',
    'invoice_created': 'services.core.tasks.notification_tasks.generate_invoice_pdf',
    'result_published': 'services.core.tasks.notification_tasks.send_result_whatsapp',
    'student_enrolled': 'services.core.tasks.notification_tasks.send_welcome_email',
}


def dispatch_event(event_name: str, payload: Dict[str, Any], delay: int = 0):
    """Dispatch an event to the appropriate background task.

    - event_name: logical event key
    - payload: event payload (dict)
    - delay: seconds to delay execution
    """
    task_path = EVENT_TASK_MAP.get(event_name)
    if not task_path:
        raise ValueError(f'Unknown event: {event_name}')

    # Eager mode (no broker, e.g. local dev): send-by-name ignores
    # task_always_eager, so run the registered task in-process instead.
    if current_app.conf.task_always_eager:
        try:
            # Task modules here aren't named tasks.py, so autodiscovery misses them.
            importlib.import_module(task_path.rsplit('.', 1)[0])
        except ImportError:
            pass
        task = current_app.tasks.get(task_path)
        if task is None:
            logger.warning('Task %s is not registered; skipping event %s', task_path, event_name)
            return None
        try:
            return task.apply(args=[payload])
        except Exception:
            logger.exception('Eager task %s failed for event %s', task_path, event_name)
            return None

    # Use Celery signature to decouple direct imports
    sig = signature(task_path)
    if delay and isinstance(delay, int) and delay > 0:
        return sig.apply_async(args=[payload], countdown=delay)
    return sig.apply_async(args=[payload])


# Helper for downstream code; use import path to avoid circular dependencies
__all__ = ['dispatch_event']
