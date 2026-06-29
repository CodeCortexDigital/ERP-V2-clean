import os
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from django.apps import apps
from services.education.finance.models import FeeStructure, Invoice, Payment
from django.db import transaction

SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Student = apps.get_model('education_students', 'Student')

print("=" * 60)
print("[START] GENERATING COMPLETE FINANCE DATA (FEE STRUCTURES, INVOICES, PAYMENTS)")
print("=" * 60)

classes = list(SchoolClass.objects.all())
students = list(Student.objects.filter(is_active=True))

if not classes or not students:
    print("[ERROR] Missing classes or students in DB!")
    exit()

# 1. Create or get FeeStructures for all classes
fee_structures = {}
for sc in classes:
    fs, _ = FeeStructure.objects.get_or_create(
        class_ref=sc,
        fee_name="Monthly Tuition Fee",
        defaults={
            'amount': random.choice([8000, 9500, 11000, 12500, 14000]),
            'due_date': date(2026, 6, 10),
            'academic_year': '2025-2026',
            'is_recurring': True,
            'frequency': 'monthly'
        }
    )
    fee_structures[sc.id] = fs

print(f"[OK] Fee structures assigned for {len(classes)} classes.")

# Clear existing payments and invoices to rebuild clean, consistent system data
Payment.objects.all().delete()
Invoice.objects.all().delete()

# Generate monthly dates for last 12 months (2025-07 to 2026-06)
months = []
for i in range(11, -1, -1):
    # approximate month calculation
    m_date = date.today().replace(day=1) - timedelta(days=i*30)
    m_date = m_date.replace(day=1)
    months.append(m_date)

print(f"[INFO] Generating invoices for 12 months across {len(students)} students...")

created_invoices = 0
created_payments = 0

with transaction.atomic():
    for m_idx, month_start in enumerate(months):
        due_dt = month_start.replace(day=10)
        is_current_month = (m_idx == len(months) - 1)
        
        # For performance, generate current month for ALL students, and historical for a representative subset
        target_students = students if is_current_month else students[:60]
        
        for student in target_students:
            sc = student.current_class or classes[0]
            fs = fee_structures.get(sc.id) or list(fee_structures.values())[0]
            fee_amt = float(fs.amount)
            
            # Determine status
            if is_current_month:
                rand_val = random.random()
                if rand_val < 0.45:
                    status = 'paid'
                elif rand_val < 0.70:
                    status = 'partial'
                elif rand_val < 0.88:
                    status = 'issued'
                else:
                    status = 'overdue'
            else:
                # Historical months mostly paid
                status = 'paid' if random.random() < 0.90 else 'partial'

            opening_bal = 0
            late_fee = 0
            discount = 0
            paid_amt = 0

            if status == 'paid':
                paid_amt = fee_amt
            elif status == 'partial':
                paid_amt = round(fee_amt * random.choice([0.3, 0.4, 0.5, 0.6]), 2)
            elif status == 'overdue':
                late_fee = 500

            inv = Invoice(
                student=student,
                fee_structure=fs,
                amount=fee_amt,
                opening_balance=opening_bal,
                discount_amount=discount,
                late_fee_amount=late_fee,
                paid_amount=0, # Will be updated via Payment save
                due_date=due_dt,
                issue_date=month_start,
                invoice_month=month_start,
                status='issued',
                description=f"Monthly Tuition Fee for {month_start.strftime('%B %Y')}"
            )
            inv.save()
            created_invoices += 1

            if paid_amt > 0:
                p_date = month_start.replace(day=random.randint(2, 9))
                p = Payment(
                    invoice=inv,
                    amount=paid_amt,
                    payment_date=p_date,
                    payment_method=random.choice(['cash', 'bank_transfer', 'online']),
                    notes=f"Payment for {inv.invoice_number}"
                )
                p.save()
                created_payments += 1

print(f"[OK] Created {created_invoices} invoices and {created_payments} payments.")

print("=" * 60)
print("[DONE] FINANCE DATA GENERATION COMPLETED SUCCESSFULLY!")
print("=" * 60)
