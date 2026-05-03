# urls.py
from django.urls import path
from .views import kpis, dashboards, metrics

urlpatterns = [
    path('kpis/', kpis, name='kpis'),
    path('dashboards/', dashboards, name='dashboards'),
    path('metrics/', metrics, name='metrics'),
]
