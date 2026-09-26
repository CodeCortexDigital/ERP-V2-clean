from django.urls import path

from . import api, retention, setup_checks, twofactor_api

urlpatterns = [
    path('rules/', api.rules_for_me),
    path('settings/', api.settings_view),
    path('overview/', api.overview),
    path('activity/', api.activity),
    path('sign-ins/', api.sign_ins),
    path('people/', api.people),
    path('people/<uuid:user_id>/', api.person_action),
    path('roles/', api.roles),
    path('me/', api.me),
    path('me/sign-out-everywhere/', api.sign_out_everywhere),
    path('me/data/', api.my_data),
    path('password-reset/', api.password_reset),
    path('password-reset/confirm/', api.password_reset_confirm),
    path('verify-email/send/', api.verify_email_send),
    path('verify-email/confirm/', api.verify_email_confirm),
    path('emails/', api.email_log),
    path('me/deletion-request/', api.deletion_request),
    path('setup-checks/', setup_checks.setup_checks),
    path('retention/', retention.retention_view),
    path('2fa/', twofactor_api.two_factor_status),
    path('2fa/setup/', twofactor_api.two_factor_setup),
    path('2fa/confirm/', twofactor_api.two_factor_confirm),
    path('2fa/disable/', twofactor_api.two_factor_disable),
    path('2fa/recovery-codes/', twofactor_api.two_factor_recovery_codes),
]
