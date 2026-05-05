import django
import os
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from django.apps import apps
from django.utils import timezone

Student = apps.get_model('education_students', 'Student')
Attendance = apps.get_model('education_attendance', 'AttendanceRecord')

print('')
print('=' * 60)
print('ATTENDANCE DATA CREATION')
print('=' * 60)

# Get all active students
students = list(Student.objects.filter(is_active=True))
print(f'Found {len(students)} active students')

if not students:
    print('No students found!')
    exit()

# Delete existing attendance records
deleted_count = Attendance.objects.all().delete()[0]
print(f'Deleted {deleted_count} existing attendance records')

# Create attendance records for last 30 days
start_date = timezone.now().date() - timedelta(days=30)
total_records = 0
present_total = 0
absent_total = 0
late_total = 0

print('')
print('Creating attendance records...')

for student in students[:50]:
    present = 0
    absent = 0
    late = 0
    days_count = 0
    
    for day in range(30):
        date = start_date + timedelta(days=day)
        # Skip weekends
        if date.weekday() >= 5:
            continue
        
        days_count += 1
        # Weighted random: 70% present, 15% absent, 15% late
        r = random.random()
        if r < 0.7:
            status = 'present'
            present += 1
            present_total += 1
        elif r < 0.85:
            status = 'absent'
            absent += 1
            absent_total += 1
        else:
            status = 'late'
            late += 1
            late_total += 1
        
        Attendance.objects.create(
            student=student,
            date=date,
            status=status
        )
        total_records += 1
    
    rate = round((present / days_count * 100), 1) if days_count > 0 else 0
    if rate < 75:
        name_display = student.full_name[:20]
        print(f'  {name_display:20} - {rate}% (P:{present}, A:{absent}, L:{late})')

print('')
print('=' * 60)
print('SUMMARY')
print('=' * 60)
print(f'Total Students Processed: 50')
print(f'Total Attendance Records: {total_records}')
print(f'Present: {present_total}')
print(f'Absent: {absent_total}')
print(f'Late: {late_total}')

total_all = present_total + absent_total + late_total
if total_all > 0:
    overall_rate = round((present_total / total_all * 100), 1)
    print(f'Overall Attendance Rate: {overall_rate}%')

print('=' * 60)
print('✅ Attendance data creation complete!')
print('')
print('Refresh your frontend to see attendance percentages!')
