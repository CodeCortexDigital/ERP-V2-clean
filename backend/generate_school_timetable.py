import sys
import os
import django
from django.db import connection

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.academics.models import (
    SchoolClass, Section, Subject, Teacher, Period, ClassSubject, TimetableEntry, AcademicYear, Classroom
)

print("Starting Master School Timetable Generation...")

# 1. Setup Academic Year
academic_year, _ = AcademicYear.objects.get_or_create(
    name='2025-2026',
    defaults={'start_date': '2025-08-01', 'end_date': '2026-06-30', 'is_active': True}
)

# 2. Setup Daily Schedule Periods
periods_data = [
    (1, "Period 1", "08:00", "08:45", 45, False),
    (2, "Period 2", "08:45", "09:30", 45, False),
    (3, "Period 3", "09:30", "10:15", 45, False),
    (0, "Break", "10:15", "10:35", 20, True),
    (4, "Period 4", "10:35", "11:20", 45, False),
    (5, "Period 5", "11:20", "12:05", 45, False),
    (6, "Period 6", "12:05", "12:50", 45, False),
    (7, "Period 7", "12:50", "13:35", 45, False),
    (8, "Period 8", "13:35", "14:20", 45, False),
]

period_objects = {}
for p_num, p_name, s_time, e_time, dur, is_brk in periods_data:
    p_obj, _ = Period.objects.get_or_create(
        academic_year=academic_year,
        period_number=p_num,
        defaults={
            'name': p_name,
            'start_time': s_time,
            'end_time': e_time,
            'duration_minutes': dur,
            'is_break': is_brk,
            'is_active': True
        }
    )
    if not is_brk:
        period_objects[p_num] = p_obj

