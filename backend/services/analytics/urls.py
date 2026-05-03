from django.urls import path
from .views import student_insights, batch_risk_assessment

urlpatterns = [
    path('student/<str:student_id>/', student_insights, name='student-insights'),
    path('batch-risk-assessment/', batch_risk_assessment, name='batch-risk'),
]
