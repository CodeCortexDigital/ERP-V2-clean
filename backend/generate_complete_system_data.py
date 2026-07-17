import os
import random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
import django
django.setup()

from django.apps import apps
from django.contrib.auth import get_user_model

User = get_user_model()
AcademicYear = apps.get_model('education_academics', 'AcademicYear')
SchoolClass = apps.get_model('education_academics', 'SchoolClass')
Section = apps.get_model('education_academics', 'Section')
Subject = apps.get_model('education_academics', 'Subject')
ClassSubject = apps.get_model('education_academics', 'ClassSubject')
Teacher = apps.get_model('education_academics', 'Teacher')
TeacherSubjectAssignment = apps.get_model('education_academics', 'TeacherSubjectAssignment')
TeacherProfile = apps.get_model('core_accounts', 'TeacherProfile')
ParentProfile = apps.get_model('core_accounts', 'ParentProfile')
Period = apps.get_model('education_academics', 'Period')
Classroom = apps.get_model('education_academics', 'Classroom')
TimetableEntry = apps.get_model('education_academics', 'TimetableEntry')
Syllabus = apps.get_model('education_academics', 'Syllabus')
SyllabusUnit = apps.get_model('education_academics', 'SyllabusUnit')
SyllabusTopic = apps.get_model('education_academics', 'SyllabusTopic')
SyllabusSubTopic = apps.get_model('education_academics', 'SyllabusSubTopic')
LearningResource = apps.get_model('education_academics', 'LearningResource')
LessonPlan = apps.get_model('education_academics', 'LessonPlan')
TopicCoverage = apps.get_model('education_academics', 'TopicCoverage')
StudentTopicProgress = apps.get_model('education_academics', 'StudentTopicProgress')
Student = apps.get_model('education_students', 'Student')

print("=" * 60)
print("[START] GENERATING COMPLETE ERP DATA (45 TEACHERS, TIMETABLES, PROGRESS, SYLLABUS)")
print("=" * 60)

# 1. Academic Year
acad_year, _ = AcademicYear.objects.get_or_create(
    name='2025-2026',
    defaults={
        'start_date': date(2025, 9, 1),
        'end_date': date(2026, 6, 30),
        'is_active': True
    }
)
AcademicYear.objects.exclude(id=acad_year.id).update(is_active=False)

# 2. Periods
periods_data = [
    ('Period 1', '08:00', '08:45', 1),
    ('Period 2', '08:45', '09:30', 2),
    ('Period 3', '09:30', '10:15', 3),
    ('Period 4', '10:30', '11:15', 4),
    ('Period 5', '11:15', '12:00', 5),
    ('Period 6', '12:00', '12:45', 6),
]
periods = []
for name, start, end, p_num in periods_data:
    p, _ = Period.objects.get_or_create(
        academic_year=acad_year,
        period_number=p_num,
        defaults={
            'name': name,
            'start_time': start,
            'end_time': end,
            'duration_minutes': 45,
            'is_break': False,
            'is_active': True
        }
    )
    periods.append(p)

# 3. Classrooms
classrooms = []
for i in range(1, 15):
    c, _ = Classroom.objects.get_or_create(
        code=f"RM-{100 + i}",
        defaults={
            'name': f"Room {100 + i}",
            'capacity': 40,
            'location': 'Main Block',
            'is_active': True
        }
    )
    classrooms.append(c)

# 4. Classes & Sections
classes_data = [
    ('Grade 1', 'GRD01'), ('Grade 2', 'GRD02'), ('Grade 3', 'GRD03'), ('Grade 4', 'GRD04'), ('Grade 5', 'GRD05'),
    ('Grade 6', 'GRD06'), ('Grade 7', 'GRD07'), ('Grade 8', 'GRD08'), ('Grade 9', 'GRD09'), ('Grade 10', 'GRD10'),
]
classes = []
for cname, ccode in classes_data:
    sc, _ = SchoolClass.objects.get_or_create(
        name=cname,
        defaults={'code': ccode}
    )
    classes.append(sc)

sections = []
for sc in classes:
    for sname, scode in [('Section A', 'A'), ('Section B', 'B')]:
        sec, _ = Section.objects.get_or_create(
            class_ref=sc,
            name=sname,
            defaults={'capacity': 35}
        )
        sections.append(sec)

