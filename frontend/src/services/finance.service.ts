import api from './api';

const financeService = {
  // Fee Structures
  getFeeStructures: (params?: any) => api.get('/auth/finance/fee-structures/', { params }),
  getFeeStructure: (id: string) => api.get(`/auth/finance/fee-structures/${id}/`),
  createFeeStructure: (data: any) => api.post('/auth/finance/fee-structures/', data),
  updateFeeStructure: (id: string, data: any) => api.put(`/auth/finance/fee-structures/${id}/`, data),
  deleteFeeStructure: (id: string) => api.delete(`/auth/finance/fee-structures/${id}/`),

  // Invoices
  getInvoices: (params?: any) => api.get('/auth/finance/invoices/', { params }),
  getInvoice: (id: string) => api.get(`/auth/finance/invoices/${id}/`),
  createInvoice: (data: any) => api.post('/auth/finance/invoices/', data),
  updateInvoice: (id: string, data: any) => api.patch(`/auth/finance/invoices/${id}/`, data),
  deleteInvoice: (id: string) => api.delete(`/auth/finance/invoices/${id}/`),

  // Invoice Receipts
  getInvoiceReceipt: (invoiceId: string) => api.get(`/auth/finance/invoices/${invoiceId}/receipt/`),

  // Payments
  getPayments: (params?: any) => api.get('/auth/finance/payments/', { params }),
  getPayment: (id: string) => api.get(`/auth/finance/payments/${id}/`),
  createPayment: (data: any) => {
    const payload = {
      ...data,
      invoice: data.invoice_id ?? data.invoice,
    };
    delete payload.invoice_id;
    return api.post('/auth/finance/payments/', payload);
  },
  deletePayment: (id: string) => api.delete(`/auth/finance/payments/${id}/`),

  // Payment Receipts
  getPaymentReceipt: (paymentId: string) => api.get(`/auth/finance/payments/${paymentId}/receipt/`),

  // Summary
  getSummary: () => api.get('/auth/finance/summary/'),

  // Export/Import
  exportInvoicesCSV: (params?: any) => api.get('/auth/finance/export/invoices/csv/', { params, responseType: 'blob' }),
  exportPaymentsCSV: (params?: any) => api.get('/auth/finance/export/payments/csv/', { params, responseType: 'blob' }),
  generateFinanceReportPDF: (params?: any) => api.get('/auth/finance/reports/pdf/', { params, responseType: 'blob' }),

  // Advanced Features
  // Installment Plans
  getInstallmentPlans: (params?: any) => api.get('/auth/finance/installment-plans/', { params }),
  getInstallmentPlan: (id: string) => api.get(`/auth/finance/installment-plans/${id}/`),
  createInstallmentPlan: (data: any) => api.post('/auth/finance/installment-plans/', data),
  updateInstallmentPlan: (id: string, data: any) => api.put(`/auth/finance/installment-plans/${id}/`, data),
  deleteInstallmentPlan: (id: string) => api.delete(`/auth/finance/installment-plans/${id}/`),

  // Scholarships
  getScholarships: (params?: any) => api.get('/auth/finance/scholarships/', { params }),
  getScholarship: (id: string) => api.get(`/auth/finance/scholarships/${id}/`),
  createScholarship: (data: any) => api.post('/auth/finance/scholarships/', data),
  updateScholarship: (id: string, data: any) => api.put(`/auth/finance/scholarships/${id}/`, data),
  deleteScholarship: (id: string) => api.delete(`/auth/finance/scholarships/${id}/`),

  // Student Scholarships
  getStudentScholarships: (params?: any) => api.get('/auth/finance/student-scholarships/', { params }),
  getStudentScholarship: (id: string) => api.get(`/auth/finance/student-scholarships/${id}/`),
  createStudentScholarship: (data: any) => api.post('/auth/finance/student-scholarships/', data),
  updateStudentScholarship: (id: string, data: any) => api.put(`/auth/finance/student-scholarships/${id}/`, data),
  deleteStudentScholarship: (id: string) => api.delete(`/auth/finance/student-scholarships/${id}/`),

  // Late Fee Rules
  getLateFeeRules: (params?: any) => api.get('/auth/finance/late-fee-rules/', { params }),
  getLateFeeRule: (id: string) => api.get(`/auth/finance/late-fee-rules/${id}/`),
  createLateFeeRule: (data: any) => api.post('/auth/finance/late-fee-rules/', data),
  updateLateFeeRule: (id: string, data: any) => api.put(`/auth/finance/late-fee-rules/${id}/`, data),
  deleteLateFeeRule: (id: string) => api.delete(`/auth/finance/late-fee-rules/${id}/`),

  // Transaction Logs
  getTransactionLogs: (params?: any) => api.get('/auth/finance/transaction-logs/', { params }),

  // Analytics
  getMonthlyRevenueChart: (params?: any) => api.get('/auth/finance/analytics/monthly-revenue/', { params }),
  getDefaulterReport: (params?: any) => api.get('/auth/finance/analytics/defaulters/', { params }),
  getClassWiseCollection: (params?: any) => api.get('/auth/finance/analytics/class-collection/', { params }),
  getFinancialForecast: (params?: any) => api.get('/auth/finance/analytics/forecast/', { params }),

  // Actions
  createInstallmentInvoice: (invoiceId: string) => api.post(`/auth/finance/invoices/${invoiceId}/create-installments/`),
  applyScholarshipToInvoice: (invoiceId: string, data: any) => api.post(`/auth/finance/invoices/${invoiceId}/apply-scholarship/`, data),

  // PDF Reports
  generateInvoicePDF: (invoiceId: string) => api.get(`/auth/finance/reports/invoice/${invoiceId}/pdf/`, { responseType: 'blob' }),
  generateDefaulterReportPDF: () => api.get('/auth/finance/reports/defaulters/pdf/', { responseType: 'blob' }),
  generateMonthlyFinanceReportPDF: () => api.get('/auth/finance/reports/monthly/pdf/', { responseType: 'blob' }),

  // Email Communication
  sendFeeReminder: (invoiceId: string) => api.post(`/auth/finance/communication/reminder/${invoiceId}/`),
  sendPaymentConfirmation: (paymentId: string) => api.post(`/auth/finance/communication/confirmation/${paymentId}/`),
  sendDefaulterNotice: (invoiceId: string) => api.post(`/auth/finance/communication/defaulter-notice/${invoiceId}/`),
  sendDefaulterWhatsAppNotice: (invoiceId: string) => api.post(`/auth/finance/communication/defaulter-whatsapp/${invoiceId}/`),
  bulkSendReminders: (data: any) => api.post('/auth/finance/communication/bulk-reminders/', data),
};

export default financeService;
