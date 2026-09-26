from django.urls import path

from . import api

urlpatterns = [
    path('', api.kinds, name='imports-kinds'),
    path('history/', api.history, name='imports-history'),
    path('history/<uuid:run_id>/problems.csv', api.problems_csv, name='imports-problems'),
    path('<str:kind>/template/', api.template, name='imports-template'),
    path('<str:kind>/preview/', api.preview, name='imports-preview'),
    path('<str:kind>/import/', api.commit, name='imports-commit'),
]
