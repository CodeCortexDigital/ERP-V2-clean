from django.urls import path
from . import billing, views

urlpatterns = [
    path('settings/', views.FinanceSettingsView.as_view(), name='finance-settings'),
    path('fee-structures/', views.FeeStructureListCreateView.as_view(), name='fee-structure-list'),
    path('fee-structures/<str:id>/', views.FeeStructureDetailView.as_view(), name='fee-structure-detail'),
    path('invoices/', views.InvoiceListCreateView.as_view(), name='invoice-list'),
    path('invoices/bulk-delete/', views.bulk_delete_invoices, name='bulk-delete-invoices'),
    path('invoices/<str:id>/', views.InvoiceDetailView.as_view(), name='invoice-detail'),
    # Family billing: statements, family payments, credit, refunds
    path('families/', billing.family_accounts, name='family-accounts'),
    path('families/mine/', billing.my_family_accounts, name='family-accounts-mine'),
    path('families/<str:kind>/<str:pk>/statement/', billing.family_statement, name='family-statement'),
    path('families/<str:kind>/<str:pk>/payments/', billing.family_payment, name='family-payment'),
    path('families/<str:kind>/<str:pk>/credit/', billing.family_credit, name='family-credit'),
    path('families/<str:kind>/<str:pk>/apply-credit/', billing.family_apply_credit, name='family-apply-credit'),
    path('families/<str:kind>/<str:pk>/email-statement/', billing.email_statement, name='family-email-statement'),
    path('invoices/<str:invoice_id>/payment-plan/', billing.invoice_payment_plan, name='invoice-payment-plan'),
    path('payments/providers/', billing.payment_providers, name='payment-providers'),
    # Before 'payments/<id>/' so these are reachable.
    path('payments/session/', views.InvoicePaymentSessionView.as_view(), name='payment-session'),
    path('payments/webhook/<str:provider>/', views.PaymentGatewayWebhookView.as_view(), name='payment-webhook'),
    path('payments/<str:payment_id>/refund/', billing.refund_payment_view, name='payment-refund'),
    path('payments/', views.PaymentListCreateView.as_view(), name='payment-list'),
    path('payments/<str:id>/', views.PaymentDetailView.as_view(), name='payment-detail'),
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

    # ─── Admin Trigger Endpoints ─────────────────────────────────────────────
    # Manually trigger the scheduled jobs from the UI (useful without cron setup)
    path('admin/run-monthly-invoices/', views.run_monthly_invoices, name='run-monthly-invoices'),
    path('admin/apply-late-fees/', views.trigger_apply_late_fees, name='trigger-apply-late-fees'),
    path('admin/send-reminders/', views.trigger_send_reminders, name='trigger-send-reminders'),
    
    # ─── General Ledger (Account Heads & Ledger Entries) ─────────────────────
    path('account-heads/', views.AccountHeadListCreateView.as_view(), name='account-head-list'),
    path('account-heads/<str:id>/', views.AccountHeadDetailView.as_view(), name='account-head-detail'),
    path('ledger-entries/', views.LedgerEntryListCreateView.as_view(), name='ledger-entry-list'),
    path('ledger-entries/<str:id>/', views.LedgerEntryDetailView.as_view(), name='ledger-entry-detail'),
    
    # ─── Payslips & Salary ───────────────────────────────────────────────────
    path('payslips/', views.PayslipListCreateView.as_view(), name='payslip-list'),
    path('payslips/<str:id>/', views.PayslipDetailView.as_view(), name='payslip-detail'),
    path('payslips/bulk-generate/', views.PayslipBulkGenerateView.as_view(), name='payslip-bulk-generate'),
    path('payslips/bulk-pay/', views.PayslipBulkPayView.as_view(), name='payslip-bulk-pay'),
    
    # ─── Employee Credits ─────────────────────────────────────────────────────
    path('employee-credits/', views.EmployeeCreditListCreateView.as_view(), name='employee-credit-list'),
    path('employee-credits/<str:id>/', views.EmployeeCreditDetailView.as_view(), name='employee-credit-detail'),
    
    # ─── Weekday Configuration ────────────────────────────────────────────────
    path('weekdays/', views.WeekdayConfigListCreateView.as_view(), name='weekday-list'),
    path('weekdays/<str:id>/', views.WeekdayConfigDetailView.as_view(), name='weekday-detail'),
    path('weekdays/bulk-update/', views.WeekdayConfigBulkUpdateView.as_view(), name='weekday-bulk-update'),
]


# BULK_ROUTE_LOADED