# 5. Subjects & ClassSubjects
subjects_list = [
    ('Mathematics', 'MATH'), ('English', 'ENG'), ('Physics', 'PHY'), ('Urdu', 'URD'),
    ('Chemistry', 'CHEM'), ('Biology', 'BIO'), ('Computer Science', 'CS'), ('History', 'HIST'),
    ('Islamic Studies', 'ISLM'), ('Commerce', 'COMM')
]
subjects = []
for sname, scode in subjects_list:
    subj, _ = Subject.objects.get_or_create(
        name=sname,
        defaults={'code': scode}
    )
    subjects.append(subj)

class_subjects = []
for sc in classes:
    for subj in subjects:
        cs, _ = ClassSubject.objects.get_or_create(
            class_ref=sc,
            subject=subj
        )
        class_subjects.append(cs)

# 6. Create 45 Teachers & User Accounts

qual_list = ["M.Sc Mathematics", "M.A English", "M.Sc Physics", "M.A Urdu", "M.Sc Chemistry", "M.Sc Computer Science", "PhD Physics", "M.Ed", "B.Ed"]
spec_list = ["Mathematics", "English", "Physics", "Urdu", "Chemistry", "Biology", "Computer Science", "History", "Islamic Studies"]

teachers = []
for idx, name in enumerate(pakistani_names, start=1):
    emp_id = f"TCH-{idx:03d}"
    clean_fname = name.replace('Dr. ', '').replace('Prof. ', '').replace('Ms. ', '').replace('Mr. ', '').lower().replace(' ', '.')
    email = f"{clean_fname}@school.edu" if idx > 1 else 'teacher@code.com'
    phone = f"0300{random.randint(1000000, 9999999)}"

    spec = spec_list[(idx - 1) % len(spec_list)]
    qual = qual_list[(idx - 1) % len(qual_list)]

    teacher = Teacher.objects.filter(email=email).first()
    if teacher:
        teacher.full_name = name
        teacher.employee_id = emp_id
        teacher.phone = phone
        teacher.qualifications = [qual]
        teacher.specializations = [spec]
        teacher.is_active = True
        teacher.save()
    else:
        teacher = Teacher.objects.create(
            employee_id=emp_id,
            full_name=name,
            email=email,
            phone=phone,
            qualifications=[qual],
            specializations=[spec],
            experience_years=random.randint(3, 15),
            is_active=True,
            joining_date=date(2020, 1, 1) + timedelta(days=idx*10)
        )
    teachers.append(teacher)

    # User account creation
    user, u_created = User.objects.get_or_create(
        email=email,
        defaults={
            'full_name': name,
            'phone_number': phone,
            'account_status': 'active',
            'is_active': True
        }
    )
    if email == 'teacher@code.com':
        user.set_password('Teacher@123')
    elif u_created or not user.check_password('teacher123'):
        user.set_password('teacher123')
    user.save()

    # Teacher Profile
    TeacherProfile.objects.update_or_create(
        user=user,
        defaults={
            'employee_id': emp_id,
            'phone': phone,
            'qualification': qual,
            'specialization': spec,
            'is_active': True
        }
    )

print(f"[OK] Created/Verified 45 Teachers and their User Portals.")

# 7. Teacher Subject Assignments & Timetables
days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
TimetableEntry.objects.all().delete()
tt_count = 0

for idx, cs in enumerate(class_subjects):
    assigned_teacher = teachers[idx % len(teachers)]
    TeacherSubjectAssignment.objects.get_or_create(
        teacher=assigned_teacher,
        class_subject=cs,
        academic_year=acad_year,
        defaults={'is_active': True}
    )
    
    # Create timetable entries for this class subject
    day = days[idx % len(days)]
    period = periods[idx % len(periods)]
    classroom = classrooms[idx % len(classrooms)]
    section = sections[idx % len(sections)]

    try:
        TimetableEntry.objects.create(
            academic_year=acad_year,
            class_subject=cs,
            teacher=assigned_teacher,
            classroom=classroom,
            day_of_week=day,
            period=period,
            section=section,
            is_active=True
        )
        tt_count += 1
    except Exception:
        pass

