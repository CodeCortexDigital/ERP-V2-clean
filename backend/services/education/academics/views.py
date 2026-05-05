from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.apps import apps
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from datetime import datetime

# ============================================================
# ACADEMIC YEAR MANAGEMENT
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def academic_years(request):
    """Get all academic years"""
    try:
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        years = AcademicYear.objects.all().order_by('-start_date')
        data = [{
            'id': str(y.id),
            'name': y.name,
            'start_date': y.start_date.isoformat(),
            'end_date': y.end_date.isoformat(),
            'is_current': y.is_current,
            'is_active': y.is_active
        } for y in years]
        return Response(data, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_academic_year(request):
    """Create new academic year"""
    try:
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        data = request.data
        if data.get('is_current'):
            AcademicYear.objects.filter(is_current=True).update(is_current=False)
        year = AcademicYear.objects.create(
            name=data['name'],
            start_date=data['start_date'],
            end_date=data['end_date'],
            is_current=data.get('is_current', False),
            is_active=True
        )
        return Response({'id': str(year.id), 'message': 'Academic year created'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_academic_year(request, year_id):
    """Update academic year"""
    try:
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        year = AcademicYear.objects.get(id=year_id)
        if request.data.get('is_current'):
            AcademicYear.objects.filter(is_current=True).update(is_current=False)
        for field in ['name', 'start_date', 'end_date', 'is_current', 'is_active']:
            if field in request.data:
                setattr(year, field, request.data[field])
        year.save()
        return Response({'message': 'Academic year updated'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ============================================================
# CLASS MANAGEMENT
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_list(request):
    """Get all classes"""
    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        classes = SchoolClass.objects.all().order_by('name')
        data = [{
            'id': str(c.id),
            'name': c.name,
            'code': c.code,
            'capacity': c.capacity,
            'teacher_name': c.teacher_name,
            'teacher_email': c.teacher_email,
            'academic_year_id': str(c.academic_year.id) if c.academic_year else None,
            'academic_year_name': c.academic_year.name if c.academic_year else None,
            'sections_count': c.sections.count(),
            'students_count': c.students.count(),
            'is_active': c.is_active
        } for c in classes]
        return Response(data, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_class(request):
    """Create new class"""
    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        data = request.data
        academic_year = None
        if data.get('academic_year_id'):
            academic_year = AcademicYear.objects.get(id=data['academic_year_id'])
        school_class = SchoolClass.objects.create(
            name=data['name'],
            code=data['code'],
            capacity=data.get('capacity', 30),
            teacher_name=data.get('teacher_name', ''),
            teacher_email=data.get('teacher_email', ''),
            academic_year=academic_year,
            is_active=True
        )
        return Response({'id': str(school_class.id), 'message': 'Class created'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ============================================================
# SECTION MANAGEMENT
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sections_by_class(request, class_id):
    """Get sections for a class"""
    try:
        Section = apps.get_model('education_academics', 'Section')
        sections = Section.objects.filter(class_ref_id=class_id).order_by('name')
        data = [{
            'id': str(s.id),
            'name': s.name,
            'code': s.code,
            'capacity': s.capacity,
            'students_count': s.students.count(),
            'is_active': s.is_active
        } for s in sections]
        return Response(data, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_section(request):
    """Create new section"""
    try:
        Section = apps.get_model('education_academics', 'Section')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        data = request.data
        school_class = SchoolClass.objects.get(id=data['class_id'])
        section = Section.objects.create(
            class_ref=school_class,
            name=data['name'],
            code=data['code'],
            capacity=data.get('capacity', 15),
            is_active=True
        )
        return Response({'id': str(section.id), 'message': 'Section created'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ============================================================
# COURSE MANAGEMENT
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def courses(request):
    """Get all courses"""
    try:
        Course = apps.get_model('education_academics', 'Course')
        courses = Course.objects.filter(is_active=True).order_by('code')
        data = [{
            'id': str(c.id),
            'code': c.code,
            'name': c.name,
            'credits': c.credits,
            'level': c.level,
            'description': c.description,
            'is_active': c.is_active
        } for c in courses]
        return Response(data, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_course(request):
    """Create new course"""
    try:
        Course = apps.get_model('education_academics', 'Course')
        data = request.data
        course = Course.objects.create(
            code=data['code'],
            name=data['name'],
            credits=data.get('credits', 3),
            level=data.get('level', ''),
            description=data.get('description', ''),
            is_active=True
        )
        return Response({'id': str(course.id), 'message': 'Course created'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


# ============================================================
# HIERARCHY
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def academic_hierarchy(request):
    """Get complete academic hierarchy"""
    try:
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Section = apps.get_model('education_academics', 'Section')
        data = []
        for year in AcademicYear.objects.filter(is_active=True).order_by('-start_date'):
            year_data = {'id': str(year.id), 'name': year.name, 'is_current': year.is_current, 'classes': []}
            for school_class in SchoolClass.objects.filter(academic_year=year, is_active=True).order_by('name'):
                class_data = {'id': str(school_class.id), 'name': school_class.name, 'code': school_class.code, 'sections': []}
                for section in Section.objects.filter(class_ref=school_class, is_active=True).order_by('name'):
                    class_data['sections'].append({'id': str(section.id), 'name': section.name, 'code': section.code})
                year_data['classes'].append(class_data)
            data.append(year_data)
        return Response(data, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ============================================================
# ADVANCED FEATURES (New)
# ============================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def academic_dashboard(request):
    """Get academics dashboard with analytics"""
    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Section = apps.get_model('education_academics', 'Section')
        Course = apps.get_model('education_academics', 'Course')
        Student = apps.get_model('education_students', 'Student')
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        
        current_year = AcademicYear.objects.filter(is_current=True, is_active=True).first()
        total_classes = SchoolClass.objects.filter(is_active=True).count()
        total_sections = Section.objects.filter(is_active=True).count()
        total_courses = Course.objects.filter(is_active=True).count()
        total_students = Student.objects.filter(is_active=True).count()
        total_capacity = SchoolClass.objects.aggregate(total=Sum('capacity'))['total'] or 0
        
        class_utilization = []
        for cls in SchoolClass.objects.filter(is_active=True)[:5]:
            student_count = cls.students.count()
            utilization = round((student_count / cls.capacity) * 100, 1) if cls.capacity > 0 else 0
            class_utilization.append({
                'id': str(cls.id), 'name': cls.name, 'students': student_count,
                'capacity': cls.capacity, 'utilization': utilization,
                'status': 'critical' if utilization < 40 else 'warning' if utilization < 70 else 'good'
            })
        
        unassigned_students = Student.objects.filter(current_class__isnull=True).count()
        
        return Response({
            'summary': {
                'total_classes': total_classes, 'total_sections': total_sections,
                'total_courses': total_courses, 'total_students': total_students,
                'total_capacity': total_capacity,
                'enrollment_rate': round((total_students / total_capacity * 100), 1) if total_capacity > 0 else 0,
                'unassigned_students': unassigned_students, 'current_year': current_year.name if current_year else None
            }, 'class_utilization': class_utilization
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_subjects(request, class_id):
    """Get or assign subjects to a class"""
    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        ClassSubject = apps.get_model('education_academics', 'ClassSubject')
        Course = apps.get_model('education_academics', 'Course')
        school_class = get_object_or_404(SchoolClass, id=class_id)
        
        if request.method == 'GET':
            assigned = ClassSubject.objects.filter(school_class=school_class).select_related('course')
            data = [{'id': str(cs.id), 'course_id': str(cs.course.id), 'course_name': cs.course.name,
                     'course_code': cs.course.code, 'teacher_name': cs.teacher_name, 'teacher_email': cs.teacher_email,
                     'is_core': cs.is_core, 'exam_weightage': cs.exam_weightage} for cs in assigned]
            return Response(data, status=200)
        
        elif request.method == 'POST':
            subject_ids = request.data.get('subject_ids', [])
            for subject_id in subject_ids:
                course = Course.objects.get(id=subject_id)
                ClassSubject.objects.get_or_create(school_class=school_class, course=course)
            return Response({'message': 'Subjects assigned'}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_teacher(request):
    """Bulk assign teacher to multiple classes"""
    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        class_ids = request.data.get('class_ids', [])
        teacher_name = request.data.get('teacher_name')
        teacher_email = request.data.get('teacher_email')
        updated = SchoolClass.objects.filter(id__in=class_ids).update(teacher_name=teacher_name, teacher_email=teacher_email)
        return Response({'message': f'Teacher assigned to {updated} classes'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign_subjects(request):
    """Bulk assign subjects to multiple classes"""
    try:
        ClassSubject = apps.get_model('education_academics', 'ClassSubject')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Course = apps.get_model('education_academics', 'Course')
        class_ids = request.data.get('class_ids', [])
        subject_ids = request.data.get('subject_ids', [])
        classes = SchoolClass.objects.filter(id__in=class_ids)
        subjects = Course.objects.filter(id__in=subject_ids)
        count = 0
        for school_class in classes:
            for subject in subjects:
                _, created = ClassSubject.objects.get_or_create(school_class=school_class, course=subject)
                if created: count += 1
        return Response({'message': f'{count} subject assignments created'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_students(request):
    """Promote students to next class/year"""
    try:
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Student = apps.get_model('education_students', 'Student')
        from_class_id = request.data.get('from_class_id')
        to_class_id = request.data.get('to_class_id')
        from_class = SchoolClass.objects.get(id=from_class_id)
        to_class = SchoolClass.objects.get(id=to_class_id)
        students = Student.objects.filter(current_class=from_class)
        count = students.update(current_class=to_class)
        return Response({'message': f'{count} students promoted from {from_class.name} to {to_class.name}'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clone_academic_year(request):
    """Clone entire academic year structure"""
    try:
        AcademicYear = apps.get_model('education_academics', 'AcademicYear')
        SchoolClass = apps.get_model('education_academics', 'SchoolClass')
        Section = apps.get_model('education_academics', 'Section')
        from_year_id = request.data.get('from_year_id')
        new_year_name = request.data.get('new_year_name')
        from_year = AcademicYear.objects.get(id=from_year_id)
        new_year = AcademicYear.objects.create(name=new_year_name, start_date=from_year.start_date, end_date=from_year.end_date, is_current=False, is_active=True)
        for old_class in SchoolClass.objects.filter(academic_year=from_year):
            new_class = SchoolClass.objects.create(name=old_class.name, code=old_class.code, capacity=old_class.capacity, teacher_name=old_class.teacher_name, teacher_email=old_class.teacher_email, academic_year=new_year, is_active=True)
            for old_section in Section.objects.filter(class_ref=old_class):
                Section.objects.create(class_ref=new_class, name=old_section.name, code=old_section.code, capacity=old_section.capacity, is_active=True)
        return Response({'message': f'Academic year {new_year_name} cloned'}, status=200)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
