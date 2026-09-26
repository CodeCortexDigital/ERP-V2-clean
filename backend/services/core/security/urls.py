from django.urls import path

from . import api

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
    path('me/deletion-request/', api.deletion_request),
]
