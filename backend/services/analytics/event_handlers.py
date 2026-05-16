import logging
from django.apps import apps
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# Avoid circular imports - use apps.get_model inside receivers

@receiver(post_save, sender='education_attendance.AttendanceRecord')
def attendance_automation(sender, instance, created, **kwargs):
    """Trigger automation when attendance is marked"""
    if created:
        try:
            AutoTrigger = apps.get_model('education_communication', 'AutoTrigger')
            Message = apps.get_model('education_communication', 'Message')
            Student = apps.get_model('education_students', 'Student')
            Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
            
            student = instance.student
            
            # Calculate attendance rate
            attendance_records = Attendance.objects.filter(student=student)
            total = attendance_records.count()
            present = attendance_records.filter(status='present').count()
            rate = (present / total * 100) if total > 0 else 100
            
            triggers = AutoTrigger.objects.filter(trigger_event='attendance_low', is_active=True)
            
            if rate < 75 and triggers.exists():
                from services.communication.whatsapp.tasks import send_whatsapp_message

                for trigger in triggers:
                    if trigger.template:
                        message = trigger.template.render({
                            'student_name': student.full_name,
                            'attendance_rate': round(rate, 1),
                            'class_name': student.current_class.name if student.current_class else 'N/A'
                        })
                        
                        msg = Message.objects.create(
                            sender='ERP System',
                            recipient=student.full_name,
                            recipient_phone=getattr(student, 'guardian_phone', student.phone),
                            subject='Low Attendance Alert',
                            message=message,
                            template_name='attendance_absent',
                            channel=trigger.channel
                        )
                        if trigger.channel == 'whatsapp':
                            send_whatsapp_message.delay(str(msg.id))
                        logger.info(f"Attendance alert sent for {student.full_name}")
                        
        except Exception as e:
            logger.error(f"Attendance automation error: {e}")


@receiver(post_save, sender='education_finance.Invoice')
def invoice_automation(sender, instance, created, **kwargs):
    """Trigger automation when invoice is created/updated"""
    if created or instance.status == 'overdue':
        try:
            AutoTrigger = apps.get_model('education_communication', 'AutoTrigger')
            Message = apps.get_model('education_communication', 'Message')
            
            triggers = AutoTrigger.objects.filter(
                trigger_event__in=['fee_due_soon', 'fee_overdue'],
                is_active=True
            )
            
            event_type = 'fee_overdue' if instance.status == 'overdue' else 'fee_due_soon'
            
            from services.communication.whatsapp.tasks import send_whatsapp_message

            for trigger in triggers.filter(trigger_event=event_type):
                if trigger.template:
                    message = trigger.template.render({
                        'student_name': instance.student_name,
                        'amount': float(instance.amount),
                        'due_date': instance.due_date,
                        'balance': float(instance.amount) - float(instance.paid_amount),
                        'invoice_number': instance.invoice_number
                    })
                    
                    msg = Message.objects.create(
                        sender='ERP System',
                        recipient=instance.student_name,
                        recipient_phone=getattr(instance.student, 'phone', ''),
                        subject='Fee Reminder',
                        message=message,
                        template_name='fee_reminder',
                        channel=trigger.channel
                    )
                    if trigger.channel == 'whatsapp':
                        send_whatsapp_message.delay(str(msg.id))
                    logger.info(f"Fee reminder sent for {instance.invoice_number}")
                    
        except Exception as e:
            logger.error(f"Invoice automation error: {e}")


@receiver(post_save, sender='education_exams.ExamResult')
def exam_result_automation(sender, instance, created, **kwargs):
    """Trigger automation when exam result is published"""
    if created:
        try:
            AutoTrigger = apps.get_model('education_communication', 'AutoTrigger')
            Message = apps.get_model('education_communication', 'Message')
            
            triggers = AutoTrigger.objects.filter(trigger_event='exam_result_published', is_active=True)
            
            from services.communication.whatsapp.tasks import send_whatsapp_message

            for trigger in triggers:
                if trigger.template:
                    message = trigger.template.render({
                        'student_name': instance.student_name,
                        'exam_name': instance.exam.title,
                        'marks': float(instance.obtained_marks),
                        'total_marks': float(instance.total_marks),
                        'percentage': instance.percentage,
                        'grade': instance.grade,
                        'status': 'PASSED' if instance.is_pass else 'FAILED'
                    })
                    
                    msg = Message.objects.create(
                        sender='ERP System',
                        recipient=instance.student_name,
                        recipient_phone=getattr(instance.student, 'phone', ''),
                        subject=f'Exam Result: {instance.exam.title}',
                        message=message,
                        template_name='result_published',
                        channel=trigger.channel
                    )
                    if trigger.channel == 'whatsapp':
                        send_whatsapp_message.delay(str(msg.id))
                    logger.info(f"Result notification sent for {instance.student_name}")
                    
        except Exception as e:
            logger.error(f"Exam result automation error: {e}")
