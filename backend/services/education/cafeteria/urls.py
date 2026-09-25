from django.urls import path

from . import api

urlpatterns = [
    path('settings/', api.cafeteria_settings, name='cafeteria-settings'),
    path('items/', api.items, name='cafeteria-items'),
    path('items/<str:item_id>/', api.item_detail, name='cafeteria-item'),
    path('menu/', api.menu, name='cafeteria-menu'),
    path('menu/copy/', api.copy_menu, name='cafeteria-menu-copy'),
    path('plans/', api.plans, name='cafeteria-plans'),
    path('plans/invoices/', api.plan_invoices, name='cafeteria-plan-invoices'),
    path('plans/<str:plan_id>/', api.plan_detail, name='cafeteria-plan'),
    path('plans/<str:plan_id>/members/', api.plan_members, name='cafeteria-plan-members'),
    path('till/find/', api.till_find, name='cafeteria-till-find'),
    path('till/charge/', api.till_charge, name='cafeteria-till-charge'),
    path('accounts/', api.accounts, name='cafeteria-accounts'),
    path('accounts/<str:student_id>/', api.account_detail, name='cafeteria-account'),
    path('accounts/<str:student_id>/<str:action>/', api.account_action, name='cafeteria-account-action'),
    path('transactions/<str:transaction_id>/refund/', api.refund, name='cafeteria-refund'),
    path('mine/', api.mine, name='cafeteria-mine'),
    path('mine/<str:student_id>/<str:action>/', api.family_action, name='cafeteria-family-action'),
    path('report/', api.report, name='cafeteria-report'),
]
