"""What each import accepts (P10): columns, checks, duplicates, and how a row becomes a record.

Every kind has the same shape:
- ``columns``: (key, label, required, aliases) — headers are matched case-insensitively, ignoring spaces and punctuation;
- ``check(row, ctx)``: returns (clean_values, errors, duplicate_note, note);
- ``create(clean, ctx)``: saves one row (called inside a transaction, only for rows without errors).
"""
from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.apps import apps
from django.utils import timezone


def norm(text) -> str:
    return re.sub(r'[^a-z0-9]', '', str(text or '').lower())


def text(v) -> str:
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def parse_date(v):
    """Dates as 2026-09-26, 26/09/2026 or an Excel date. Returns (date|None, error|None)."""
    if v in (None, ''):
        return None, None
    if isinstance(v, datetime):
        return v.date(), None
    if isinstance(v, date):
        return v, None
    s = text(v)
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(s, fmt).date(), None
        except ValueError:
            pass
    return None, f'"{s}" is not a date (use 2026-09-26 or 26/09/2026)'


def parse_money(v, field):
    if v in (None, ''):
        return None, None
    s = re.sub(r'[,\s]', '', text(v)).lstrip('$£€₹Rs.').strip()
    try:
        d = Decimal(s)
    except (InvalidOperation, ValueError):
        return None, f'{field}: "{text(v)}" is not an amount'
    if d < 0:
        return None, f'{field} cannot be negative'
    return d, None


def parse_gender(v):
    s = norm(v)
    if not s:
        return '', None
    for key, words in (('male', ('m', 'male', 'boy')), ('female', ('f', 'female', 'girl')), ('other', ('o', 'other'))):
        if s in words:
            return key, None
    return '', f'gender "{text(v)}" should be Male, Female or Other'


def parse_bool(v):
    return norm(v) in ('yes', 'y', 'true', '1', 'x')


def email_ok(v):
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', v))


def next_code(existing, prefix, width=3):
    """The next free code like EMP-007 after the highest existing number with that prefix."""
    best = 0
    for code in existing:
        m = re.match(re.escape(prefix) + r'(\d+)$', code or '')
        if m:
            best = max(best, int(m.group(1)))
    return best + 1


# ---- Students ---------------------------------------------------------------------------------------------------

def _student_ctx(ctx):
    Student = apps.get_model('education_students', 'Student')
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    Section = apps.get_model('education_academics', 'Section')
    if 'classes' not in ctx:
        ctx['classes'] = {norm(c.name): c for c in SchoolClass.objects.all()}
        ctx['sections'] = {(s.class_ref_id, norm(s.name)): s for s in Section.objects.all()}
        ctx['student_ids'] = set(Student.all_objects.values_list('student_id', flat=True))
        ctx['people'] = {(norm(n), dob): sid for n, dob, sid in Student.objects.values_list('full_name', 'date_of_birth', 'student_id')}
        ctx['seen_ids'], ctx['seen_people'] = set(), set()
        # New numbers follow the school's latest registration number (e.g. DS-2026120 -> DS-2026121).
        latest = Student.objects.order_by('-created_at').values_list('student_id', flat=True).first() if hasattr(Student, 'created_at') else None
        latest = latest or Student.objects.order_by('-student_id').values_list('student_id', flat=True).first() or 'STU-000'
        m = re.match(r'^(.*?)(\d+)$', latest)
        ctx['id_prefix'], ctx['id_width'] = (m.group(1), len(m.group(2))) if m else ('STU-', 3)
        ctx['next_id'] = next_code(ctx['student_ids'], ctx['id_prefix'])
    return ctx


