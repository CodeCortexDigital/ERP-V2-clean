import sys
import os
import django

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.academics.models import (
    SchoolClass, Section, Subject, Teacher, Period, ClassSubject, TimetableEntry, AcademicYear, Classroom
)

print("Starting Complete 20-Class Unique Timetable & Class Teacher Seeding...")

# 1. Setup Academic Year
academic_year, _ = AcademicYear.objects.get_or_create(
    name='2025-2026',
    defaults={'start_date': '2025-08-01', 'end_date': '2026-06-30', 'is_active': True}
)

# 2. Setup Daily Schedule Periods (8 Periods + Break after Period 3)
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

# 3. Setup Subjects
grade_1_5_subjects = ['English', 'Mathematics', 'Urdu', 'Computer', 'Islamic Studies', 'History', 'Games', 'Art']
grade_6_8_subjects = ['English', 'Mathematics', 'Urdu', 'Physics', 'Chemistry', 'Biology', 'Computer', 'History', 'Islamic Studies']
grade_9_10_subjects = ['English', 'Mathematics', 'Urdu', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Islamic Studies']

all_subject_names = list(set(grade_1_5_subjects + grade_6_8_subjects + grade_9_10_subjects))
subject_objects = {}
for code_idx, s_name in enumerate(all_subject_names, 1):
    sub_obj, _ = Subject.objects.get_or_create(
        name=s_name,
        defaults={'code': f"SUB{code_idx:03d}", 'credits': 3, 'description': f"Curriculum for {s_name}"}
    )
    subject_objects[s_name] = sub_obj

# 4. Setup 45 Teachers across Specializations
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

all_teachers_list = []
all_teachers_dict = {}
emp_id_count = 1

for spec, t_names in teacher_specialization_map.items():
    for t_name in t_names:
        if t_name not in all_teachers_dict:
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
            all_teachers_dict[t_name] = t_obj
            all_teachers_list.append(t_obj)

# 5. Setup 20 Distinct Sections (Grade 1-A to Grade 10-B) & Dedicated Unique Class Teachers
sections_list = []
class_teacher_assignments = {}

unique_faculty_pool = [t.full_name for t in all_teachers_list][:20]

section_idx = 0
for g_num in range(1, 11):
    g_name = f"Grade {g_num}"
    cls_obj = SchoolClass.objects.filter(name=g_name).first()
    if not cls_obj:
        cls_obj = SchoolClass.objects.create(name=g_name, code=f"GRD{g_num:02d}")
    
    for sec_name in ['A', 'B']:
        sec_obj = Section.objects.filter(class_ref=cls_obj, name=f"Section {sec_name}").first()
        if not sec_obj:
            sec_obj = Section.objects.filter(class_ref=cls_obj, name=sec_name).first()
        if not sec_obj:
            sec_obj = Section.objects.create(class_ref=cls_obj, name=f"Section {sec_name}", capacity=40)
        
        assigned_teacher_name = unique_faculty_pool[section_idx]
        section_idx += 1
        
        sec_identifier = f"Grade {g_num}-{sec_name}"
        class_teacher_assignments[sec_identifier] = assigned_teacher_name
        
        if sec_name == 'A':
            cls_obj.teacher_name = assigned_teacher_name
            cls_obj.save()
            
        room_num = 100 + (g_num - 1) * 2 + (1 if sec_name == 'A' else 2)
        room_obj, _ = Classroom.objects.get_or_create(
            code=f"RM{room_num}",
            defaults={'name': f"Room {room_num}", 'capacity': 40, 'location': f"Building Block {(g_num - 1) // 3 + 1}", 'is_active': True}
        )
        
        sections_list.append((g_num, sec_name, cls_obj, sec_obj, room_obj, assigned_teacher_name))

print("\n--- 20 UNIQUE CLASS TEACHER ASSIGNMENTS ---")
for sec_id, t_name in class_teacher_assignments.items():
    print(f"{sec_id}: {t_name}")

# Wipe existing timetable entries for clean generation
TimetableEntry.objects.all().delete()
print("\nWiped existing timetable entries.")

# 6. Generate Master Timetable for all 20 Sections (Monday - Friday)
days_of_week = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
teacher_busy = {day: {p: set() for p in range(1, 9)} for day in days_of_week}
class_subject_busy = {day: {p: set() for p in range(1, 9)} for day in days_of_week}

for g_num, sec_name, cls_obj, sec_obj, room_obj, class_teacher_name in sections_list:
    if g_num <= 5:
        sub_pool = grade_1_5_subjects
    elif g_num <= 8:
        sub_pool = grade_6_8_subjects
    else:
        sub_pool = grade_9_10_subjects

    sec_offset = 0 if sec_name == 'A' else 3

    for day in days_of_week:
        day_idx = days_of_week.index(day)
        for p_num in range(1, 9):
            # Pick subject ensuring no class_subject collision for this day & period
            sub_idx = (p_num + g_num + sec_offset + day_idx) % len(sub_pool)
            sub_name = sub_pool[sub_idx]
            
            sub_obj = subject_objects[sub_name]
            class_sub_obj, _ = ClassSubject.objects.get_or_create(class_ref=cls_obj, subject=sub_obj)
            
            # If Period 1, use Class Teacher, else pick candidate teacher
            if p_num == 1 and day_idx == 0:
                t_name = class_teacher_name
            else:
                candidates = teacher_specialization_map.get(sub_name, teacher_specialization_map['Mathematics'])
                t_name = None
                for cand in candidates:
                    cand_obj = all_teachers_dict[cand]
                    if cand_obj.id not in teacher_busy[day][p_num]:
                        t_name = cand
                        break
                if not t_name:
                    t_name = candidates[0]

            teacher_obj = all_teachers_dict[t_name]
            period_obj = period_objects[p_num]
            
            # Ensure unique class_subject per day/period
            if class_sub_obj.id in class_subject_busy[day][p_num]:
                # Pick alternative subject
                for alt_sub in sub_pool:
                    alt_sub_obj = subject_objects[alt_sub]
                    alt_c_sub, _ = ClassSubject.objects.get_or_create(class_ref=cls_obj, subject=alt_sub_obj)
                    if alt_c_sub.id not in class_subject_busy[day][p_num]:
                        class_sub_obj = alt_c_sub
                        sub_name = alt_sub
                        break

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

print(f"\nSUCCESS! Full Master Timetable generated with {TimetableEntry.objects.count()} entries across all 20 classes with 20 UNIQUE non-duplicate Class Teachers!")
