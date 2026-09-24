from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AttendanceRecord
from services.core.events.dispatcher import dispatch_event


def _run_attendance_automation(instance: AttendanceRecord):
    try:
        dispatch_event('attendance_marked', {
            'attendance_id': str(instance.id),
            'student_id': str(instance.student_id),
            'status': instance.status,
            'date': str(instance.date),
        })
    except Exception as exc:
        print(f"Attendance dispatch error: {exc}")

    try:
        from services.education.students.models import Student
        from services.education.communication.models import AutoTrigger, Message
        from services.core.user_notifications.utils import create_user_notification

        student = Student.objects.get(id=instance.student_id)

        # Notify parents when a student is absent
        if instance.status == 'absent':
            title = f"Attendance Alert: {student.full_name}"
            message = f"{student.full_name} was marked absent on {instance.date}. Please check the attendance record."
            for parent_profile in student.parents.all():
                parent_user = getattr(parent_profile, 'user', None)
                if parent_user:
                    create_user_notification(parent_user, title, message, 'attendance')

            # Auto WhatsApp message to the student's own number
            if student.phone:
                try:
                    from services.communication.whatsapp.tasks import send_whatsapp_message
                    absence_msg = Message.objects.create(
                        student=student,
                        sender='ERP System',
                        recipient=student.full_name,
                        recipient_phone=student.phone,
                        subject='Absence Notice',
                        message=f"{student.full_name}, you missed today's classes.",
                        template_name='attendance_absent',
                        channel='whatsapp',
                    )
                    send_whatsapp_message.delay(str(absence_msg.id))
                except Exception as exc:
                    print(f"WhatsApp student absence notify error: {exc}")

        # Calculate attendance rate for student
        attendance_records = AttendanceRecord.objects.filter(student=student)
        total = attendance_records.count()
        present = attendance_records.filter(status='present').count()

        if total > 0:
            rate = (present / total) * 100
            if rate < 75:
                # Trigger low attendance alert
                triggers = AutoTrigger.objects.filter(trigger_event='attendance_low', is_active=True)
                from services.communication.whatsapp.tasks import send_whatsapp_message

                for trigger in triggers:
                    notification_text = trigger.template.render({
                        'student_name': student.full_name,
                        'attendance_rate': rate
                    })
                    msg = Message.objects.create(
                        sender='ERP System',
                        recipient=student.full_name,
                        recipient_phone=student.phone,
                        subject='Low Attendance Alert',
                        message=notification_text,
                        template_name='attendance_absent',
                        channel=trigger.channel
                    )
                    if trigger.channel == 'whatsapp':
                        send_whatsapp_message.delay(str(msg.id))
    except Exception as e:
        print(f"Attendance automation error: {e}")


@receiver(post_save, sender=AttendanceRecord)
def attendance_automation(sender, instance, created, **kwargs):
    """Trigger automation when attendance is marked"""
    if not created:
        return

    transaction.on_commit(lambda: _run_attendance_automation(instance))


@receiver(post_save, sender=AttendanceRecord)
def attendance_dashboard_broadcast(sender, instance, **kwargs):
    """
    Push updated attendance stats to all connected dashboard WebSocket clients
    whenever ANY attendance record is saved (created or updated).
    Uses transaction.on_commit to ensure the DB is committed before we read counts.
    """
    def _broadcast():
        try:
            from django.utils import timezone
            from django.apps import apps
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            today = timezone.localtime().date()

            # Only broadcast for today's records
            if instance.date != today:
                return

            Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
            # This school's attendance only; sent to this school's dashboards.
            student_qs = (
                Attendance._base_manager
                .filter(date=today, tenant_id=instance.tenant_id)
                .exclude(status='holiday')
                .exclude(student__isnull=True)
            )

            total_s     = student_qs.count()
            present_s   = student_qs.filter(status='present').count()
            late_s      = student_qs.filter(status='late').count()
            absent_s    = student_qs.filter(status='absent').count()
            present_pct = round(((present_s + late_s) / total_s * 100)) if total_s > 0 else 0

            channel_layer = get_channel_layer()
            if not channel_layer:
                return

            from erp_core.consumers import dashboard_group

            async_to_sync(channel_layer.group_send)(
                dashboard_group(instance.tenant_id),
                {
                    'type': 'attendance_update',
                    'data': {
                        'date': str(today),
                        'students': {
                            'total':       total_s,
                            'present':     present_s,
                            'late':        late_s,
                            'absent':      absent_s,
                            'present_pct': present_pct,
                        },
                    },
                },
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).debug('Dashboard attendance broadcast failed: %s', exc)

    transaction.on_commit(_broadcast)