def check_student(row, ctx):
    ctx = _student_ctx(ctx)
    errors, clean, note = [], {}, ''
    clean['full_name'] = text(row.get('full_name'))
    if not clean['full_name']:
        errors.append('Name is missing')
    cls_name = text(row.get('class'))
    cls = ctx['classes'].get(norm(cls_name))
    if not cls_name:
        errors.append('Class is missing')
    elif cls is None:
        errors.append(f'Class "{cls_name}" does not exist (import classes first, or check the spelling)')
    clean['current_class'] = cls
    sec_name = text(row.get('section'))
    clean['current_section'] = None
    if sec_name and cls is not None:
        sec = ctx['sections'].get((cls.pk, norm(sec_name)))
        if sec is None:
            errors.append(f'Section "{sec_name}" does not exist in {cls.name}')
        clean['current_section'] = sec
    clean['gender'], e = parse_gender(row.get('gender'))
    if e:
        errors.append(e)
    for key, label in (('date_of_birth', 'Date of birth'), ('admission_date', 'Admission date')):
        clean[key], e = parse_date(row.get(key))
        if e:
            errors.append(f'{label}: {e}')
    clean['admission_date'] = clean['admission_date'] or timezone.localdate()
    clean['email'] = text(row.get('email')).lower()
    if clean['email'] and not email_ok(clean['email']):
        errors.append(f'Email "{clean["email"]}" is not valid')
    for key in ('phone', 'father_name', 'mother_name', 'guardian_name', 'guardian_phone', 'address', 'city', 'religion',
                'blood_group', 'birth_form_id', 'previous_school'):
        clean[key] = text(row.get(key))
    sid = text(row.get('student_id'))
    duplicate = ''
    if sid:
        if sid in ctx['student_ids']:
            duplicate = f'Student number {sid} already exists'
        elif sid in ctx['seen_ids']:
            errors.append(f'Student number {sid} appears twice in the file')
    person = (norm(clean['full_name']), clean['date_of_birth'])
    if not duplicate and clean['date_of_birth'] and person in ctx['people']:
        duplicate = f'{clean["full_name"]} (born {clean["date_of_birth"]}) already exists as {ctx["people"][person]}'
    if clean['full_name'] and clean['date_of_birth'] and person in ctx['seen_people']:
        errors.append('The same name and date of birth appear twice in the file')
    ctx['seen_people'].add(person)
    if not sid and not errors and not duplicate:
        sid = f"{ctx['id_prefix']}{str(ctx['next_id']).zfill(ctx['id_width'])}"
        ctx['next_id'] += 1
        note = f'Gets student number {sid}'
    clean['student_id'] = sid
    if sid:
        ctx['seen_ids'].add(sid)
    return clean, errors, duplicate, note


def create_student(clean, ctx):
    Student = apps.get_model('education_students', 'Student')
    tenant = ctx['school']
    return Student.objects.create(tenant=tenant, **clean)


# ---- Staff ------------------------------------------------------------------------------------------------------

def check_staff(row, ctx):
    Teacher = apps.get_model('education_academics', 'Teacher')
    if 'staff_emails' not in ctx:
        ctx['staff_emails'] = {e.lower() for e in Teacher._base_manager.values_list('email', flat=True)}  # unique across schools
        ctx['staff_ids'] = set(Teacher.objects.values_list('employee_id', flat=True))
        ctx['next_emp'] = next_code(ctx['staff_ids'], 'EMP-')
        ctx['seen_emails'], ctx['seen_emp'] = set(), set()
    errors, clean, note, duplicate = [], {}, '', ''
    clean['full_name'] = text(row.get('full_name'))
    if not clean['full_name']:
        errors.append('Name is missing')
    clean['email'] = text(row.get('email')).lower()
    if not clean['email']:
        errors.append('Email is missing (staff sign in with it)')
    elif not email_ok(clean['email']):
        errors.append(f'Email "{clean["email"]}" is not valid')
    elif clean['email'] in ctx['staff_emails']:
        duplicate = f'A staff member with {clean["email"]} already exists'
    elif clean['email'] in ctx['seen_emails']:
        errors.append(f'{clean["email"]} appears twice in the file')
    ctx['seen_emails'].add(clean['email'])
    emp = text(row.get('employee_id'))
    if emp and emp in ctx['staff_ids'] and not duplicate:
        duplicate = f'Employee number {emp} already exists'
    elif emp and emp in ctx['seen_emp']:
        errors.append(f'Employee number {emp} appears twice in the file')
    clean['joining_date'], e = parse_date(row.get('joining_date'))
    if e:
        errors.append(f'Joining date: {e}')
    clean['joining_date'] = clean['joining_date'] or timezone.localdate()
    clean['date_of_birth'], e = parse_date(row.get('date_of_birth'))
    if e:
        errors.append(f'Date of birth: {e}')
    clean['gender'], e = parse_gender(row.get('gender'))
    if e:
        errors.append(e)
    clean['monthly_salary'], e = parse_money(row.get('monthly_salary'), 'Salary')
    if e:
        errors.append(e)
    for key in ('phone', 'role', 'department', 'national_id', 'home_address'):
        clean[key] = text(row.get(key))
    clean['qualifications'] = [q.strip() for q in text(row.get('qualifications')).split(',') if q.strip()]
    clean['specializations'] = [q.strip() for q in text(row.get('subjects')).split(',') if q.strip()]
    if not emp and not errors and not duplicate:
        emp = f'EMP-{str(ctx["next_emp"]).zfill(3)}'
        ctx['next_emp'] += 1
        note = f'Gets employee number {emp}'
    clean['employee_id'] = emp
    if emp:
        ctx['seen_emp'].add(emp)
    return clean, errors, duplicate, note


