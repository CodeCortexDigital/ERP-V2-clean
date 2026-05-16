from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AttendanceRecord
from services.core.events.dispatcher import dispatch_event

@receiver(post_save, sender=AttendanceRecord)
def attendance_automation(sender, instance, created, **kwargs):
    """Trigger automation when attendance is marked"""
    if not created:
        return

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
