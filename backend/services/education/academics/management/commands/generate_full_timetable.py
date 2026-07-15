"""
Generate a full, fixed, conflict-free timetable for every CLASS.

The school is modelled as 20 separate classes (Grade 1A, Grade 1B, ...,
Grade 10B), each with its own classroom.  Students are divided (as evenly as
possible) between the two classes of each grade.  A fully-filled timetable is
then generated for every class:

  * 20 classes x 30 weekly slots = 600 timetable entries.
  * No teacher is double-booked in the same timeslot (across all classes).
  * A teacher may teach the same subject in several classes, so weekly load
    naturally rises (average ~14, soft cap 18) -> fewer teachers, more periods
    each.
  * Subject specialization is respected (specializations normalized first).

Idempotent: wipes existing Sections, TimetableEntry and TeacherSubjectAssignment
rows for the academic year, and rebuilds the 20 classes + timetable.
"""
import re
import collections

from django.core.management.base import BaseCommand
from django.db import transaction

from services.education.academics.models import (
    SchoolClass, Subject, Teacher, Period, ClassSubject,
    TimetableEntry, TeacherSubjectAssignment, AcademicYear, Section, Classroom,
)
from services.education.students.models import Student


# ---- Canonical curriculum -------------------------------------------------
SUBJECT_CODES = {
    'English': 'ENG', 'Urdu': 'URD', 'Mathematics': 'MATH',
    'Islamic Studies': 'ISL', 'Science': 'SCI', 'Computer': 'COMP',
    'Art': 'ART', 'Physics': 'PHY', 'Chemistry': 'CHEM', 'Biology': 'BIO',
    'Computer Science': 'CS', 'Pakistan Studies': 'PKST',
}

# Weekly period demand per class (must sum to total weekly teaching slots)
PRIMARY_DEMAND = {
    'English': 5, 'Urdu': 5, 'Mathematics': 5, 'Science': 4,
    'Islamic Studies': 4, 'Computer': 4, 'Art': 3,
}  # = 30
SECONDARY_DEMAND = {
    'Mathematics': 5, 'English': 4, 'Urdu': 3, 'Physics': 3, 'Chemistry': 3,
    'Biology': 3, 'Computer Science': 3, 'Islamic Studies': 3, 'Pakistan Studies': 3,
}  # = 30

# Map messy existing specialization strings -> canonical teaching subject
SPEC_SYNONYMS = {
    'maths': 'Mathematics', 'mathematics': 'Mathematics', 'math': 'Mathematics',
    'english': 'English', 'english literature': 'English',
    'urdu': 'Urdu',
    'islamic studies': 'Islamic Studies', 'islamiyat': 'Islamic Studies', 'islamiat': 'Islamic Studies',
    'science': 'Science', 'science lab': 'Science', 'general science': 'Science',
    'environmental science': 'Science',
    'computer': 'Computer', 'information technology': 'Computer',
    'computer science': 'Computer Science', 'it': 'Computer Science',
    'art': 'Art', 'arts': 'Art', 'fine arts': 'Art', 'home economics': 'Art',
    'physics': 'Physics', 'chemistry': 'Chemistry', 'biology': 'Biology',
    'history': 'Pakistan Studies', 'geography': 'Pakistan Studies',
    'pakistan studies': 'Pakistan Studies', 'pak studies': 'Pakistan Studies',
    'political science': 'Pakistan Studies', 'sociology': 'Pakistan Studies',
    'economics': 'Pakistan Studies', 'psychology': 'Pakistan Studies',
    'social studies': 'Pakistan Studies',
}

# Specializations / roles that mean "does not teach class periods"
NON_TEACHING = {
    'principal', 'accountant', 'accounts', 'store manager', 'store operations',
    'store operator', 'inventory management', 'operations management',
    'management staff', 'human resources', 'hr', 'finance', 'student affairs',
    'library science', 'academic administration', 'educational leadership',
    'librarian', 'lab assistant', 'sports staff', 'vice principal',
}

