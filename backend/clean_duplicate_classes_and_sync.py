import sys
import os
import django

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_core.settings')
django.setup()

from services.education.academics.models import SchoolClass, ClassSubject, TimetableEntry, Section, Classroom, Subject, Teacher, Period, AcademicYear

print("Starting Clean Class Reconciliation & Master Timetable Sync...")

classes_by_name = {}
all_classes = list(SchoolClass.objects.all().order_by('created_at'))

for cls in all_classes:
    norm_name = cls.name.strip()
    if norm_name not in classes_by_name:
        classes_by_name[norm_name] = cls
    else:
        master_cls = classes_by_name[norm_name]
        ClassSubject.objects.filter(class_ref=cls).update(class_ref=master_cls)
        Section.objects.filter(class_ref=cls).update(class_ref=master_cls)
        print(f"Merged duplicate class {cls.name} ({cls.code}) into master ID {master_cls.id}")
        cls.delete()

print("\nUnique classes after cleanup:")
for name, cls in classes_by_name.items():
    print(f"- {name} (Code: {cls.code}, ID: {cls.id})")

academic_year = AcademicYear.objects.filter(is_active=True).first()
if not academic_year:
    academic_year = AcademicYear.objects.create(name='2025-2026', start_date='2025-08-01', end_date='2026-06-30', is_active=True)

periods = list(Period.objects.filter(is_active=True, is_break=False).order_by('period_number')[:8])
teachers = list(Teacher.objects.filter(is_active=True))
subjects = list(Subject.objects.all())

for g_num in range(1, 11):
    c_name = f"Grade {g_num}"
    cls_obj = classes_by_name.get(c_name)
    if not cls_obj:
        cls_obj = SchoolClass.objects.create(name=c_name, code=f"GRD{g_num:02d}")
        classes_by_name[c_name] = cls_obj

    for sub in subjects[:5]:
        ClassSubject.objects.get_or_create(class_ref=cls_obj, subject=sub)

print(f"\nFinal verification of timetable entries per class:")
for name, cls in classes_by_name.items():
    cs_ids = ClassSubject.objects.filter(class_ref=cls).values_list('id', flat=True)
    count = TimetableEntry.objects.filter(class_subject_id__in=cs_ids).count()
    print(f"{name}: {count} timetable entries")
