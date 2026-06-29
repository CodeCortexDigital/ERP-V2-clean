import sys
import os
import django
from datetime import date, timedelta

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.students.models import Student
from services.education.academics.models import Teacher, TeacherAttendance
from services.education.attendance.models import AttendanceRecord

print("Starting Attendance Population from 1st April 2026 to 28th June 2026...")

start_date = date(2026, 4, 1)
end_date = date(2026, 6, 28)

students = list(Student.objects.filter(is_active=True))
teachers = list(Teacher.objects.filter(is_active=True))

print(f"Loaded {len(students)} active students and {len(teachers)} active teachers.")

current_date = start_date
working_days_count = 0
student_records_count = 0
teacher_records_count = 0

student_objs_to_create = []
teacher_objs_to_create = []

# Fetch existing dates to avoid duplication
existing_student_att = set(AttendanceRecord.objects.filter(date__gte=start_date, date__lte=end_date).values_list('student_id', 'date'))
existing_teacher_att = set(TeacherAttendance.objects.filter(date__gte=start_date, date__lte=end_date).values_list('teacher_id', 'date'))

while current_date <= end_date:
    # Skip weekends (Saturday=5, Sunday=6)
    if current_date.weekday() < 5:
        working_days_count += 1
        
        # Student Attendance
        for s in students:
            if (s.id, current_date) not in existing_student_att:
                student_objs_to_create.append(
                    AttendanceRecord(student=s, date=current_date, status='present')
                )
                student_records_count += 1

        # Teacher Attendance
        for t in teachers:
            if (t.id, current_date) not in existing_teacher_att:
                teacher_objs_to_create.append(
                    TeacherAttendance(teacher=t, date=current_date, status='present')
                )
                teacher_records_count += 1

    current_date += timedelta(days=1)

print(f"Identified {working_days_count} working days between April 1 and June 28.")

if student_objs_to_create:
    AttendanceRecord.objects.bulk_create(student_objs_to_create, batch_size=2000)
    print(f"Created {student_records_count} student attendance records!")
else:
    print("Student attendance records already populated!")

if teacher_objs_to_create:
    TeacherAttendance.objects.bulk_create(teacher_objs_to_create, batch_size=2000)
    print(f"Created {teacher_records_count} teacher attendance records!")
else:
    print("Teacher attendance records already populated!")

print(f"\nSUCCESS! Attendance marked Present for {len(students)} students and {len(teachers)} teachers from 1st April to 28th June 2026 across {working_days_count} working days!")
