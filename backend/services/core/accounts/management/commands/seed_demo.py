"""Seed a complete, consistent demo school for presentations.

    python manage.py seed_sample_users --force   # admin/teacher/parent/student logins
    python manage.py seed_demo

Creates classes, subjects, teachers, a clash-free weekly timetable, ~120
students, fee invoices with real payments, 30 school days of attendance,
exams with results, homework, behaviour records and notifications. The demo
logins are wired in: teacher@code.com teaches Grade 8, student@code.com is a
Grade 8 student, and parent@code.com has two children.

Safe to re-run: it stops if demo students already exist (use --reset to
delete the demo students and their records first).
"""
import random
from datetime import date, timedelta
from decimal import Decimal

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

FIRST_M = ["Ali", "Ahmed", "Hamza", "Usman", "Bilal", "Hassan", "Zain", "Saad", "Omar", "Faizan",
           "Talha", "Hamid", "Imran", "Danish", "Rayyan", "Ibrahim", "Arham", "Moiz", "Shayan", "Taha"]
FIRST_F = ["Fatima", "Ayesha", "Zainab", "Maryam", "Hira", "Sana", "Iqra", "Amna", "Mahnoor", "Areeba",
           "Hafsa", "Laiba", "Noor", "Aleena", "Eman", "Khadija", "Anaya", "Rida", "Mehwish", "Zoya"]
LAST = ["Khan", "Ahmed", "Malik", "Qureshi", "Sheikh", "Butt", "Chaudhry", "Raza", "Hussain", "Siddiqui",
        "Mirza", "Abbasi", "Javed", "Iqbal", "Aslam", "Farooq", "Anwar", "Akhtar", "Rana", "Hashmi"]
CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad"]

CLASSES = [("Grade 5", "G05"), ("Grade 6", "G06"), ("Grade 7", "G07"),
           ("Grade 8", "G08"), ("Grade 9", "G09"), ("Grade 10", "G10")]
SUBJECTS = [("Mathematics", "MATH"), ("English", "ENG"), ("Urdu", "URD"),
            ("General Science", "SCI"), ("Computer Science", "CS"), ("Islamic Studies", "ISL")]
# One teacher per subject keeps the Latin-square timetable clash-free.
TEACHERS = [  # name, email, qualification, gender, monthly salary
    ("Ayesha Khan", "teacher@code.com", "M.Sc Mathematics", "female", 85000),   # demo teacher login
    ("Imran Qureshi", "imran.qureshi@school.edu", "M.A English", "male", 72000),
    ("Nadia Hussain", "nadia.hussain@school.edu", "M.A Urdu", "female", 68000),
    ("Kamran Malik", "kamran.malik@school.edu", "M.Sc Physics", "male", 78000),
    ("Sara Siddiqui", "sara.siddiqui@school.edu", "M.Sc Computer Science", "female", 80000),
    ("Abdul Rehman", "abdul.rehman@school.edu", "M.A Islamic Studies", "male", 65000),
]
# Class teacher per class code (the demo teacher is Grade 8's class teacher).
CLASS_TEACHER = {"G05": 1, "G06": 2, "G07": 3, "G08": 0, "G09": 4, "G10": 5}
MONTHLY_FEE = {"Grade 5": 6500, "Grade 6": 7000, "Grade 7": 7500, "Grade 8": 8000, "Grade 9": 9000, "Grade 10": 9500}
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"]
DEMO_PREFIX = "DS-"


def grade_for(pct):
    for cut, g in [(90, "A+"), (80, "A"), (75, "B+"), (70, "B"), (65, "C+"), (60, "C"), (50, "D")]:
        if pct >= cut:
            return g
    return "F"


DEMO_PASSWORDS = {
    "teacher@code.com": "Teacher@123",
    "parent@code.com": "Parent@123",
    "student@code.com": "Student@123",
}

DEMO_INSTITUTE = {
    "institute_name": "CodeCortex Model School",
    "name": "CodeCortex Model School",
    "tagline": "Excellence in learning since 2010",
    "motto": "Excellence in learning since 2010",
    "phone": "+92 42 3578 1100",
    "website": "https://codecortex.pk",
    "address": "12-B Main Boulevard, Gulberg III, Lahore",
    "country": "Pakistan",
}


