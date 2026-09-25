from django.urls import path

from . import api

urlpatterns = [
    path('', api.hub, name='integrations-hub'),
    path('email/test/', api.email_test, name='integrations-email-test'),
    path('microsoft/start/', api.microsoft_start, name='integrations-ms-start'),
    path('microsoft/callback/', api.microsoft_callback, name='integrations-ms-callback'),
    path('sso/exchange/', api.sso_exchange, name='integrations-sso-exchange'),
    path('google-classroom/connect/', api.classroom_connect, name='integrations-gc-connect'),
    path('google-classroom/callback/', api.classroom_callback, name='integrations-gc-callback'),
    path('google-classroom/courses/', api.classroom_courses, name='integrations-gc-courses'),
    path('google-classroom/courses/<str:course_id>/link/', api.classroom_link, name='integrations-gc-link'),
    path('google-classroom/courses/<str:course_id>/compare/', api.classroom_compare, name='integrations-gc-compare'),
    path('<str:provider>/', api.configure, name='integrations-configure'),
]