def create_staff(clean, ctx):
    Teacher = apps.get_model('education_academics', 'Teacher')
    return Teacher.objects.create(tenant=ctx['school'], **clean)


# ---- Classes and sections ---------------------------------------------------------------------------------------

def check_class(row, ctx):
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    Section = apps.get_model('education_academics', 'Section')
    if 'class_by_name' not in ctx:
        ctx['class_by_name'] = {norm(c.name): c for c in SchoolClass.objects.all()}
        ctx['class_sections'] = {}
        for s in Section.objects.all():
            ctx['class_sections'].setdefault(s.class_ref_id, set()).add(norm(s.name))
        ctx['seen_classes'] = set()
    errors, clean, note, duplicate = [], {}, '', ''
    clean['name'] = text(row.get('name'))
    if not clean['name']:
        errors.append('Class name is missing')
    elif norm(clean['name']) in ctx['seen_classes']:
        errors.append(f'{clean["name"]} appears twice in the file')
    ctx['seen_classes'].add(norm(clean['name']))
    clean['code'] = text(row.get('code')) or re.sub(r'[^A-Z0-9]', '', clean['name'].upper())[:12] or 'CLS'
    grade = text(row.get('grade_level'))
    clean['grade_level'] = None
    if grade:
        if grade.isdigit():
            clean['grade_level'] = int(grade)
        else:
            errors.append(f'Grade level "{grade}" should be a number')
    cap = text(row.get('capacity'))
    clean['max_students'] = int(cap) if cap.isdigit() else 30
    if cap and not cap.isdigit():
        errors.append(f'Capacity "{cap}" should be a number')
    fee, e = parse_money(row.get('tuition_fee'), 'Tuition fee')
    if e:
        errors.append(e)
    clean['tuition_fee'] = fee if fee is not None else Decimal('0')
    clean['sections'] = [s.strip() for s in re.split(r'[,;/]', text(row.get('sections'))) if s.strip()]
    existing = ctx['class_by_name'].get(norm(clean['name']))
    clean['existing'] = existing
    if existing is not None:
        have = ctx['class_sections'].get(existing.pk, set())
        new = [s for s in clean['sections'] if norm(s) not in have]
        clean['sections'] = new
        if new:
            note = f'{existing.name} already exists; adds section{"s" if len(new) > 1 else ""} {", ".join(new)}'
        else:
            duplicate = f'{existing.name} already exists'
    elif clean['sections']:
        note = f'With section{"s" if len(clean["sections"]) > 1 else ""} {", ".join(clean["sections"])}'
    return clean, errors, duplicate, note


def create_class(clean, ctx):
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    Section = apps.get_model('education_academics', 'Section')
    cls = clean['existing'] or SchoolClass.objects.create(
        tenant=ctx['school'], name=clean['name'], code=clean['code'], grade_level=clean['grade_level'],
        max_students=clean['max_students'], tuition_fee=clean['tuition_fee'])
    for s in clean['sections']:
        Section.objects.create(tenant=ctx['school'], class_ref=cls, name=s)
    return cls


# ---- Subjects ---------------------------------------------------------------------------------------------------

