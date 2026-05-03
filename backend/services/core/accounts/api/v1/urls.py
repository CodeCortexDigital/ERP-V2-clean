"""
API v1 URL routing.
"""

from django.urls import path
from accounts import views

urlpatterns = [
    path('api-docs/', views.APIDocsView.as_view(), name='api-docs'),
    path('test-login/', views.TestLoginView.as_view(), name='test-login'),
    # API Root
    path('', views.APIRootView.as_view(), name='api-root'),
    
    # Authentication & Registration
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/verify-email/', views.EmailVerificationView.as_view(), name='verify-email'),
    path('auth/resend-verification/', views.EmailVerificationView.as_view(), name='resend-verification'),
    path('auth/verify-phone/', views.PhoneVerificationView.as_view(), name='verify-phone'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('auth/password-reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Social Login
    path('auth/social/link/', views.SocialLoginLinkView.as_view(), name='social-link'),
    
    # User Profile
    path('users/me/', views.UserProfileView.as_view(), name='user-profile'),
    path('users/me/activities/', views.UserActivitiesView.as_view(), name='user-activities'),
    path('users/me/preferences/', views.UserPreferencesView.as_view(), name='user-preferences'),
    path('users/me/consents/', views.UserConsentsView.as_view(), name='user-consents'),
    
    # GDPR
    path('gdpr/data-portability/', views.GDPRDataPortabilityView.as_view(), name='data-portability'),
    path('gdpr/delete-account/', views.AccountDeletionView.as_view(), name='delete-account'),
    
    # Account Management
    path('accounts/lock/', views.AccountLockView.as_view(), name='lock-account'),
    path('accounts/recover/', views.AccountRecoveryView.as_view(), name='recover-account'),
    
    # Delegated Management
    path('delegated/users/', views.DelegatedUsersView.as_view(), name='delegated-users'),
    
    # User Tags
    path('users/me/tags/', views.UserTagsView.as_view(), name='user-tags'),
]








