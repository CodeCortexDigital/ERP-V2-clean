// frontend/src/services/finance.service.ts
import api, { extractListData } from './api';

export interface FeeStructure {
  id: string;
  class_ref: string;
  class_name?: string;
  section?: string | null;
  fee_name: string;
  amount: number;
  due_date: string;
  academic_year: string;
  is_recurring: boolean;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student: string;
  student_name?: string;
  student_id_code?: string;
  student_id_num?: string;
  class_id?: string;
  class_name?: string;
  amount: number;
  paid_amount: number;
  balance_due: number;
  total_amount?: number;
  opening_balance?: number;
  previous_balance?: number;
  late_fee_amount?: number;
  discount_amount?: number;
  fine_after_due_date?: number;
  fee_month?: string;
  invoice_month?: string;
  bank_name?: string;
  description?: string;
  carried_forward?: boolean;
  carried_forward_to?: string;
  carried_forward_date?: string;
  cancellation_remarks?: string;
  breakdown?: any;
  invoice_type?: string;
  registration_alias?: string;
  payment_history?: any[];
  status: string;
  due_date: string;
  issue_date: string;
  items?: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  invoice: string;
  invoice_number?: string;
  student: string;
  student_name?: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'online';
  transaction_id?: string;
  payment_date: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  remarks?: string;
  receipt_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InstallmentPlan {
  id: string;
  name: string;
  description: string;
  total_installments: number;
  frequency: 'monthly' | 'quarterly' | 'semester';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Scholarship {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  amount: number;
  eligibility_criteria: any;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentScholarship {
  id: string;
  student: string;
  scholarship: string;
  scholarship_name?: string;
  amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LateFeeRule {
  id: string;
  name: string;
  days_after_due: number;
  fee_percentage: number;
  fee_fixed_amount: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionLog {
  id: string;
  transaction_id: string;
  invoice?: string;
  student?: string;
  amount: number;
  type: 'income' | 'expense' | 'refund' | 'adjustment';
  category: string;
  description: string;
  date: string;
  created_at?: string;
}

export interface FinanceSettings {
  id: string;
  currency: string;
  currency_symbol: string;
  late_fee_enabled: boolean;
  auto_invoice_generation: boolean;
  default_payment_method: string;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceSummary {
  total_revenue: number;
  total_expenses: number;
  total_profit: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_invoices: number;
  collection_rate: number;
  monthly_income: number;
  monthly_expenses: number;
}

// Helper to normalize invoice data
const normalizeInvoice = (inv: any): Invoice => ({
  ...inv,
  id: String(inv.id),
  invoice_number: inv.invoice_number || inv.invoice_no || '',
  student: String(inv.student),
  student_name: inv.student_name || inv.student__full_name || '',
  class_name: inv.class_name || inv.class__name || '',
  amount: Number(inv.amount) || 0,
  paid_amount: Number(inv.paid_amount) || 0,
  balance_due: (inv.balance_due !== undefined && inv.balance_due !== null) ? Number(inv.balance_due) : (Number(inv.amount || 0) - Number(inv.paid_amount || 0)),
  total_amount: (inv.total_amount !== undefined && inv.total_amount !== null) ? Number(inv.total_amount) : (Number(inv.amount || 0) + Number(inv.late_fee_amount || 0) - Number(inv.discount_amount || 0)),
  status: inv.status || 'draft',
  items: Array.isArray(inv.items) ? inv.items : [],
});

const normalizeInvoiceList = (invoices: any[]): Invoice[] => 
  invoices.map(normalizeInvoice);

const EMPTY_DEFAULTERS = {
  total_defaulters: 0,
  total_amount_due: 0,
  defaulters: [] as unknown[],
};

// ✅ FIXED: All URLs use / instead of /auth/finance/
const financeService = {
  // ==================== Fee Structures ====================
  getFeeStructures: async (params?: { class_id?: string; is_active?: boolean }) => {
    const response = await api.get('/fee-structures/', { params });
    return response;
  },
  getFeeStructure: async (id: string) => {
    const response = await api.get(`/fee-structures/${id}/`);
    return response;
  },
  createFeeStructure: async (data: Partial<FeeStructure>) => {
    const response = await api.post('/fee-structures/', data);
    return response;
  },
  updateFeeStructure: async (id: string, data: Partial<FeeStructure>) => {
    const response = await api.patch(`/fee-structures/${id}/`, data);
    return response;
  },
  deleteFeeStructure: async (id: string) => {
    const response = await api.delete(`/fee-structures/${id}/`);
    return response;
  },

  // ==================== Invoices ====================
  getInvoices: async (params?: { 
    student_id?: string; 
    class_id?: string; 
    status?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => {
    const cleanParams: any = { page_size: 1000, ...params };
    if (cleanParams?.status === 'all') {
      delete cleanParams.status;
    }
    const response = await api.get('/invoices/', { params: cleanParams });
    if (response.data) {
      const invoices = extractListData<Invoice>(response.data);
      response.data = normalizeInvoiceList(invoices);
    }
    return response;
  },
  getInvoice: async (id: string) => {
    const response = await api.get(`/invoices/${id}/`);
    if (response.data) {
      response.data = normalizeInvoice(response.data);
    }
    return response;
  },
  createInvoice: async (data: Partial<Invoice>) => {
    const response = await api.post('/invoices/', data);
    if (response.data) {
      response.data = normalizeInvoice(response.data);
    }
    return response;
  },
  updateInvoice: async (id: string, data: Partial<Invoice>) => {
    const response = await api.patch(`/invoices/${id}/`, data);
    if (response.data) {
      response.data = normalizeInvoice(response.data);
    }
    return response;
  },
  deleteInvoice: async (id: string) => {
    const response = await api.delete(`/invoices/${id}/`);
    return response;
  },
  bulkDeleteInvoices: async (ids: string[]) => {
    const response = await api.post('/invoices/bulk-delete/', { invoice_ids: ids });
    return response;
  },

  // ==================== Invoice Receipts ====================
  getInvoiceReceipt: async (invoiceId: string) => {
    const response = await api.get(`/invoices/${invoiceId}/receipt/`);
    return response;
  },

  // ==================== Payments ====================
  getPayments: async (params?: { 
    invoice_id?: string; 
    student_id?: string; 
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      const response = await api.get('/payments/', { params });
      return { ...response, data: extractListData(response.data) };
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return { data: [], status: 200, statusText: 'OK', headers: {}, config: {} } as Awaited<
          ReturnType<typeof api.get>
        >;
      }
      throw error;
    }
  },
  getPayment: async (id: string) => {
    const response = await api.get(`/payments/${id}/`);
    return response;
  },
  createPayment: async (data: any) => {
    const payload = {
      ...data,
      invoice: data.invoice_id ?? data.invoice,
    };
    delete (payload as any).invoice_id;
    const response = await api.post('/payments/', payload);
    return response;
  },
  deletePayment: async (id: string) => {
    const response = await api.delete(`/payments/${id}/`);
    return response;
  },

  // ==================== Payment Receipts ====================
  getPaymentReceipt: async (paymentId: string) => {
    const response = await api.get(`/payments/${paymentId}/receipt/`);
    return response;
  },

  // ==================== Online Payments ====================
  createOnlinePaymentSession: async (invoiceId: string, data: any) => {
    const response = await api.post('/payments/session/', { invoice_id: invoiceId, ...data });
    return response;
  },
  getPaymentGateways: async () => {
    const response = await api.get('/payment-gateways/');
    return response;
  },
  getPaymentTransactions: async (params?: any) => {
    const response = await api.get('/payment-transactions/', { params });
    return response;
  },

  // ==================== Summary ====================
  getSummary: async (params?: { date?: string; period?: 'day' | 'week' | 'month' | 'year' }) => {
    const response = await api.get('/finance-summary/', { params });
    return response;
  },

  // ==================== Export/Import ====================
  exportInvoicesCSV: async (params?: any) => {
    const response = await api.get('/export/invoices/csv/', { params, responseType: 'blob' });
    return response;
  },
  exportPaymentsCSV: async (params?: any) => {
    const response = await api.get('/export/payments/csv/', { params, responseType: 'blob' });
    return response;
  },
  generateFinanceReportPDF: async (params?: any) => {
    const response = await api.get('/reports/finance/pdf/', { params, responseType: 'blob' });
    return response;
  },

  // ==================== Installment Plans ====================
  getInstallmentPlans: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/installment-plans/', { params });
    return response;
  },
  getInstallmentPlan: async (id: string) => {
    const response = await api.get(`/installment-plans/${id}/`);
    return response;
  },
  createInstallmentPlan: async (data: Partial<InstallmentPlan>) => {
    const response = await api.post('/installment-plans/', data);
    return response;
  },
  updateInstallmentPlan: async (id: string, data: Partial<InstallmentPlan>) => {
    const response = await api.patch(`/installment-plans/${id}/`, data);
    return response;
  },
  deleteInstallmentPlan: async (id: string) => {
    const response = await api.delete(`/installment-plans/${id}/`);
    return response;
  },

  // ==================== Scholarships ====================
  getScholarships: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/scholarships/', { params });
    return response;
  },
  getScholarship: async (id: string) => {
    const response = await api.get(`/scholarships/${id}/`);
    return response;
  },
  createScholarship: async (data: Partial<Scholarship>) => {
    const response = await api.post('/scholarships/', data);
    return response;
  },
  updateScholarship: async (id: string, data: Partial<Scholarship>) => {
    const response = await api.patch(`/scholarships/${id}/`, data);
    return response;
  },
  deleteScholarship: async (id: string) => {
    const response = await api.delete(`/scholarships/${id}/`);
    return response;
  },

  // ==================== Student Scholarships ====================
  getStudentScholarships: async (params?: { student_id?: string; is_active?: boolean }) => {
    const response = await api.get('/student-scholarships/', { params });
    return response;
  },
  getStudentScholarship: async (id: string) => {
    const response = await api.get(`/student-scholarships/${id}/`);
    return response;
  },
  createStudentScholarship: async (data: Partial<StudentScholarship>) => {
    const response = await api.post('/student-scholarships/', data);
    return response;
  },
  updateStudentScholarship: async (id: string, data: Partial<StudentScholarship>) => {
    const response = await api.patch(`/student-scholarships/${id}/`, data);
    return response;
  },
  deleteStudentScholarship: async (id: string) => {
    const response = await api.delete(`/student-scholarships/${id}/`);
    return response;
  },

  // ==================== Late Fee Rules ====================
  getLateFeeRules: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/late-fee-rules/', { params });
    return response;
  },
  getLateFeeRule: async (id: string) => {
    const response = await api.get(`/late-fee-rules/${id}/`);
    return response;
  },
  createLateFeeRule: async (data: Partial<LateFeeRule>) => {
    const response = await api.post('/late-fee-rules/', data);
    return response;
  },
  updateLateFeeRule: async (id: string, data: Partial<LateFeeRule>) => {
    const response = await api.patch(`/late-fee-rules/${id}/`, data);
    return response;
  },
  deleteLateFeeRule: async (id: string) => {
    const response = await api.delete(`/late-fee-rules/${id}/`);
    return response;
  },

  // ==================== Transaction Logs ====================
  getTransactionLogs: async (params?: { 
    student_id?: string; 
    type?: string; 
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.get('/transaction-logs/', { params });
    return response;
  },

  // ==================== Analytics ====================
  getMonthlyRevenueChart: async (params?: { year?: number; class_id?: string }) => {
    const response = await api.get('/analytics/monthly-revenue/', { params });
    return response;
  },
  getDefaulterReport: async (params?: { class_id?: string; threshold_days?: number }) => {
    try {
      return await api.get('/analytics/defaulters/', { params });
    } catch {
      return { data: EMPTY_DEFAULTERS, status: 200, statusText: 'OK', headers: {}, config: {} } as Awaited<
        ReturnType<typeof api.get>
      >;
    }
  },
  getClassWiseCollection: async (params?: { academic_year_id?: string }) => {
    const response = await api.get('/analytics/class-collection/', { params });
    return response;
  },
  getFinancialForecast: async (params?: { months?: number }) => {
    const response = await api.get('/analytics/forecast/', { params });
    return response;
  },

  // ==================== Finance Settings ====================
  getSettings: async () => {
    const response = await api.get('/finance-settings/');
    return response;
  },
  updateSettings: async (data: Partial<FinanceSettings>) => {
    const response = await api.patch('/finance-settings/', data);
    return response;
  },

  // ==================== Actions ====================
  createInstallmentInvoice: async (invoiceId: string) => {
    const response = await api.post(`/invoices/${invoiceId}/create-installments/`);
    return response;
  },
  applyScholarshipToInvoice: async (invoiceId: string, data: any) => {
    const response = await api.post(`/invoices/${invoiceId}/apply-scholarship/`, data);
    return response;
  },

  // ==================== PDF Reports ====================
  generateInvoicePDF: async (invoiceId: string) => {
    const response = await api.get(`/reports/invoice/${invoiceId}/pdf/`, { responseType: 'blob' });
    return response;
  },
  generateDefaulterReportPDF: async () => {
    const response = await api.get('/reports/defaulters/pdf/', { responseType: 'blob' });
    return response;
  },
  generateMonthlyFinanceReportPDF: async () => {
    const response = await api.get('/reports/monthly/finance/pdf/', { responseType: 'blob' });
    return response;
  },

  // ==================== Email Communication ====================
  sendFeeReminder: async (invoiceId: string) => {
    const response = await api.post(`/communication/reminder/${invoiceId}/`);
    return response;
  },
  sendPaymentConfirmation: async (paymentId: string) => {
    const response = await api.post(`/communication/confirmation/${paymentId}/`);
    return response;
  },
  sendDefaulterNotice: async (invoiceId: string) => {
    const response = await api.post(`/communication/defaulter-notice/${invoiceId}/`);
    return response;
  },
  sendDefaulterWhatsAppNotice: async (invoiceId: string) => {
    const response = await api.post(`/communication/defaulter-whatsapp/${invoiceId}/`);
    return response;
  },
  bulkSendReminders: async (data: any) => {
    const response = await api.post('/communication/bulk-reminders/', data);
    return response;
  },

  // ==================== Admin Trigger Endpoints ====================
  runMonthlyInvoices: async () => {
    const response = await api.post('/admin/run-monthly-invoices/');
    return response;
  },
  triggerApplyLateFees: async () => {
    const response = await api.post('/admin/apply-late-fees/');
    return response;
  },
  triggerSendReminders: async () => {
    const response = await api.post('/admin/send-reminders/');
    return response;
  }
};

export default financeService;