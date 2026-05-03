from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.apps import apps
from .engine import InsightsEngine
from .models import StudentRisk, Recommendation

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_insights(request, student_id):
    """Get AI-powered insights for a student"""
    try:
        Student = apps.get_model('education_students', 'Student')
        student = Student.objects.get(id=student_id)
        
        engine = InsightsEngine(student)
        
        # Calculate risk
        risk_data = engine.calculate_risk_score()
        
        # Generate recommendations
        recommendations = engine.generate_recommendations(risk_data)
        
        # Predict performance
        prediction = engine.predict_performance()
        
        # Save risk assessment
        risk_obj, created = StudentRisk.objects.update_or_create(
            student=student,
            defaults={
                'risk_level': risk_data['level'],
                'risk_score': risk_data['score'],
                'factors': risk_data['factors'],
                'recommendations': recommendations,
                'is_resolved': False
            }
        )
        
        return Response({
            'student': {
                'id': str(student.id),
                'name': student.full_name,
                'student_id': student.student_id
            },
            'risk_assessment': {
                'level': risk_data['level'],
                'score': risk_data['score'],
                'factors': risk_data['factors']
            },
            'academic_prediction': prediction,
            'recommendations': recommendations
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def batch_risk_assessment(request):
    """Run risk assessment for all students"""
    Student = apps.get_model('education_students', 'Student')
    students = Student.objects.filter(is_active=True)
    
    results = []
    for student in students:
        engine = InsightsEngine(student)
        risk_data = engine.calculate_risk_score()
        recommendations = engine.generate_recommendations(risk_data)
        
        StudentRisk.objects.update_or_create(
            student=student,
            defaults={
                'risk_level': risk_data['level'],
                'risk_score': risk_data['score'],
                'factors': risk_data['factors'],
                'recommendations': recommendations
            }
        )
        
        results.append({
            'student_id': student.student_id,
            'student_name': student.full_name,
            'risk_level': risk_data['level'],
            'risk_score': risk_data['score']
        })
    
    return Response({
        'total_analyzed': len(results),
        'results': results
    }, status=status.HTTP_200_OK)