def check_subject(row, ctx):
    Subject = apps.get_model('education_academics', 'Subject')
    if 'subject_names' not in ctx:
        ctx['subject_names'] = {norm(n) for n in Subject.objects.values_list('name', flat=True)}
        ctx['subject_codes'] = {norm(c) for c in Subject.objects.values_list('code', flat=True)}
        ctx['seen_subjects'] = set()
    errors, clean, duplicate = [], {}, ''
    clean['name'] = text(row.get('name'))
    if not clean['name']:
        errors.append('Subject name is missing')
    clean['code'] = text(row.get('code')) or re.sub(r'[^A-Z0-9]', '', clean['name'].upper())[:6]
    if norm(clean['name']) in ctx['subject_names']:
        duplicate = f'{clean["name"]} already exists'
    elif text(row.get('code')) and norm(clean['code']) in ctx['subject_codes']:
        duplicate = f'Subject code {clean["code"]} already exists'
    elif norm(clean['name']) in ctx['seen_subjects']:
        errors.append(f'{clean["name"]} appears twice in the file')
    ctx['seen_subjects'].add(norm(clean['name']))
    clean['department'] = text(row.get('department'))
    clean['is_elective'] = parse_bool(row.get('elective'))
    return clean, errors, duplicate, ''


def create_subject(clean, ctx):
    Subject = apps.get_model('education_academics', 'Subject')
    return Subject.objects.create(tenant=ctx['school'], **clean)


# ---- Opening fee balances ---------------------------------------------------------------------------------------

OPENING = 'Opening balance'


def check_balance(row, ctx):
    Student = apps.get_model('education_students', 'Student')
    Invoice = apps.get_model('education_finance', 'Invoice')
    if 'students_by_id' not in ctx:
        ctx['students_by_id'] = {s.student_id: s for s in Student.objects.all()}
        ctx['with_opening'] = set(Invoice.objects.filter(description__startswith=OPENING).values_list('student_id', flat=True))
        ctx['seen_balance'] = set()
    errors, clean, duplicate = [], {}, ''
    sid = text(row.get('student_id'))
    student = ctx['students_by_id'].get(sid)
    if not sid:
        errors.append('Student number is missing')
    elif student is None:
        errors.append(f'No student with number {sid}')
    clean['student'] = student
    clean['amount'], e = parse_money(row.get('amount'), 'Amount')
    if e:
        errors.append(e)
    elif clean['amount'] is None or clean['amount'] == 0:
        errors.append('Amount is missing')
    clean['due_date'], e = parse_date(row.get('due_date'))
    if e:
        errors.append(f'Due date: {e}')
    clean['due_date'] = clean['due_date'] or timezone.localdate()
    detail = text(row.get('description'))
    clean['description'] = f'{OPENING}: {detail}' if detail else f'{OPENING} brought forward'
    if student is not None:
        if student.pk in ctx['with_opening']:
            duplicate = f'{student.full_name} already has an opening balance'
        elif student.pk in ctx['seen_balance']:
            errors.append(f'{sid} appears twice in the file')
        ctx['seen_balance'].add(student.pk)
    note = f'{student.full_name}' if student is not None else ''
    return clean, errors, duplicate, note


def create_balance(clean, ctx):
    Invoice = apps.get_model('education_finance', 'Invoice')
    return Invoice.objects.create(student=clean['student'], amount=clean['amount'], due_date=clean['due_date'],
                                  issue_date=timezone.localdate(), description=clean['description'],
                                  invoice_type='miscellaneous', status='issued')


