from django.urls import path
from . import views

urlpatterns = [
    path('fee-structures/', views.FeeStructureListCreateView.as_view(), name='fee-structure-list'),
    path('fee-structures/<str:id>/', views.FeeStructureDetailView.as_view(), name='fee-structure-detail'),
    path('invoices/', views.InvoiceListCreateView.as_view(), name='invoice-list'),
    path('invoices/<str:id>/', views.InvoiceDetailView.as_view(), name='invoice-detail'),
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list'),
    path('payments/<str:id>/', views.PaymentDetailView.as_view(), name='payment-detail'),
    path('payments/session/', views.InvoicePaymentSessionView.as_view(), name='payment-session'),
    path('payments/webhook/<str:provider>/', views.PaymentGatewayWebhookView.as_view(), name='payment-webhook'),
    path('payment-gateways/', views.PaymentGatewayConfigListCreateView.as_view(), name='payment-gateway-list'),
    path('payment-gateways/<str:id>/', views.PaymentGatewayConfigDetailView.as_view(), name='payment-gateway-detail'),
    path('payment-transactions/', views.PaymentTransactionListView.as_view(), name='payment-transaction-list'),
    path('summary/', views.finance_summary, name='finance-summary'),
    
    # New features
    path('invoices/<str:invoice_id>/receipt/', views.invoice_receipt, name='invoice-receipt'),
    path('payments/<str:payment_id>/receipt/', views.payment_receipt, name='payment-receipt'),
    path('export/invoices/csv/', views.export_invoices_csv, name='export-invoices-csv'),
    path('export/payments/csv/', views.export_payments_csv, name='export-payments-csv'),
    path('reports/pdf/', views.finance_report_pdf, name='finance-report-pdf'),
    
    # Advanced features
    path('installment-plans/', views.InstallmentPlanListCreateView.as_view(), name='installment-plan-list'),
    path('installment-plans/<str:id>/', views.InstallmentPlanDetailView.as_view(), name='installment-plan-detail'),
    path('scholarships/', views.ScholarshipListCreateView.as_view(), name='scholarship-list'),
    path('scholarships/<str:id>/', views.ScholarshipDetailView.as_view(), name='scholarship-detail'),
    path('student-scholarships/', views.StudentScholarshipListCreateView.as_view(), name='student-scholarship-list'),
    path('student-scholarships/<str:id>/', views.StudentScholarshipDetailView.as_view(), name='student-scholarship-detail'),
    path('late-fee-rules/', views.LateFeeRuleListCreateView.as_view(), name='late-fee-rule-list'),
    path('late-fee-rules/<str:id>/', views.LateFeeRuleDetailView.as_view(), name='late-fee-rule-detail'),
    path('transaction-logs/', views.TransactionLogListView.as_view(), name='transaction-log-list'),
    
    # Analytics
    path('analytics/monthly-revenue/', views.monthly_revenue_chart, name='monthly-revenue-chart'),
    path('analytics/defaulters/', views.defaulter_report, name='defaulter-report'),
    path('analytics/class-collection/', views.class_wise_collection, name='class-wise-collection'),
    path('analytics/forecast/', views.financial_forecast, name='financial-forecast'),
    
    # Actions
    path('invoices/<str:invoice_id>/create-installments/', views.create_installment_invoice, name='create-installment-invoice'),
    path('invoices/<str:invoice_id>/apply-scholarship/', views.apply_scholarship_to_invoice, name='apply-scholarship-to-invoice'),
    
    # PDF Reports
    path('reports/invoice/<str:invoice_id>/pdf/', views.invoice_pdf, name='invoice-pdf'),
    path('reports/defaulters/pdf/', views.defaulter_report_pdf, name='defaulter-report-pdf'),
    path('reports/monthly/pdf/', views.monthly_finance_report_pdf, name='monthly-finance-report-pdf'),
    
    # Email Communication
    path('communication/reminder/<str:invoice_id>/', views.send_fee_reminder, name='send-fee-reminder'),
    path('communication/confirmation/<str:payment_id>/', views.send_payment_confirmation, name='send-payment-confirmation'),
    path('communication/defaulter-notice/<str:invoice_id>/', views.send_defaulter_notice, name='send-defaulter-notice'),
    path('communication/defaulter-whatsapp/<str:invoice_id>/', views.send_defaulter_whatsapp_notice, name='send-defaulter-whatsapp-notice'),
    path('communication/bulk-reminders/', views.bulk_send_reminders, name='bulk-send-reminders'),
]
