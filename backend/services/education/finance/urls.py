from django.urls import path
from . import views

urlpatterns = [
    path('fee-structures/', views.FeeStructureListCreateView.as_view(), name='fee-structure-list'),
    path('fee-structures/<str:id>/', views.FeeStructureDetailView.as_view(), name='fee-structure-detail'),
    path('invoices/', views.InvoiceListCreateView.as_view(), name='invoice-list'),
    path('invoices/<str:id>/', views.InvoiceDetailView.as_view(), name='invoice-detail'),
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list'),
    path('payments/<str:id>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('summary/', views.finance_summary, name='finance-summary'),
]
