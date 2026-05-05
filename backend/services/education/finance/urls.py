from django.urls import path
from . import views

urlpatterns = [
    path('invoices/', views.InvoiceListCreateView.as_view(), name='invoice-list'),
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list'),
]
