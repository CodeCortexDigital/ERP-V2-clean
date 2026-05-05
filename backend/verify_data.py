import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps
from django.db.models import Count

Student = apps.get_model('education_students', 'Student')
Attendance = apps.get_model('education_attendance', 'AttendanceRecord')
ExamResult = apps.get_model('education_exams', 'ExamResult')
Invoice = apps.get_model('education_finance', 'Invoice')
Payment = apps.get_model('education_finance', 'Payment')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')

print("=" * 60)
print("📊 BACKEND DATA VERIFICATION")
print("=" * 60)

# 1. Core counts
print("\n1️⃣ DATABASE COUNTS:")
print(f"   Students: {Student.objects.count()}")
print(f"   Classes: {SchoolClass.objects.count()}")
print(f"   Sections: {Section.objects.count()}")
print(f"   Attendance: {Attendance.objects.count()}")
print(f"   Exam Results: {ExamResult.objects.count()}")
print(f"   Invoices: {Invoice.objects.count()}")
print(f"   Payments: {Payment.objects.count()}")

# 2. Sample students
print("\n2️⃣ SAMPLE STUDENTS (First 5):")
for i, s in enumerate(Student.objects.all()[:5]):
    print(f"   {i+1}. {s.full_name} - Class: {s.current_class.name if s.current_class else 'None'} - Active: {s.is_active}")

# 3. Students by class
print("\n3️⃣ STUDENTS BY CLASS:")
class_counts = Student.objects.values('current_class__name').annotate(count=Count('id'))
for cc in class_counts[:10]:
    print(f"   {cc['current_class__name'] or 'No Class'}: {cc['count']} students")

# 4. Attendance summary
total_att = Attendance.objects.count()
if total_att > 0:
    present = Attendance.objects.filter(status='present').count()
    absent = Attendance.objects.filter(status='absent').count()
    print(f"\n4️⃣ ATTENDANCE SUMMARY:")
    print(f"   Present: {present} ({present*100//total_att}%)")
    print(f"   Absent: {absent} ({absent*100//total_att}%)")

# 5. Finance summary
total_inv = Invoice.objects.count()
if total_inv > 0:
    total_amt = sum(float(i.amount) for i in Invoice.objects.all())
    total_paid = sum(float(i.paid_amount) for i in Invoice.objects.all())
    print(f"\n5️⃣ FINANCE SUMMARY:")
    print(f"   Total Invoices: {total_inv}")
    print(f"   Total Amount: Rs {total_amt:,.0f}")
    print(f"   Total Paid: Rs {total_paid:,.0f}")
    print(f"   Outstanding: Rs {(total_amt - total_paid):,.0f}")

print("\n" + "=" * 60)
print("✅ VERIFICATION COMPLETE")
print("=" * 60)