class Command(BaseCommand):
    help = "Seed a complete demo school (classes, teachers, students, fees, attendance, exams)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing demo students first.")
        parser.add_argument("--students-per-class", type=int, default=20)

    def handle(self, *args, **opts):
        M = lambda app, name: apps.get_model(app, name)  # noqa: E731
        self.Student = M("education_students", "Student")
        if opts["reset"]:
            n = self.Student.all_objects.filter(student_id__startswith=DEMO_PREFIX).count() \
                if hasattr(self.Student, "all_objects") else 0
            qs = getattr(self.Student, "all_objects", self.Student.objects).filter(student_id__startswith=DEMO_PREFIX)
            for s in qs:
                s.hard_delete() if hasattr(s, "hard_delete") else s.delete()
            # Class-level demo records aren't removed with the students.
            M("education_exams", "Exam").objects.filter(exam_code__startswith="DEMO-EX-").delete()
            M("education_academics", "Homework").objects.filter(
                class_ref__code__in=[code for _, code in CLASSES]).delete()
            self.stdout.write(f"Removed {n} demo students and their class records.")
        elif self.Student.objects.filter(student_id__startswith=DEMO_PREFIX).exists():
            self.stdout.write(self.style.WARNING("Demo data already present. Use --reset to rebuild."))
            return

        rng = random.Random(2026)
        self.today = timezone.localdate()
        with transaction.atomic():
            structure = self._structure(M)
            students = self._students(M, structure, rng, opts["students_per_class"])
            self._link_demo_logins(M, structure, students)
        # Bulk records outside the big transaction keep SQLite responsive.
        self._fees(M, structure, students, rng)
        self._attendance(M, students, rng)
        self._exams(M, structure, students, rng)
        self._homework_behaviour(M, structure, students, rng)
        self._payroll(M, structure, rng)
        self._notifications(M)
        self.stdout.write(self.style.SUCCESS(
            f"Demo school ready: {len(students)} students, {len(structure['classes'])} classes, "
            f"{len(structure['teachers'])} teachers."))

    # ------------------------------------------------------------------ structure
    def _structure(self, M):
        AcademicYear, SchoolClass, Section = M("education_academics", "AcademicYear"), M("education_academics", "SchoolClass"), M("education_academics", "Section")
        Subject, ClassSubject, Teacher = M("education_academics", "Subject"), M("education_academics", "ClassSubject"), M("education_academics", "Teacher")
        Period, Classroom, TimetableEntry = M("education_academics", "Period"), M("education_academics", "Classroom"), M("education_academics", "TimetableEntry")
        TSA = M("education_academics", "TeacherSubjectAssignment")

        start = date(self.today.year if self.today.month >= 8 else self.today.year - 1, 8, 1)
        year, _ = AcademicYear.objects.get_or_create(
            name=f"{start.year}-{start.year + 1}",
            defaults={"start_date": start, "end_date": date(start.year + 1, 6, 30), "is_active": True})
        AcademicYear.objects.exclude(pk=year.pk).update(is_active=False)
        if not year.is_active:
            year.is_active = True
            year.save(update_fields=["is_active"])

        periods = []
        times = [("08:00", "08:40"), ("08:40", "09:20"), ("09:20", "10:00"), ("10:20", "11:00"), ("11:00", "11:40"), ("11:40", "12:20")]
        for i, (a, b) in enumerate(times, start=1):
            p, _ = Period.objects.get_or_create(academic_year=year, period_number=i, defaults={
                "name": f"Period {i}", "start_time": a, "end_time": b, "duration_minutes": 40,
                "is_break": False, "is_active": True})
            periods.append(p)

        classes, sections, rooms = [], {}, {}
        for idx, (name, code) in enumerate(CLASSES):
            sc, _ = SchoolClass.objects.get_or_create(code=code, defaults={"name": name})
            classes.append(sc)
            sections[sc.pk], _ = Section.objects.get_or_create(class_ref=sc, name="A", defaults={"capacity": 35})
            rooms[sc.pk], _ = Classroom.objects.get_or_create(code=f"RM-{101 + idx}", defaults={
                "name": f"Room {101 + idx}", "capacity": 35, "location": "Main Block", "category": "classroom"})

        subjects = [Subject.objects.get_or_create(code=c, defaults={"name": n})[0] for n, c in SUBJECTS]
        cs = {(sc.pk, sub.pk): ClassSubject.objects.get_or_create(class_ref=sc, subject=sub)[0]
              for sc in classes for sub in subjects}

        teachers = []
        for i, (name, email, qual, gender, salary) in enumerate(TEACHERS, start=1):
            t = Teacher.objects.filter(email=email).first()
            if t is None:
                t = Teacher.objects.create(
                    employee_id=f"EMP-{i:03d}", full_name=name, email=email, phone=f"0300{1000000 + i * 1111}",
                    qualifications=[qual], specializations=[SUBJECTS[i - 1][0]],
                    experience_years=4 + i, joining_date=date(2019 + i % 4, 3, 1), is_active=True)
            t.full_name, t.gender, t.monthly_salary = name, gender, Decimal(salary)
            t.education, t.department, t.role = qual, SUBJECTS[i - 1][0], "Teacher"
            t.save()
            teachers.append(t)

        # Latin square: at any period each class has a different subject, so
        # the single teacher of each subject is never double-booked.
        if not TimetableEntry.objects.filter(academic_year=year).exists():
            for c_idx, sc in enumerate(classes):
                for d_idx, day in enumerate(DAYS):
                    for p_idx, period in enumerate(periods):
                        s_idx = (c_idx + p_idx + d_idx) % len(subjects)
                        TimetableEntry.objects.create(
                            academic_year=year, class_subject=cs[(sc.pk, subjects[s_idx].pk)],
                            teacher=teachers[s_idx], classroom=rooms[sc.pk], day_of_week=day, period=period)
        for sc in classes:
            for s_idx, sub in enumerate(subjects):
                TSA.objects.get_or_create(teacher=teachers[s_idx], class_subject=cs[(sc.pk, sub.pk)], academic_year=year)
        # Class teachers (the teacher portal matches classes by this name).
        for sc in classes:
            sc.teacher_name = teachers[CLASS_TEACHER[sc.code]].full_name
            sc.save(update_fields=["teacher_name"])
        return {"year": year, "classes": classes, "sections": sections, "subjects": subjects,
                "teachers": teachers, "class_subjects": cs}

    # ------------------------------------------------------------------ students
    def _students(self, M, st, rng, per_class):
        students, n = [], 0
        for c_idx, sc in enumerate(st["classes"]):
            age = 10 + c_idx
            for i in range(per_class):
                n += 1
                female = i % 2 == 1
                first = (FIRST_F if female else FIRST_M)[(i // 2 + c_idx * 3) % 20]
                last = LAST[(i * 7 + c_idx) % 20]
                name = f"{first} {last}"
                demo = None
                if sc.code == "G08" and i == 0:
                    name, demo, female, last = "Ali Raza", "student", False, "Raza"
                if sc.code == "G06" and i == 1:
                    name, demo, female, last = "Fatima Raza", "sibling", True, "Raza"
                father = f"{rng.choice(FIRST_M)} {last}" if not demo else "Kashif Raza"
                email = "student@code.com" if demo == "student" else f"ds{n:03d}@students.school.edu"
                s = self.Student.objects.create(
                    student_id=f"{DEMO_PREFIX}{2026}{n:03d}", full_name=name, email=email,
                    gender="female" if female else "male",
                    date_of_birth=date(self.today.year - age, rng.randint(1, 12), rng.randint(1, 28)),
                    admission_date=date(self.today.year - rng.randint(0, 4), 4, 1),
                    phone=f"0301{2000000 + n * 137:07d}", father_name=father, guardian_name=father,
                    # The demo parent is linked by hand below; other families get auto-created parents.
                    guardian_phone="" if demo else f"0321{3000000 + n * 211:07d}",
                    city=rng.choice(CITIES), current_class=sc, current_section=st["sections"][sc.pk], is_active=True)
                s._demo = demo
                students.append(s)
        return students

    def _link_demo_logins(self, M, st, students):
        User = get_user_model()
        # Demo school (shown in portal headers) with the demo logins as members.
        School, Membership = M("core_tenants", "School"), M("core_tenants", "TenantMembership")
        school = School.objects.filter(tenant_code="DMS").first() or School.objects.create(
            tenant_code="DMS", school_id="DEMO-001", name="CodeCortex Model School", subdomain="demo")
        # Institute profile shown in Settings -> Profile, portal banners and the header.
        school.settings_json = {**(school.settings_json or {}), **DEMO_INSTITUTE}
        school.save(update_fields=["settings_json"])
        for email, role in (("admin@code.com", "admin"), ("teacher@code.com", "teacher"),
                            ("parent@code.com", "parent"), ("student@code.com", "student")):
            u = User.objects.filter(email=email).first()
            if u:
                Membership.objects.get_or_create(user=u, school=school, defaults={"role": role, "is_primary": True})
        TeacherProfile, ParentProfile = M("core_accounts", "TeacherProfile"), M("core_accounts", "ParentProfile")
        grade8 = next(c for c in st["classes"] if c.code == "G08")
        teacher_user = User.objects.filter(email="teacher@code.com").first()
        if teacher_user:
            tp, _ = TeacherProfile.objects.get_or_create(user=teacher_user, defaults={"employee_id": "EMP-DEMO"})
            tp.assigned_classes.add(grade8)
        parent_user = User.objects.filter(email="parent@code.com").first()
        if parent_user:
            parent_user.full_name = "Kashif Raza"
            parent_user.save(update_fields=["full_name"])
            pp, _ = ParentProfile.objects.get_or_create(user=parent_user, defaults={"relationship_type": "father"})
            pp.linked_students.add(*[s for s in students if s._demo in ("student", "sibling")])
        teacher_login = User.objects.filter(email="teacher@code.com").first()
        if teacher_login:
            teacher_login.full_name = TEACHERS[0][0]
            teacher_login.save(update_fields=["full_name"])
        student_user = User.objects.filter(email="student@code.com").first()
        if student_user:
            student_user.full_name = "Ali Raza"
            student_user.save(update_fields=["full_name"])
        # The demo logins keep their documented passwords; record them so the
        # admission / job offer letters print what actually works.
        from services.core.accounts.credentials import issue_credential
        for email, password in DEMO_PASSWORDS.items():
            u = User.objects.filter(email=email).first()
            if u:
                issue_credential(u, password)

    # ------------------------------------------------------------------ finance
    def _fees(self, M, st, students, rng):
        FeeStructure, Invoice, Payment = M("education_finance", "FeeStructure"), M("education_finance", "Invoice"), M("education_finance", "Payment")
        for sc in st["classes"]:
            FeeStructure.objects.get_or_create(class_ref=sc, fee_name="Monthly Tuition Fee", defaults={
                "amount": Decimal(MONTHLY_FEE[sc.name]), "due_date": self.today.replace(day=10)})
        months = [(self.today.replace(day=1) - timedelta(days=31 * k)).replace(day=1) for k in (2, 1, 0)]
        for s in students:
            fee = Decimal(MONTHLY_FEE[s.current_class.name])
            # ~12% chronic defaulters, ~15% partial payers, rest pay on time.
            profile = "default" if rng.random() < 0.12 else ("partial" if rng.random() < 0.17 else "good")
            if s._demo == "student":
                profile = "partial"
            for m_idx, month in enumerate(months):
                due = month.replace(day=10)
                inv = Invoice.objects.create(
                    student=s, amount=fee, due_date=due, issue_date=month, invoice_month=month,
                    description=f"Tuition fee {month.strftime('%B %Y')}", status="issued")
                current = m_idx == len(months) - 1
                if profile == "good" and (not current or rng.random() < 0.6):
                    self._pay(Payment, inv, fee, due - timedelta(days=rng.randint(0, 6)), rng)
                elif profile == "partial" and not current:
                    self._pay(Payment, inv, (fee * Decimal("0.5")).quantize(Decimal("1")), due + timedelta(days=5), rng)
                elif due < self.today:
                    Invoice.objects.filter(pk=inv.pk).update(status="overdue")

    @staticmethod
    def _pay(Payment, inv, amount, when, rng):
        Payment.objects.create(invoice=inv, amount=amount, payment_date=when,
                               payment_method=rng.choice(["cash", "bank_transfer", "online"]))

    # ------------------------------------------------------------------ attendance
    def _attendance(self, M, students, rng):
        AttendanceRecord = M("education_attendance", "AttendanceRecord")
        days, d = [], self.today
        while len(days) < 30:
            if d.weekday() < 5:
                days.append(d)
            d -= timedelta(days=1)
        rows = []
        for s in students:
            base = 0.72 if rng.random() < 0.1 else 0.94  # a few chronic absentees
            if s._demo == "student":
                base = 0.9
            for day in days:
                r = rng.random()
                status = "present" if r < base else ("late" if r < base + 0.03 else "absent")
                rows.append(AttendanceRecord(student=s, date=day, status=status))
        AttendanceRecord.objects.bulk_create(rows, batch_size=1000)

    # ------------------------------------------------------------------ exams
    def _exams(self, M, st, students, rng):
        Exam, ExamResult = M("education_exams", "Exam"), M("education_exams", "ExamResult")
        by_class = {}
        for s in students:
            by_class.setdefault(s.current_class_id, []).append(s)
        ability = {s.pk: rng.gauss(72, 12) for s in students}
        n = 0
        for sc in st["classes"]:
            for sub in st["subjects"]:
                for kind, total, offset in (("midterm", 100, -20), ("test", 25, 12)):
                    n += 1
                    exam_date = self.today + timedelta(days=offset)
                    exam = Exam.objects.create(
                        exam_code=f"DEMO-EX-{n:04d}", title=f"{'Mid-Term' if kind == 'midterm' else 'Unit Test'} - {sub.name}",
                        exam_type=kind, class_ref=sc, subject=sub, total_marks=total,
                        passing_marks=int(total * 0.4), exam_date=exam_date, is_published=offset < 0)
                    if offset > 0:
                        continue  # upcoming
                    results = []
                    for s in by_class.get(sc.pk, []):
                        pct = max(18, min(99, ability[s.pk] + rng.gauss(0, 8)))
                        results.append(ExamResult(
                            exam=exam, student=s, obtained_marks=Decimal(str(round(total * pct / 100, 1))),
                            percentage=Decimal(str(round(pct, 2))), grade=grade_for(pct)))
                    ExamResult.objects.bulk_create(results)

    # ------------------------------------------------------------------ homework / behaviour
    def _homework_behaviour(self, M, st, students, rng):
        Homework = M("education_academics", "Homework")
        BehaviourRating, Observation = M("behaviour", "BehaviourRating"), M("behaviour", "Observation")
        topics = {"Mathematics": "Fractions worksheet", "English": "Essay: My Hometown", "Urdu": "Mazmoon: Hamara Mulk",
                  "General Science": "Plant cell diagram", "Computer Science": "Scratch mini-game",
                  "Islamic Studies": "Surah Al-Asr translation"}
        for c_idx, sc in enumerate(st["classes"]):
            for s_idx, sub in enumerate(st["subjects"]):
                if (c_idx + s_idx) % 2:
                    continue
                t = st["teachers"][s_idx]
                Homework.objects.create(
                    academic_year=st["year"], class_ref=sc, teacher=t, class_name=sc.name, teacher_name=t.full_name,
                    subject_name=sub.name, title=topics[sub.name], description=f"Complete the {topics[sub.name].lower()}.",
                    homework_date=self.today - timedelta(days=2), due_date=self.today + timedelta(days=3))
        for s in students:
            teacher = st["teachers"][st["classes"].index(s.current_class) % len(st["teachers"])]
            BehaviourRating.objects.create(
                student=s, class_ref=s.current_class, teacher=teacher, domain="affective", term="first",
                academic_year=st["year"].name,
                ratings={k: rng.choice([3, 4, 4, 5]) for k in ("punctuality", "neatness", "politeness", "teamwork")},
                comments=rng.choice(["Consistent effort.", "Participates actively.", "Needs to focus in class.", "Helpful to classmates."]))
        for s in rng.sample(students, 6):
            Observation.objects.create(
                observation_type=rng.choice(["incident", "meeting", "counselling"]), student=s,
                class_ref=s.current_class, teacher=st["teachers"][0], title=rng.choice(
                    ["Late to class repeatedly", "Parent-teacher meeting", "Counselling on exam stress"]),
                date=self.today - timedelta(days=rng.randint(1, 20)), severity=rng.choice(["low", "medium"]))

    # ------------------------------------------------------------------ payroll & notifications
    def _payroll(self, M, st, rng):
        Payslip = M("education_finance", "Payslip")
        month = self.today.replace(day=1)
        prev = (month - timedelta(days=1)).replace(day=1)
        for t in st["teachers"]:
            basic = Decimal(t.monthly_salary or 70000)
            for m, paid in ((prev, True), (month, False)):
                Payslip.objects.get_or_create(employee=t, month=m, defaults={
                    "basic_salary": basic, "allowances": Decimal("5000"), "deductions": Decimal("2000"),
                    "net_salary": basic + 3000, "paid_amount": basic + 3000 if paid else 0,
                    "status": "paid" if paid else "pending", "payment_date": m + timedelta(days=4) if paid else None})

    def _notifications(self, M):
        Notification = M("user_notifications", "Notification")
        User = get_user_model()
        notes = [
            ("Parent-Teacher Meeting", "PTM is scheduled for Saturday 10:00 AM in the main hall.", "announcement"),
            ("Mid-Term Results Published", "Mid-term results are now available in the portal.", "exam"),
        ]
        for email in ("admin@code.com", "teacher@code.com", "parent@code.com", "student@code.com"):
            u = User.objects.filter(email=email).first()
            if u:
                for title, msg, kind in notes:
                    Notification.objects.get_or_create(recipient=u, title=title, defaults={"message": msg, "notification_type": kind})