# 3. Setup Subjects by Grade Group
grade_1_5_subjects = ['English', 'Mathematics', 'Urdu', 'Computer', 'Islamic Studies', 'History', 'Games', 'Art']
grade_6_8_subjects = ['English', 'Mathematics', 'Urdu', 'Physics', 'Chemistry', 'Biology', 'Computer', 'History', 'Islamic Studies']
grade_9_10_subjects = ['English', 'Mathematics', 'Urdu', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Islamic Studies']

all_subject_names = list(set(grade_1_5_subjects + grade_6_8_subjects + grade_9_10_subjects))
subject_objects = {}
for code_idx, s_name in enumerate(all_subject_names, 1):
    sub_obj, _ = Subject.objects.get_or_create(
        name=s_name,
        defaults={'code': f"SUB{code_idx:03d}", 'credits': 3, 'description': f"Standard curriculum for {s_name}"}
    )
    subject_objects[s_name] = sub_obj

# 4. Setup Teachers & Specializations (45 Teachers)
teacher_specialization_map = {
    'Mathematics': ['Maryam Fatima', 'Dr. Mariam Butt', 'Mr. Hamza Ali Abbasi', 'Ms. Amna Tariq', 'Mr. Hassan Malik'],
    'English': ['Dr. Ahmed Raza', 'Mr. Faisal Qureshi', 'Mr. Saad Rana', 'Ms. Abida Parveen', 'Prof. Sara Khan'],
    'Urdu': ['Ms. Fatima Ali', 'Prof. Usman Shah', 'Mr. Ali Zafar', 'Mr. Zeeshan Haider', 'Ms. Sadia Iqbal'],
    'Physics': ['Dr. Bushra Ansari', 'Prof. Ghulam Ali', 'Dr. Atif Aslam', 'Prof. Omar Farooq', 'Prof. Tahir Ul Qadri'],
    'Chemistry': ['Dr. Tariq Mahmood', 'Dr. Rehan Siddiqui', 'Dr. Danish Taimoor', 'Ms. Saba Qamar', 'Ms. Hina Chaudhry'],
    'Biology': ['Dr. Ayesha Hussain', 'Dr. Asim Azhar', 'Ms. Yumna Zaidi', 'Ms. Sajal Aly', 'Ms. Momina Mustehsan'],
    'Computer': ['Mr. Bilal Ahmed', 'Mr. Kamran Akmal', 'Mr. Shoaib Akhtar', 'Mr. Ahad Raza Mir', 'Prof. Adnan Siddiqui'],
    'History': ['Ms. Zainab Sheikh', 'Ms. Hadiqa Kiani', 'Prof. Sanam Saeed', 'Ms. Rabia Anum', 'Mr. Rahat Fateh'],
    'Islamic Studies': ['Prof. Abrar Ul Haq', 'Mr. Shehzad Roy', 'Mr. Fawad Khan', 'Dr. Mahira Khan', 'Prof. Nida Yasir']
}

teacher_specialization_map['Computer Science'] = teacher_specialization_map['Computer']
teacher_specialization_map['Games'] = teacher_specialization_map['History']
teacher_specialization_map['Art'] = teacher_specialization_map['English']

all_teachers = {}
emp_id_count = 1
for spec, t_names in teacher_specialization_map.items():
    for t_name in t_names:
        if t_name not in all_teachers:
            t_obj = Teacher.objects.filter(full_name=t_name).first()
            if not t_obj:
                t_obj = Teacher.objects.create(
                    employee_id=f"TCH-{emp_id_count:03d}",
                    full_name=t_name,
                    email=f"{t_name.lower().replace(' ', '.').replace('.', '', 1)}@school.edu",
                    phone=f"0300{4000000 + emp_id_count:07d}",
                    specializations=[spec],
                    is_active=True
                )
                emp_id_count += 1
            all_teachers[t_name] = t_obj

# 5. Setup Classes, Sections & Classrooms
classes_dict = {}
sections_list = []

for g_num in range(1, 11):
    g_name = f"Grade {g_num}"
    cls_obj = SchoolClass.objects.filter(name=g_name).first()
    if not cls_obj:
        cls_obj = SchoolClass.objects.create(name=g_name, code=f"GRD{g_num:02d}")
    classes_dict[g_num] = cls_obj

    for sec_idx, sec_name in enumerate(['A', 'B']):
        sec_obj = Section.objects.filter(class_ref=cls_obj, name=f"Section {sec_name}").first()
        if not sec_obj:
            sec_obj = Section.objects.filter(class_ref=cls_obj, name=sec_name).first()
        if not sec_obj:
            sec_obj = Section.objects.create(class_ref=cls_obj, name=f"Section {sec_name}", capacity=40)
        
        room_num = 100 + (g_num - 1) * 2 + (1 if sec_name == 'A' else 2)
        room_obj, _ = Classroom.objects.get_or_create(
            code=f"RM{room_num}",
            defaults={'name': f"Room {room_num}", 'capacity': 40, 'location': f"Building Block {(g_num - 1) // 3 + 1}", 'is_active': True}
        )
        sections_list.append((g_num, sec_name, cls_obj, sec_obj, room_obj))

# Wipe existing timetable entries for clean generation
TimetableEntry.objects.all().delete()
print("Wiped existing timetable entries.")

# 6. Generate Conflict-Free Master Timetable
days_of_week = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
teacher_busy = {day: {p: set() for p in range(1, 9)} for day in days_of_week}
class_subject_busy = {day: {p: set() for p in range(1, 9)} for day in days_of_week}

section_class_teachers = {}

for g_num, sec_name, cls_obj, sec_obj, room_obj in sections_list:
    sec_identifier = f"Grade {g_num}-{sec_name}"
    
    if g_num <= 5:
        sub_pool = grade_1_5_subjects
    elif g_num <= 8:
        sub_pool = grade_6_8_subjects
    else:
        sub_pool = grade_9_10_subjects

    # Pre-assign Period 1 Subject & Teacher (Class Teacher Rule!)
    p1_sub_idx = (g_num * 2 + (0 if sec_name == 'A' else 4)) % len(sub_pool)
    p1_subject_name = sub_pool[p1_sub_idx]
    avail_p1_teachers = teacher_specialization_map.get(p1_subject_name, teacher_specialization_map['English'])
    
    chosen_p1_teacher_name = None
    for candidate in avail_p1_teachers:
        if candidate not in section_class_teachers.values():
            chosen_p1_teacher_name = candidate
            break
    if not chosen_p1_teacher_name:
        chosen_p1_teacher_name = avail_p1_teachers[0]
        
    section_class_teachers[sec_identifier] = chosen_p1_teacher_name
    
    if sec_name == 'A':
        cls_obj.teacher_name = chosen_p1_teacher_name
        cls_obj.save()

    print(f"Assigned Class Teacher for {sec_identifier}: {chosen_p1_teacher_name} ({p1_subject_name})")

    for day in days_of_week:
        for p_num in range(1, 9):
            # Find a subject & teacher pair that does not collide on class_subject or teacher availability
            selected_sub_name = None
            selected_t_name = None
            
            sub_candidates = [p1_subject_name] if p_num == 1 else sub_pool
            
            for sub_candidate in sub_candidates:
                sub_obj_candidate = subject_objects[sub_candidate]
                c_sub_cand, _ = ClassSubject.objects.get_or_create(class_ref=cls_obj, subject=sub_obj_candidate)
                
                # Check if this class_subject is already scheduled for this day & period
                if c_sub_cand.id in class_subject_busy[day][p_num]:
                    continue
                
                t_candidates = [chosen_p1_teacher_name] if p_num == 1 else teacher_specialization_map.get(sub_candidate, teacher_specialization_map['Mathematics'])
                for t_cand in t_candidates:
                    t_obj_cand = all_teachers[t_cand]
                    if t_obj_cand.id not in teacher_busy[day][p_num]:
                        selected_sub_name = sub_candidate
                        selected_t_name = t_cand
                        break
                if selected_sub_name:
                    break
            
            # Fallback if strict match failed
            if not selected_sub_name:
                for sub_candidate in sub_pool:
                    sub_obj_candidate = subject_objects[sub_candidate]
                    c_sub_cand, _ = ClassSubject.objects.get_or_create(class_ref=cls_obj, subject=sub_obj_candidate)
                    if c_sub_cand.id not in class_subject_busy[day][p_num]:
                        selected_sub_name = sub_candidate
                        selected_t_name = teacher_specialization_map.get(sub_candidate, teacher_specialization_map['Mathematics'])[0]
                        break

            if not selected_sub_name:
                selected_sub_name = sub_pool[p_num % len(sub_pool)]
                selected_t_name = teacher_specialization_map.get(selected_sub_name, teacher_specialization_map['Mathematics'])[0]

            teacher_obj = all_teachers[selected_t_name]
            sub_obj = subject_objects[selected_sub_name]
            class_sub_obj, _ = ClassSubject.objects.get_or_create(class_ref=cls_obj, subject=sub_obj)
            period_obj = period_objects[p_num]
            
            teacher_busy[day][p_num].add(teacher_obj.id)
            class_subject_busy[day][p_num].add(class_sub_obj.id)
            
            TimetableEntry.objects.create(
                academic_year=academic_year,
                class_subject=class_sub_obj,
                teacher=teacher_obj,
                classroom=room_obj,
                section=sec_obj,
                day_of_week=day,
                period=period_obj,
                is_active=True
            )

print(f"SUCCESS! Master Timetable generated with {TimetableEntry.objects.count()} conflict-free period entries across 20 sections!")