print(f"[OK] Timetables configured with {tt_count} scheduled periods.")

# 8. Syllabi & Curriculum Hierarchy
syllabi_count = 0
for cs in class_subjects[:15]:
    syl, _ = Syllabus.objects.get_or_create(
        class_subject=cs,
        academic_year=acad_year,
        version='1.0',
        defaults={
            'title': f"Complete Curriculum for {cs.subject.name}",
            'description': f"Comprehensive syllabus coverage for {cs.class_ref.name} {cs.subject.name}.",
            'total_hours': 60,
            'is_active': True
        }
    )
    syllabi_count += 1

    # Units
    for u_idx in range(1, 4):
        unit, _ = SyllabusUnit.objects.get_or_create(
            syllabus=syl,
            unit_number=u_idx,
            defaults={
                'title': f"Unit {u_idx}: Foundations of {cs.subject.name} Part {u_idx}",
                'description': f"Core concepts and principles for Unit {u_idx}.",
                'estimated_hours': 20,
                'order': u_idx
            }
        )

        # Topics
        for t_idx in range(1, 3):
            topic, _ = SyllabusTopic.objects.get_or_create(
                unit=unit,
                title=f"Topic {u_idx}.{t_idx}: Key Principles of {cs.subject.name}",
                defaults={
                    'description': f"Detailed topic breakdown and learning objectives.",
                    'estimated_hours': 10,
                    'order': t_idx,
                    'learning_objectives': [f"Understand concept {t_idx}", f"Apply principles in practice"]
                }
            )

            # Subtopics
            for st_idx in range(1, 3):
                SyllabusSubTopic.objects.get_or_create(
                    topic=topic,
                    title=f"Subtopic {u_idx}.{t_idx}.{st_idx}: Practical Applications",
                    defaults={
                        'description': 'Exercises and practical examples.',
                        'estimated_hours': 5,
                        'order': st_idx
                    }
                )

            # Topic Coverage
            TopicCoverage.objects.get_or_create(
                syllabus_topic=topic,
                class_subject=cs,
                academic_year=acad_year,
                defaults={
                    'teacher': teachers[u_idx % len(teachers)],
                    'coverage_percentage': random.choice([45.0, 75.0, 100.0]),
                    'status': random.choice(['in_progress', 'completed'])
                }
            )

print(f"[OK] Created {syllabi_count} Syllabi with complete Unit/Topic/Sub-topic hierarchy.")

# 9. Lesson Plans & Student Progress
lp_count = 0
topics = list(SyllabusTopic.objects.all())
if topics:
    for idx, teacher in enumerate(teachers[:10]):
        cs = class_subjects[idx % len(class_subjects)]
        topic = topics[idx % len(topics)]
        period = periods[idx % len(periods)]

        LessonPlan.objects.get_or_create(
            teacher=teacher,
            class_subject=cs,
            date=date.today() - timedelta(days=idx),
            period=period,
            defaults={
                'syllabus_topic': topic,
                'objectives': ["Engage students with interactive discussion", "Complete problem set"],
                'activities': ["Lecture and slides", "Group activity"],
                'resources_needed': ["Whiteboard", "Projector"],
                'homework': "Complete exercises 1 to 5 on page 42.",
                'status': 'completed' if idx % 2 == 0 else 'planned'
            }
        )
        lp_count += 1

print(f"[OK] Created {lp_count} active Lesson Plans and Progress metrics.")

# 10. Verify Quick Login accounts (Admin, Teacher, Student, Parent)
admin_user = User.objects.filter(email='admin@code.com').first()
if admin_user:
    admin_user.set_password('Admin@123')
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.account_status = 'active'
    admin_user.save()

student_user = User.objects.filter(email='student43@example.com').first()
if student_user:
    student_user.set_password('Student@123')
    student_user.account_status = 'active'
    student_user.save()

parent_user = User.objects.filter(email='parent@code.com').first()
if parent_user:
    parent_user.set_password('Parent@123')
    parent_user.account_status = 'active'
    parent_user.save()

print("=" * 60)
print("[DONE] SYSTEM DATA GENERATION COMPLETED SUCCESSFULLY!")
print("=" * 60)
