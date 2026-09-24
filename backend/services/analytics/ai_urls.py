from django.urls import path
from .ai_views import (
    ai_lesson_plan,
    train_and_predict,
    get_student_predictions,
    get_attendance_anomalies,
    face_register,
    face_attendance,
    generate_timetable,
    generate_quiz,
    publish_quiz
)

urlpatterns = [
    path('lesson-plan/', ai_lesson_plan, name='ai-lesson-plan'),
    path('train-models/', train_and_predict, name='ai-train-models'),
    path('student-predictions/', get_student_predictions, name='ai-student-predictions'),
    path('attendance-anomalies/', get_attendance_anomalies, name='ai-attendance-anomalies'),
    path('face-register/', face_register, name='ai-face-register'),
    path('face-attendance/', face_attendance, name='ai-face-attendance'),
    path('generate-timetable/', generate_timetable, name='ai-generate-timetable'),
    path('generate-quiz/', generate_quiz, name='ai-generate-quiz'),
    path('publish-quiz/', publish_quiz, name='ai-publish-quiz'),
]
