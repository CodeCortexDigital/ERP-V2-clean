import os
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from django.apps import apps
from services.education.attendance.models import AttendanceRecord
from services.education.exams.models import Exam, ExamResult
from django.db import transaction

Student = apps.get_model('education_students', 'Student')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Subject = apps.get_model('education_academics', 'Subject')

print("=" * 60)
print("[START] GENERATING STUDENT ATTENDANCE & EXAM RESULTS RECORDS")
print("=" * 60)

students = list(Student.objects.filter(is_active=True))
classes = list(SchoolClass.objects.all())
subjects = list(Subject.objects.all())

if not students or not classes or not subjects:
    print("[ERROR] Missing core database dependencies!")
    exit()

# 1. Ensure Exams exist for classes
created_exams = []
for sc in classes:
    sub_for_class = subjects[:3]
    for sub in sub_for_class:
        e, _ = Exam.objects.get_or_create(
            class_ref=sc,
            subject=sub,
            exam_type='midterm',
            title=f"Mid-Term Exam 2026 - {sub.name}",
            defaults={
                'total_marks': 100,
                'passing_marks': 40,
                'exam_date': date(2026, 5, 15),
                'is_published': True,
                'is_active': True
            }
        )
        created_exams.append(e)

print(f"[OK] {len(created_exams)} exams created/verified across classes.")

# 2. Generate Attendance Records for last 30 days
start_dt = date(2026, 5, 20)
end_dt = date(2026, 6, 27)
curr_dt = start_dt

att_count = 0
res_count = 0

with transaction.atomic():
    while curr_dt <= end_dt:
        if curr_dt.weekday() < 5: # Monday-Friday
            for student in students:
                # Determine status
                rand = random.random()
                if rand < 0.88:
                    st = 'present'
                elif rand < 0.95:
                    st = 'late'
                else:
                    st = 'absent'

                AttendanceRecord.objects.get_or_create(
                    student=student,
                    date=curr_dt,
                    defaults={'status': st}
                )
                att_count += 1
        curr_dt += timedelta(days=1)

    # 3. Generate Exam Results for students
    for student in students:
        sc = student.current_class or classes[0]
        matching_exams = [ex for ex in created_exams if ex.class_ref_id == sc.id]
        if not matching_exams:
            matching_exams = created_exams[:3]

        for ex in matching_exams:
            obtained = random.choice([78, 82, 85, 89, 92, 95, 88, 90])
            ExamResult.objects.get_or_create(
                exam=ex,
                student=student,
                defaults={
                    'obtained_marks': obtained,
                    'remarks': 'Excellent academic performance'
                }
            )
            res_count += 1

print(f"[OK] Generated {att_count} attendance records and {res_count} exam results.")

print("=" * 60)
print("[DONE] ATTENDANCE & RESULTS DATA GENERATION COMPLETED SUCCESSFULLY!")
print("=" * 60)
