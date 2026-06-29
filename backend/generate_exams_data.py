import os
import random
from datetime import date, timedelta, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from django.apps import apps
from services.education.exams.models import Exam, ExamResult, ExamSchedule, ExamRegistration

SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Subject = apps.get_model('education_academics', 'Subject')
Student = apps.get_model('education_students', 'Student')

print("=" * 60)
print("[START] GENERATING RICH EXAM DATA (EXAMS, RESULTS, SCHEDULES, REGISTRATIONS)")
print("=" * 60)

classes = list(SchoolClass.objects.all())
subjects = list(Subject.objects.all())
students = list(Student.objects.filter(is_active=True))

if not classes or not subjects or not students:
    print("[ERROR] Missing classes, subjects, or students in DB!")
    exit()

# Clear existing exam data to avoid conflicts
ExamRegistration.objects.all().delete()
ExamSchedule.objects.all().delete()
ExamResult.objects.all().delete()
Exam.objects.all().delete()

exams_list = [
    ("Mid Term Examination", "midterm", 100, 40, date.today() - timedelta(days=10), "completed"),
    ("Final Term Examination", "final", 100, 40, date.today() + timedelta(days=15), "upcoming"),
    ("Unit Quiz 1", "quiz", 20, 10, date.today(), "ongoing"),
    ("Mathematics Assessment", "test", 50, 20, date.today() - timedelta(days=5), "completed"),
    ("Computer Science Practical", "midterm", 100, 40, date.today() + timedelta(days=7), "upcoming"),
    ("Physics Lab Assessment", "test", 50, 20, date.today(), "ongoing"),
]

created_exams = []
for idx, (title, etype, total, passing, edate, status_str) in enumerate(exams_list, start=1):
    sc = classes[(idx - 1) % len(classes)]
    subj = subjects[(idx - 1) % len(subjects)]

    exam = Exam.objects.create(
        title=f"{sc.name} {title}",
        exam_type=etype,
        class_ref=sc,
        subject=subj,
        total_marks=total,
        passing_marks=passing,
        exam_date=edate,
        start_time=time(9, 0),
        end_time=time(12, 0),
        duration_minutes=180 if total >= 100 else 60,
        academic_year="2025-2026",
        term="first",
        description=f"Standard examination for {sc.name} {subj.name}",
        is_published=True,
        is_active=True
    )
    created_exams.append((exam, status_str))

print(f"[OK] Created {len(created_exams)} examinations across different statuses.")

# 2. Exam Schedules
venues = ["Main Auditorium", "Science Hall A", "Block B Hall", "Computer Lab 1", "Library Hall"]
rooms = ["Room 101", "Room 102", "Hall 1", "Lab 2", "Room 205"]

for exam, status_str in created_exams:
    ExamSchedule.objects.create(
        exam=exam,
        date=exam.exam_date,
        start_time=exam.start_time,
        end_time=exam.end_time,
        venue=random.choice(venues),
        room=random.choice(rooms),
        status=status_str if status_str in ['scheduled', 'ongoing', 'completed'] else 'scheduled'
    )

print("[OK] Created Exam Schedules.")

# 3. Exam Registrations & Results
sample_students = students[:30] if len(students) >= 30 else students

for exam, status_str in created_exams:
    for student in sample_students:
        # Registration
        ExamRegistration.objects.get_or_create(
            exam=exam,
            student=student,
            defaults={'fee_status': random.choice(['paid', 'paid', 'pending'])}
        )

        # Result (for completed and ongoing exams)
        if status_str in ['completed', 'ongoing']:
            if exam.total_marks == 100:
                obt = random.choice([88, 92, 76, 82, 64, 95, 54, 42, 38, 85, 91])
            else:
                obt = random.choice([18, 19, 15, 12, 8, 14, 16])

            ExamResult.objects.get_or_create(
                exam=exam,
                student=student,
                defaults={'obtained_marks': obt}
            )

print("[OK] Created Exam Registrations and Exam Results for Analytics.")

print("=" * 60)
print("[DONE] EXAM DATA GENERATION COMPLETED SUCCESSFULLY!")
print("=" * 60)
