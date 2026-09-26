from django.urls import path

from . import inbox, texts_api

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
    path('texts/rules/', texts_api.rules, name='comm-texts-rules'),
    path('texts/log/', texts_api.log, name='comm-texts-log'),
    path('texts/retry/', texts_api.retry, name='comm-texts-retry'),
    path('texts/test/', texts_api.test_send, name='comm-texts-test'),
    path('texts/emergency/', texts_api.emergency, name='comm-texts-emergency'),
    path('texts/status/', texts_api.status_callback, name='comm-texts-status'),
    path('history/<str:student_id>/', inbox.student_history, name='comm-student-history'),
]