DAY_CODES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']


class Command(BaseCommand):
    help = 'Generate a full fixed conflict-free timetable for 20 separate classes (A/B per grade).'

    def add_arguments(self, parser):
        parser.add_argument('--days', default='monday,tuesday,wednesday,thursday,friday',
                            help='Active school days (comma-separated day codes).')
        parser.add_argument('--keep-specializations', action='store_true',
                            help='Do not overwrite teacher specializations (only read them).')

    # -- helpers ------------------------------------------------------------
    @staticmethod
    def grade_number(class_name):
        m = re.search(r'(\d+)', class_name or '')
        return int(m.group(1)) if m else 0

    @staticmethod
    def canonize(raw):
        return SPEC_SYNONYMS.get((raw or '').strip().lower())

    def handle(self, *args, **options):
        active_days = [d.strip().lower() for d in options['days'].split(',')
                       if d.strip().lower() in DAY_CODES]
        if not active_days:
            self.stderr.write(self.style.ERROR('No valid active days.'))
            return

        # 1) Academic year = the one the Periods belong to -------------------
        period_qs = Period.objects.filter(is_active=True).order_by('period_number')
        if not period_qs.exists():
            self.stderr.write(self.style.ERROR('No periods configured.'))
            return
        academic_year = period_qs.first().academic_year
        self.stdout.write(f'Academic year: {academic_year} ({academic_year.id})')

        teaching_periods = list(period_qs.filter(is_break=False))
        self.stdout.write(f'Teaching periods/day: {len(teaching_periods)} '
                          f'({[p.period_number for p in teaching_periods]})')
        slots_per_week = len(teaching_periods) * len(active_days)
        self.stdout.write(f'Weekly slots per class: {slots_per_week}')

        # 2) Subjects (create canonical) -------------------------------------
        subjects = {}
        for name, code in SUBJECT_CODES.items():
            subj = Subject.objects.filter(name__iexact=name).first()
            if not subj:
                use_code = code
                if Subject.objects.filter(code=use_code).exclude(name__iexact=name).exists():
                    use_code = code + 'X'
                subj = Subject.objects.create(name=name, code=use_code)
            elif subj.name != name:
                subj.name = name
                subj.save(update_fields=['name'])
            subjects[name] = subj
        self.stdout.write(f'Subjects ready: {len(subjects)}')

        # 3) Build 20 separate classes (Grade 1A..Grade 10B), own classrooms --
        classrooms = list(Classroom.objects.all().order_by('name'))
        if not classrooms:
            self.stderr.write(self.style.ERROR('No classrooms configured.'))
            return

        # wipe any sections + old classes (keep academics clean)
        Section.objects.all().delete()
        SchoolClass.objects.all().delete()

        classes = []
        cls_index = 0
        for g in range(1, 11):
            for sname in ['A', 'B']:
                room = classrooms[cls_index % len(classrooms)]
                c = SchoolClass.objects.create(
                    name=f'Grade {g}{sname}', code=f'G{g}{sname}',
                    academic_year=academic_year, classroom=room,
                    max_students=30, is_active=True,
                )
                classes.append(c)
                self.stdout.write(f'  Class {c.name} @ {room.name}')
                cls_index += 1
        self.stdout.write(f'Classes created: {len(classes)}')

        # 4) Split students evenly across the 20 classes (round-robin) ------
        students = list(Student.objects.filter(is_active=True))
        students.sort(key=lambda x: str(x.id))
        moved = 0
        for i, s in enumerate(students):
            target = classes[i % len(classes)]
            if s.current_class_id != target.id or s.current_section_id is not None:
                s.current_class_id = target.id
                s.current_section_id = None
                moved += 1
        if moved:
            Student.objects.bulk_update(
                students, ['current_class', 'current_section'], batch_size=500)
        self.stdout.write(f'Students reassigned to classes: {moved}')

        # 5) Per-class subject demand + ClassSubject links -------------------
        class_demand = {}          # cls.id -> {subject_name: count}
        class_subject_link = {}    # (cls.id, sname) -> ClassSubject
        ClassSubject.objects.filter(class_ref_id__in=[c.id for c in classes]).delete()
        for c in classes:
            demand = dict(PRIMARY_DEMAND if self.grade_number(c.name) <= 5 else SECONDARY_DEMAND)
            total = sum(demand.values())
            if total != slots_per_week:
                diff = slots_per_week - total
                top = max(demand, key=demand.get)
                demand[top] += diff
            class_demand[c.id] = demand
            for sname in demand:
                cs, _ = ClassSubject.objects.get_or_create(class_ref=c, subject=subjects[sname])
                class_subject_link[(c.id, sname)] = cs

        # 6) Normalize teacher specializations & build teaching pool ---------
        all_subject_names = set(SUBJECT_CODES.keys())
        subject_weekly_demand = collections.Counter()
        for c in classes:
            for sname, cnt in class_demand[c.id].items():
                subject_weekly_demand[sname] += cnt

        teachers = list(Teacher.objects.filter(is_active=True))
        teacher_subject = {}
        flex = []

        for t in teachers:
            specs = t.specializations if isinstance(t.specializations, list) else []
            role = (t.role or '').strip().lower()
            canon = None
            for s in specs:
                c = self.canonize(s)
                if c:
                    canon = c
                    break
            is_non_teaching = role in NON_TEACHING or any(
                (s or '').strip().lower() in NON_TEACHING for s in specs)
            if canon:
                teacher_subject[t.id] = canon
            elif is_non_teaching:
                continue
            else:
                flex.append(t)

        def teachers_for(sname):
            return sum(1 for v in teacher_subject.values() if v == sname)

        for t in flex:
            target = max(all_subject_names,
                         key=lambda s: subject_weekly_demand[s] / (teachers_for(s) + 1))
            teacher_subject[t.id] = target

        by_subject = collections.defaultdict(list)
        for tid, sname in teacher_subject.items():
            by_subject[sname].append(tid)
        for sname in all_subject_names:
            if subject_weekly_demand[sname] > 0 and len(by_subject[sname]) < 2:
                donor = max(all_subject_names,
                            key=lambda s: len(by_subject[s]) - (subject_weekly_demand[s] / slots_per_week))
                while len(by_subject[sname]) < 2 and len(by_subject[donor]) > 2:
                    tid = by_subject[donor].pop()
                    teacher_subject[tid] = sname
                    by_subject[sname].append(tid)

        teacher_by_id = {t.id: t for t in teachers}
        teachers_by_subject = collections.defaultdict(list)
        for tid, sname in teacher_subject.items():
            teachers_by_subject[sname].append(teacher_by_id[tid])

        self.stdout.write('Teaching pool by subject:')
        for sname in sorted(all_subject_names):
            self.stdout.write(f'  {sname:18s} demand={subject_weekly_demand[sname]:3d} '
                              f'teachers={len(teachers_by_subject[sname])}')

        if not options['keep_specializations']:
            for tid, sname in teacher_subject.items():
                t = teacher_by_id[tid]
                t.specializations = [sname]
                t.save(update_fields=['specializations'])

        # 7) Build the schedule ---------------------------------------------
        timeslots = [(d, p) for d in active_days for p in teaching_periods]
        teacher_load = collections.Counter()
        SOFT_CAP = 18
        remaining = {c.id: dict(class_demand[c.id]) for c in classes}
        day_subjects = collections.defaultdict(set)  # (cls.id, day) -> {subject}

        entries = []
        free_slots = 0
        room_busy = collections.defaultdict(set)  # (day, period) -> {room_id}

        for (day, period) in timeslots:
            busy_teachers = set()

            order = sorted(classes, key=lambda c: sum(1 for v in remaining[c.id].values() if v > 0))

            for cls in order:
                owed = [s for s, n in remaining[cls.id].items() if n > 0]
                chosen_subj, chosen_teacher = None, None

                def rank(sname):
                    already = sname in day_subjects[(cls.id, day)]
                    return (0 if not already else 1, -remaining[cls.id][sname])

                for sname in sorted(owed, key=rank):
                    free = [t for t in teachers_by_subject.get(sname, [])
                            if t.id not in busy_teachers and teacher_load[t.id] < SOFT_CAP]
                    if free:
                        chosen_subj = sname
                        chosen_teacher = min(free, key=lambda t: teacher_load[t.id])
                        break

                if chosen_subj is None:
                    for sname in class_demand[cls.id]:
                        free = [t for t in teachers_by_subject.get(sname, [])
                                if t.id not in busy_teachers and teacher_load[t.id] < SOFT_CAP]
                        if free:
                            chosen_subj = sname
                            chosen_teacher = min(free, key=lambda t: teacher_load[t.id])
                            break

                if chosen_subj is None:
                    free_slots += 1
                    continue

                room = cls.classroom
                if room.id in room_busy[(day, period)]:
                    alt = next((r for r in classrooms
                                if r.id not in room_busy[(day, period)]), room)
                    room = alt

                cs = class_subject_link[(cls.id, chosen_subj)]
                entries.append(TimetableEntry(
                    academic_year=academic_year,
                    class_subject=cs,
                    teacher=chosen_teacher,
                    classroom=room,
                    day_of_week=day,
                    period=period,
                    is_active=True,
                ))
                busy_teachers.add(chosen_teacher.id)
                teacher_load[chosen_teacher.id] += 1
                room_busy[(day, period)].add(room.id)
                day_subjects[(cls.id, day)].add(chosen_subj)
                if remaining[cls.id].get(chosen_subj, 0) > 0:
                    remaining[cls.id][chosen_subj] -= 1

        # 8) Persist ---------------------------------------------------------
        with transaction.atomic():
            deleted, _ = TimetableEntry.objects.filter(academic_year=academic_year).delete()
            TimetableEntry.objects.bulk_create(entries, batch_size=1000)

            TeacherSubjectAssignment.objects.filter(academic_year=academic_year).delete()
            cs_teacher_counts = collections.defaultdict(collections.Counter)
            for e in entries:
                cs_teacher_counts[e.class_subject_id][e.teacher_id] += 1
            tsa = []
            seen = set()
            for cs_id, counter in cs_teacher_counts.items():
                top_teacher_id = counter.most_common(1)[0][0]
                key = (top_teacher_id, cs_id)
                if key in seen:
                    continue
                seen.add(key)
                tsa.append(TeacherSubjectAssignment(
                    teacher_id=top_teacher_id, class_subject_id=cs_id,
                    academic_year=academic_year, is_primary=True, is_active=True,
                ))
            TeacherSubjectAssignment.objects.bulk_create(tsa, batch_size=1000, ignore_conflicts=True)

        # 9) Report ----------------------------------------------------------
        self.stdout.write(self.style.WARNING(f'Deleted {deleted} old timetable entries.'))
        self.stdout.write(self.style.SUCCESS(f'Created {len(entries)} timetable entries.'))
        self.stdout.write(f'Teacher-subject assignments: {len(tsa)}')
        expected = len(classes) * slots_per_week
        if free_slots == 0 and len(entries) == expected:
            self.stdout.write(self.style.SUCCESS(
                f'FULL: all {expected} slots filled, no free periods.'))
        else:
            self.stdout.write(self.style.ERROR(
                f'INCOMPLETE: {len(entries)}/{expected} filled, {free_slots} free slots.'))
        busiest = teacher_load.most_common(3)
        if busiest:
            top = ', '.join(f'{teacher_by_id[t].full_name}={n}' for t, n in busiest)
            self.stdout.write(f'Top teacher weekly load: {top}')
        loads = [n for n in teacher_load.values()]
        if loads:
            self.stdout.write(f'Teachers used: {len(loads)} | avg load: {sum(loads)//len(loads)} '
                              f'| min: {min(loads)}')
        self.stdout.write(self.style.SUCCESS('Done.'))
