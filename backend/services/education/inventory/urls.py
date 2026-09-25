from django.urls import path

from . import api

urlpatterns = [
    path('categories/', api.categories, name='inventory-categories'),
    path('categories/<str:category_id>/', api.category_detail, name='inventory-category'),
    path('suppliers/', api.suppliers, name='inventory-suppliers'),
    path('suppliers/<str:supplier_id>/', api.supplier_detail, name='inventory-supplier'),
    path('items/', api.items, name='inventory-items'),
    path('items/export/', api.export_stock, name='inventory-export'),
    path('items/<str:item_id>/', api.item_detail, name='inventory-item'),
    path('items/<str:item_id>/move/', api.move_stock, name='inventory-move'),
    path('movements/', api.movements, name='inventory-movements'),
    path('orders/', api.orders, name='inventory-orders'),
    path('orders/<str:order_id>/', api.order_detail, name='inventory-order'),
    path('orders/<str:order_id>/<str:action>/', api.order_action, name='inventory-order-action'),
    path('reorder/', api.reorder, name='inventory-reorder'),
    path('report/', api.report, name='inventory-report'),
]
