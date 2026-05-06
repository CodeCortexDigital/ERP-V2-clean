from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Max, Min, Count
from .models import Exam, ExamResult
from .serializers import ExamSerializer, ExamResultSerializer
from django.apps import apps

Student = apps.get_model('education_students', 'Student')


class ExamListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ExamSerializer
    
    def get_queryset(self):
        queryset = Exam.objects.all().order_by('-exam_date')
        class_filter = self.request.query_params.get('class')
        if class_filter:
            queryset = queryset.filter(class_ref_id=class_filter)
        return queryset


class ExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer
    lookup_field = 'id'


# SIMPLE WORKING RESULTS VIEW
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_exam_results(request):
    """Get all exam results"""
    results = ExamResult.objects.select_related('exam', 'student').all()
    data = []
    for result in results:
        data.append({
            'id': str(result.id),
            'exam': str(result.exam.id),
            'exam_title': result.exam.title,
            'student': str(result.student.id),
            'student_name': result.student.full_name,
            'student_id': result.student.student_id,
            'obtained_marks': float(result.obtained_marks),
            'percentage': float(result.percentage),
            'grade': result.grade,
            'is_pass': result.is_pass,
            'remarks': result.remarks,
        })
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_exam_result(request):
    """Create a single exam result"""
    try:
        exam_id = request.data.get('exam')
        student_id = request.data.get('student')
        obtained_marks = request.data.get('obtained_marks')
        
        exam = get_object_or_404(Exam, id=exam_id)
        student = get_object_or_404(Student, id=student_id)
        
        result, created = ExamResult.objects.update_or_create(
            exam=exam,
            student=student,
            defaults={'obtained_marks': obtained_marks}
        )
        
        return Response({
            'id': str(result.id),
            'percentage': float(result.percentage),
            'grade': result.grade,
            'is_pass': result.is_pass
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_exam_result(request, result_id):
    """Delete an exam result"""
    try:
        result = get_object_or_404(ExamResult, id=result_id)
        result.delete()
        return Response({'message': 'Result deleted'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_enter_results(request, exam_id):
    """Bulk enter results for all students in an exam"""
    try:
        exam = Exam.objects.get(id=exam_id)
        results_data = request.data.get('results', [])
        
        created_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for result_data in results_data:
                student_id = result_data.get('student_id')
                obtained_marks = result_data.get('obtained_marks')
                
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
            'message': f'Results saved: {created_count} created, {updated_count} updated'
        })
        
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exam_summary(request, exam_id):
    """Get summary statistics for an exam"""
    try:
        exam = Exam.objects.get(id=exam_id)
        results = ExamResult.objects.filter(exam=exam)
        
        total_students = results.count()
        passed = results.filter(is_pass=True).count()
        failed = total_students - passed
        pass_percentage = round((passed / total_students * 100), 1) if total_students > 0 else 0
        
        return Response({
            'total_students': total_students,
            'passed': passed,
            'failed': failed,
            'pass_percentage': pass_percentage,
            'average_percentage': results.aggregate(avg=Avg('percentage'))['avg'] or 0,
            'highest_marks': results.aggregate(max=Max('obtained_marks'))['max'] or 0,
            'lowest_marks': results.aggregate(min=Min('obtained_marks'))['min'] or 0,
        })
        
    except Exam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=404)