KINDS = {
    'classes': {
        'label': 'Classes and sections', 'order': 1,
        'help': 'One row per class. List its sections separated by commas (A, B, C).',
        'columns': [('name', 'Class', True, ['classname', 'grade', 'class']), ('sections', 'Sections', False, ['section']),
                    ('grade_level', 'Grade level', False, ['level', 'year']), ('capacity', 'Capacity', False, ['maxstudents', 'seats']),
                    ('tuition_fee', 'Tuition fee', False, ['fee', 'monthlyfee']), ('code', 'Code', False, [])],
        'example': [['Grade 1', 'A, B', '1', '30', '2500', ''], ['Grade 2', 'A', '2', '30', '2600', '']],
        'check': check_class, 'create': create_class,
    },
    'subjects': {
        'label': 'Subjects', 'order': 2,
        'help': 'One row per subject.',
        'columns': [('name', 'Subject', True, ['subjectname']), ('code', 'Code', False, ['subjectcode']),
                    ('department', 'Department', False, []), ('elective', 'Elective (yes/no)', False, ['optional', 'elective'])],
        'example': [['Mathematics', 'MATH', 'Science', 'no'], ['Art', 'ART', 'Arts', 'yes']],
        'check': check_subject, 'create': create_subject,
    },
    'staff': {
        'label': 'Teachers and staff', 'order': 3,
        'help': 'One row per person. Email is required: it becomes their sign-in. Leave the employee number empty to have one made.',
        'columns': [('full_name', 'Name', True, ['name', 'fullname', 'teachername']), ('email', 'Email', True, ['emailaddress']),
                    ('phone', 'Phone', False, ['mobile', 'phonenumber']), ('employee_id', 'Employee number', False, ['employeeid', 'empid', 'staffid']),
                    ('role', 'Role', False, ['designation', 'position', 'jobtitle']), ('department', 'Department', False, []),
                    ('subjects', 'Subjects', False, ['specializations', 'teaches']), ('joining_date', 'Joining date', False, ['joined', 'startdate']),
                    ('gender', 'Gender', False, ['sex']), ('date_of_birth', 'Date of birth', False, ['dob', 'birthdate']),
                    ('monthly_salary', 'Monthly salary', False, ['salary']), ('qualifications', 'Qualifications', False, ['qualification', 'degree']),
                    ('national_id', 'National ID', False, ['cnic', 'nationalid', 'idnumber']), ('home_address', 'Address', False, ['address'])],
        'example': [['Sara Ahmed', 'sara@school.edu', '0300 1234567', '', 'Teacher', 'Science', 'Physics, Maths', '2026-08-01', 'Female', '', '60000', 'MSc Physics', '', '']],
        'check': check_staff, 'create': create_staff,
    },
    'students': {
        'label': 'Students and guardians', 'order': 4,
        'help': 'One row per student. The class (and section) must exist. Leave the student number empty to continue your numbering. '
                "Guardians' details create the family and the parent's portal login, as on the admission form.",
        'columns': [('full_name', 'Name', True, ['name', 'studentname', 'fullname']), ('class', 'Class', True, ['classname', 'grade']),
                    ('section', 'Section', False, []), ('student_id', 'Student number', False, ['studentid', 'rollno', 'registrationno', 'admissionno', 'grno']),
                    ('gender', 'Gender', False, ['sex']), ('date_of_birth', 'Date of birth', False, ['dob', 'birthdate']),
                    ('admission_date', 'Admission date', False, ['admitted', 'joiningdate']), ('email', 'Student email', False, ['email']),
                    ('phone', 'Student phone', False, ['phone', 'mobile']), ('father_name', 'Father name', False, ['father', 'fathersname']),
                    ('mother_name', 'Mother name', False, ['mother', 'mothersname']), ('guardian_name', 'Guardian name', False, ['guardian']),
                    ('guardian_phone', 'Guardian phone', False, ['parentphone', 'fatherphone', 'fathermobile', 'contact']),
                    ('address', 'Address', False, ['homeaddress']), ('city', 'City', False, ['town']), ('religion', 'Religion', False, []),
                    ('blood_group', 'Blood group', False, ['bloodgroup']), ('birth_form_id', 'Birth certificate / B-Form', False, ['bform', 'birthcertificate']),
                    ('previous_school', 'Previous school', False, [])],
        'example': [['Ali Raza', 'Grade 1', 'A', '', 'Male', '2019-04-12', '', '', '', 'Raza Khan', 'Amna Raza', '', '0300 7654321', '12 Park Road', 'Lahore', '', '', '', '']],
        'check': check_student, 'create': create_student,
    },
    'balances': {
        'label': 'Opening fee balances', 'order': 5,
        'help': 'What each family still owes from before. One row per student; import students first.',
        'columns': [('student_id', 'Student number', True, ['studentid', 'rollno', 'registrationno', 'admissionno']),
                    ('amount', 'Amount owed', True, ['amount', 'balance', 'due', 'arrears']),
                    ('due_date', 'Due date', False, ['duedate']), ('description', 'Note', False, ['description', 'details'])],
        'example': [['DS-2026001', '4500', '2026-10-10', 'Fees Jan–Aug 2026']],
        'check': check_balance, 'create': create_balance,
    },
}
