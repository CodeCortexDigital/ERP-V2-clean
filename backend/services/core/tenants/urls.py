from django.urls import path

from . import platform, signup, views

urlpatterns = [
    path('current/', views.current_tenant, name='tenant-current'),
    path('mine/', views.my_tenants, name='tenant-mine'),
    path('switch/', views.switch_tenant, name='tenant-switch'),
    path('schools/', views.create_school, name='tenant-create-school'),
    path('settings/', views.tenant_settings, name='tenant-settings'),
    # Self-service: create a school and its first admin (public, throttled)
    path('signup/', signup.school_signup, name='tenant-signup'),
    path('signup/config/', signup.signup_config, name='tenant-signup-config'),
    # The school's currency and language (read: everyone; change: school admin)
    path('locale/', signup.school_locale_view, name='tenant-locale'),
    path('onboarding/', signup.onboarding_status, name='tenant-onboarding'),
    # Platform owner (superuser): all schools, suspend / re-activate
    path('platform/schools/', platform.platform_schools, name='platform-schools'),
    path('platform/schools/<uuid:pk>/status/', platform.platform_school_status, name='platform-school-status'),
]
