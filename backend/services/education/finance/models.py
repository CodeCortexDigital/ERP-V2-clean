from django.db import models
import uuid

class FeeStructure(models.Model):
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency = models.CharField(max_length=20, choices=[
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('semester', 'Semester'),
        ('annual', 'Annual')
    ], default='semester')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - ${self.amount}"

class Invoice(models.Model):
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    student = models.ForeignKey('education_students.Student', on_delete=models.CASCADE, related_name='invoices')
    # DEPRECATED: student_name = models.CharField(max_length=255)  # Use student.full_name instead
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def balance(self):
        return self.amount - self.paid_amount

    def __str__(self):
        return f"{self.invoice_number} - {self.student_name} - ${self.amount}"

class Payment(models.Model):
    tenant_id = models.CharField(max_length=100, blank=True, db_index=True)
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment_id = models.CharField(max_length=50, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('online', 'Online')
    ])
    transaction_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, default='completed')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment_id} - ${self.amount}"

    def send_reminder(self):
        """Send fee reminder via communication module"""
        from services.education.communication.models import Message, MessageTemplate
        
        template = MessageTemplate.objects.filter(template_type='fee_reminder', is_active=True).first()
        if template:
            context = {
                'student_name': self.student_name,
                'amount': self.balance,
                'due_date': self.due_date,
                'invoice_number': self.invoice_number
            }
            message = template.render(context)
            
            Message.objects.create(
                sender='ERP System',
                recipient=self.student_name,
                recipient_phone='',  # Would need phone number from student
                subject='Fee Reminder',
                message=message,
                channel='whatsapp'
            )




