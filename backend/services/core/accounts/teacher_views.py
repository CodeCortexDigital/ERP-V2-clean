# Add to services/core/accounts/teacher_views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from .permissions import IsTeacher

from .decorators import _get_teacher_class_ids

class TeacherDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get(self, request):
        teacher = request.user.teacher_profile
        from services.education.academics.models import SchoolClass
        class_ids = _get_teacher_class_ids(request.user)
        classes = SchoolClass.objects.filter(id__in=class_ids)
        
        # Get student count for each class
        class_data = []
        for cls in classes:
            student_count = cls.students.count()
            class_data.append({
                'id': str(cls.id),
                'name': cls.name,
                'code': cls.code,
                'student_count': student_count
            })
        
        return Response({
            'teacher_name': request.user.full_name or request.user.email,
            'teacher_id': teacher.employee_id or 'N/A',
            'classes_count': len(class_data),
            'classes': class_data,
            'total_students': sum(c['student_count'] for c in class_data)
        })

class TeacherClassStudentsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get(self, request, class_id):
        from services.education.academics.models import SchoolClass
        class_ids = _get_teacher_class_ids(request.user)
        if str(class_id) not in [str(cid) for cid in class_ids]:
            return Response({'detail': 'Not found or permission denied.'}, status=status.HTTP_404_NOT_FOUND)
        class_obj = get_object_or_404(SchoolClass, id=class_id)
        
        students = class_obj.students.filter(is_active=True)
        
        student_data = []
        for student in students:
            student_data.append({
                'id': str(student.id),
                'student_id': student.student_id,
                'name': student.full_name,
                'section': student.current_section.name if student.current_section else None,
                'is_active': student.is_active
            })
        
        return Response({
            'class_id': str(class_obj.id),
            'class_name': class_obj.name,
            'students': student_data,
            'total_students': len(student_data)
        })

class TeacherMarkAttendanceView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    @transaction.atomic
    def post(self, request):
        teacher = request.user.teacher_profile
        class_id = request.data.get('class_id')
        date = request.data.get('date')
        attendance_data = request.data.get('attendance', [])
        
        from django.utils import timezone
        from services.education.attendance.models import AttendanceRecord
        from services.education.students.models import Student
        from services.education.academics.models import SchoolClass
        
        class_ids = _get_teacher_class_ids(request.user)
        if str(class_id) not in [str(cid) for cid in class_ids]:
            return Response({'detail': 'Not found or permission denied.'}, status=status.HTTP_404_NOT_FOUND)
        class_obj = get_object_or_404(SchoolClass, id=class_id)
        
        created_count = 0
        updated_count = 0
        
        from services.education.attendance.services import upsert_attendance_record
        import uuid
        for item in attendance_data:
            student_id = item.get('student_id')
            status_val = item.get('status')  # present, absent, late
            
            try:
                uuid.UUID(str(student_id))
                student = get_object_or_404(Student, id=student_id)
            except (ValueError, TypeError):
                student = get_object_or_404(Student, student_id=student_id)
            
            created = upsert_attendance_record(
                student=student,
                record_date=date,
                status=status_val,
                course_id=str(class_obj.id),
                marked_by=request.user
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'success': True,
            'message': f'Attendance saved: {created_count} created, {updated_count} updated'
        })

class TeacherExamMarksView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    @transaction.atomic
    def post(self, request):
        teacher = request.user.teacher_profile
        exam_id = request.data.get('exam_id')
        marks_data = request.data.get('marks', [])
        
        from services.education.exams.models import Exam, ExamResult
        from services.education.students.models import Student
        
        exam = get_object_or_404(Exam, id=exam_id)
        
        # Verify teacher is assigned to this exam's subject
        if exam.subject not in teacher.assigned_subjects.all():
            return Response({'error': 'You are not authorized to enter marks for this exam'}, status=403)
        
        created_count = 0
        updated_count = 0
        
        for item in marks_data:
            student_id = item.get('student_id')
            obtained_marks = item.get('obtained_marks')
            
            student = get_object_or_404(Student, id=student_id)
            
            result, created = ExamResult.objects.update_or_create(
                exam=exam,
                student=student,
                defaults={'obtained_marks': obtained_marks}
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'success': True,
            'message': f'Marks saved: {created_count} created, {updated_count} updated'
        })
