from django.urls import path

from . import inbox

urlpatterns = [
    path('contacts/', inbox.contacts, name='comm-contacts'),
    path('conversations/', inbox.conversations, name='comm-conversations'),
    path('conversations/<str:conv_id>/', inbox.conversation_detail, name='comm-conversation'),
    path('conversations/<str:conv_id>/messages/', inbox.post_message, name='comm-conversation-message'),
    path('unread/', inbox.unread, name='comm-unread'),
    path('announcements/', inbox.announcements, name='comm-announcements'),
    path('announcements/<str:ann_id>/', inbox.announcement_action, name='comm-announcement'),
    path('sms/settings/', inbox.sms_settings, name='comm-sms-settings'),
    path('sms/send/', inbox.sms_send, name='comm-sms-send'),
    path('history/<str:student_id>/', inbox.student_history, name='comm-student-history'),
]
