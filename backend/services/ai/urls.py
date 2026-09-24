from django.urls import include, path
from . import views

urlpatterns = [
    path("chat/", views.ai_chat, name="ai-chat"),
    path("chat/stream/", views.ai_chat_stream, name="ai-chat-stream"),
    path("conversations/", views.conversation_list, name="ai-conversations"),
    path("conversations/<uuid:conversation_id>/", views.conversation_detail, name="ai-conversation-detail"),
    path("messages/<uuid:message_id>/feedback/", views.message_feedback, name="ai-message-feedback"),
    # Lesson plans, quizzes, risk scans, face attendance
    path("", include("services.analytics.ai_urls")),
]
