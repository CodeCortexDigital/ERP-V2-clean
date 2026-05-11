# Add to services/core/accounts/teacher_views.py

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from .permissions import IsTeacher

class TeacherDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get(self, request):
        teacher = request.user.teacher_profile
        classes = teacher.assigned_classes.all()
        
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
            'classes_count': classes.count(),
            'classes': class_data,
            'total_students': sum(c['student_count'] for c in class_data)
        })

class TeacherClassStudentsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get(self, request, class_id):
        teacher = request.user.teacher_profile
        class_obj = get_object_or_404(teacher.assigned_classes, id=class_id)
        
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
        from services.education.attendance.models import Attendance
        from services.education.students.models import Student
        
        class_obj = get_object_or_404(teacher.assigned_classes, id=class_id)
        
        created_count = 0
        updated_count = 0
        
        for item in attendance_data:
            student_id = item.get('student_id')
            status = item.get('status')  # present, absent, late
            
            student = get_object_or_404(Student, id=student_id)
            
            attendance, created = Attendance.objects.update_or_create(
                student=student,
                date=date,
                class_ref=class_obj,
                defaults={'status': status}
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
