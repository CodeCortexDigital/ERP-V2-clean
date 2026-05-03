from celery import shared_task
from django.apps import apps
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_notification_async(notification_id):
    """Send notification asynchronously"""
    try:
        Notification = apps.get_model('education_communication', 'Notification')
        Message = apps.get_model('education_communication', 'Message')
        
        notification = Notification.objects.get(id=notification_id)
        
        # Create message record
        Message.objects.create(
            sender='ERP System',
            recipient=notification.recipient_id or 'All Users',
            subject=notification.title,
            message=notification.message,
            channel=notification.channel,
            is_delivered=True
        )
        
        notification.is_sent = True
        notification.save()
        
        logger.info(f"Notification {notification_id} sent successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to send notification {notification_id}: {e}")
        return False

@shared_task
def process_auto_trigger(event_type, data):
    """Process auto triggers asynchronously"""
    try:
        AutoTrigger = apps.get_model('education_communication', 'AutoTrigger')
        Message = apps.get_model('education_communication', 'Message')
        
        triggers = AutoTrigger.objects.filter(trigger_event=event_type, is_active=True)
        
        for trigger in triggers:
            message = trigger.template.render(data)
            Message.objects.create(
                sender='ERP System',
                recipient=data.get('student_name', 'Student'),
                subject=trigger.name,
                message=message,
                channel=trigger.channel
            )
        
        logger.info(f"Processed {triggers.count()} triggers for event {event_type}")
        return True
    except Exception as e:
        logger.error(f"Failed to process triggers for {event_type}: {e}")
        return False

@shared_task
def send_bulk_notifications(notification_ids):
    """Send multiple notifications in batch"""
    results = []
    for nid in notification_ids:
        result = send_notification_async.delay(nid)
        results.append(result.id)
    return results
