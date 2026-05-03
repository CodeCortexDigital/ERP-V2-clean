from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import AttendanceRecord

@receiver(post_save, sender=AttendanceRecord)
def attendance_automation(sender, instance, created, **kwargs):
    """Trigger automation when attendance is marked"""
    if created:
        # Calculate attendance rate for student
        from services.education.students.models import Student
        from services.education.communication.models import AutoTrigger, Message
        
        try:
            student = Student.objects.get(id=instance.student_id)
            
            # Check if attendance is low (below 75%)
            attendance_records = AttendanceRecord.objects.filter(student=student)
            total = attendance_records.count()
            present = attendance_records.filter(status='present').count()
            
            if total > 0:
                rate = (present / total) * 100
                if rate < 75:
                    # Trigger low attendance alert
                    triggers = AutoTrigger.objects.filter(trigger_event='attendance_low', is_active=True)
                    for trigger in triggers:
                        # Create notification
                        message = trigger.template.render({
                            'student_name': student.full_name,
                            'attendance_rate': rate
                        })
                        Message.objects.create(
                            sender='ERP System',
                            recipient=student.full_name,
                            recipient_phone=student.phone,
                            subject='Low Attendance Alert',
                            message=message,
                            channel=trigger.channel
                        )
        except Exception as e:
            print(f"Attendance automation error: {e}")
