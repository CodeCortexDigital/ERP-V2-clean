from django.urls import path

from . import api

urlpatterns = [
    path('vehicles/', api.vehicles, name='transport-vehicles'),
    path('vehicles/<str:vehicle_id>/', api.vehicle_detail, name='transport-vehicle'),
    path('staff/', api.staff, name='transport-staff'),
    path('staff/<str:staff_id>/', api.staff_detail, name='transport-staff-detail'),
    path('routes/', api.routes, name='transport-routes'),
    path('routes/<str:route_id>/', api.route_detail, name='transport-route'),
    path('routes/<str:route_id>/stops/', api.route_stops, name='transport-route-stops'),
    path('routes/<str:route_id>/manifest/', api.manifest, name='transport-manifest'),
    path('routes/<str:route_id>/trip/', api.trip_action, name='transport-trip-action'),
    path('trips/<str:trip_id>/event/', api.trip_event, name='transport-trip-event'),
    path('riders/', api.riders, name='transport-riders'),
    path('riders/<str:rider_id>/', api.rider_detail, name='transport-rider'),
    path('today/', api.today, name='transport-today'),
    path('mine/', api.mine, name='transport-mine'),
    path('invoices/', api.invoices, name='transport-invoices'),
    path('report/', api.report, name='transport-report'),
]
