from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.ai_chat, name="ai-chat"),
    path("generate-timetable/", views.generate_timetable, name="generate-timetable"),
]
