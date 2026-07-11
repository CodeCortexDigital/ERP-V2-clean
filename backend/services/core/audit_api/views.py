import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.apps import apps

# Teachers endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_teachers(request):
    try:
        Teacher = apps.get_model('education_academics', 'Teacher')
    except LookupError:
        Teacher = apps.get_model('education_teachers', 'Teacher')
    
    teachers = Teacher.objects.all()
    data = []
    for t in teachers:
        data.append({
            'id': str(t.id),
            'employee_id': getattr(t, 'employee_id', f'TCH-{t.id}'),
            'full_name': getattr(t, 'full_name', f'Teacher {t.id}'),
            'email': getattr(t, 'email', ''),
            'phone': getattr(t, 'phone', ''),
            'specializations': getattr(t, 'specializations', []),
            'experience_years': getattr(t, 'experience_years', 0),
            'is_active': getattr(t, 'is_active', True)
        })
    return Response({'results': data, 'count': len(data)})

# Sections endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_sections(request):
    Section = apps.get_model('education_academics', 'Section')
    sections = Section.objects.all()
    data = []
    for s in sections:
        data.append({
            'id': str(s.id),
            'name': s.name,
            'class_id': str(s.class_ref_id) if hasattr(s, 'class_ref_id') and s.class_ref_id else None,
            'class_name': s.class_ref.name if hasattr(s, 'class_ref') and s.class_ref else 'Class',
            'capacity': getattr(s, 'capacity', 40)
        })
    return Response({'results': data, 'count': len(data)})

# Subjects endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_subjects(request):
    Subject = apps.get_model('education_academics', 'Subject')
    subjects = Subject.objects.all()
    data = []
    for sb in subjects:
        data.append({
            'id': str(sb.id),
            'name': sb.name,
            'code': getattr(sb, 'code', f'SUB-{sb.id}'),
            'credits': getattr(sb, 'credits', 3)
        })
    return Response({'results': data, 'count': len(data)})

# Timetables endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_timetables(request):
    TimetableEntry = apps.get_model('education_academics', 'TimetableEntry')
    entries = TimetableEntry.objects.filter(is_active=True)
    data = []
    for e in entries:
        data.append({
            'id': str(e.id),
            'day_of_week': e.day_of_week,
            'period_name': e.period.name if e.period else 'Period',
            'class_name': e.class_subject.class_ref.name if e.class_subject and e.class_subject.class_ref else 'Class',
            'subject_name': e.class_subject.subject.name if e.class_subject and e.class_subject.subject else 'Subject',
            'teacher_name': e.teacher.full_name if e.teacher else 'Teacher'
        })
    return Response({'results': data, 'count': len(data)})

# Periods endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_periods(request):
    Period = apps.get_model('education_academics', 'Period')
    periods = Period.objects.filter(is_active=True).order_by('period_number')
    data = []
    for p in periods:
        data.append({
            'id': str(p.id),
            'period_number': p.period_number,
            'name': p.name,
            'start_time': p.start_time,
            'end_time': p.end_time,
            'is_break': p.is_break
        })
    return Response({'results': data, 'count': len(data)})

# Parents endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_parents(request):
    try:
        Parent = apps.get_model('education_parents', 'Parent')
        parents = Parent.objects.all()
        data = [{'id': str(p.id), 'full_name': getattr(p, 'full_name', str(p)), 'phone': getattr(p, 'phone', '')} for p in parents]
    except LookupError:
        data = []
    return Response({'results': data, 'count': len(data)})

# Admissions endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_admissions(request):
    try:
        Admission = apps.get_model('education_admissions', 'Admission')
        admissions = Admission.objects.all()
        data = [{'id': str(a.id), 'application_number': getattr(a, 'application_number', str(a.id)), 'status': getattr(a, 'status', 'submitted')} for a in admissions]
    except LookupError:
        data = []
    return Response({'results': data, 'count': len(data)})

# Staff endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_staff(request):
    Teacher = apps.get_model('education_academics', 'Teacher')
    staff_members = Teacher.objects.filter(is_active=True)
    data = [{'id': str(s.id), 'full_name': s.full_name, 'employee_id': s.employee_id, 'role': 'Teacher'} for s in staff_members]
    return Response({'results': data, 'count': len(data)})

# Dashboard stats endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_dashboard_stats(request):
    Student = apps.get_model('education_students', 'Student')
    Teacher = apps.get_model('education_academics', 'Teacher')
    SchoolClass = apps.get_model('education_academics', 'SchoolClass')
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    
    stats = {
        'total_students': Student.objects.filter(is_active=True).count(),
        'total_teachers': Teacher.objects.filter(is_active=True).count(),
        'total_classes': SchoolClass.objects.count(),
        'attendance_today': AttendanceRecord.objects.filter(status='present').count(),
        'active_academic_year': '2025-2026'
    }
    return Response(stats)

# Profile endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_profile(request):
    user = request.user
    if user.is_authenticated:
        return Response({
            'id': getattr(user, 'id', 'user-1'),
            'email': getattr(user, 'email', 'admin@school.com'),
            'username': getattr(user, 'username', 'admin'),
            'full_name': getattr(user, 'full_name', 'System Admin'),
            'role': getattr(user, 'role', 'admin'),
            'is_superuser': getattr(user, 'is_superuser', True),
            'is_staff': getattr(user, 'is_staff', True)
        })
    return Response({
        'id': 'user-admin',
        'email': 'admin@school.com',
        'username': 'admin',
        'full_name': 'Administrator',
        'role': 'admin',
        'is_superuser': True,
        'is_staff': True
    })

# Attendance with parameters endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def get_attendance_data(request):
    AttendanceRecord = apps.get_model('education_attendance', 'AttendanceRecord')
    
    student_id = request.GET.get('student_id')
    date_param = request.GET.get('date')
    
    queryset = AttendanceRecord.objects.all()
    if student_id:
        queryset = queryset.filter(student_id=student_id)
    if date_param:
        queryset = queryset.filter(date=date_param)
        
    queryset = queryset[:200]
    data = [{'id': str(a.id), 'student': str(a.student_id), 'date': str(a.date), 'status': a.status} for a in queryset]
    return Response({'results': data, 'count': len(data)})
