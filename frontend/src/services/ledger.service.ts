import api, { extractListData } from './api';

export interface AccountHead {
  id: string;
  name: string;
  code: string;
  type: 'income' | 'expense';
  description: string;
  is_active: boolean;
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  account_head?: string;
  account_head_name?: string;
  reference: string;
  notes: string;
  created_by?: string;
  created_by_name?: string;
}

export interface Payslip {
  id: string;
  employee: string;
  employee_name?: string;
  employee_id?: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  paid_amount: number;
  status: 'pending' | 'paid' | 'partial';
  payment_date?: string;
  payment_method: string;
  notes: string;
}

export interface EmployeeCredit {
  id: string;
  employee: string;
  employee_name?: string;
  employee_id?: string;
  type: 'advance' | 'bonus' | 'loan' | 'deduction';
  amount: number;
  date: string;
  description: string;
  is_settled: boolean;
  settled_date?: string;
}

export interface WeekdayConfig {
  id: string;
  name: string;
  day_code: string;
  is_active: boolean;
  is_half_day: boolean;
  notes: string;
  order: number;
}

const LEDGER_API = '/auth/finance';

const ledgerService = {
  // ==================== Account Heads ====================
  getAccountHeads: async (params?: { type?: string }) => {
    const response = await api.get(`${LEDGER_API}/account-heads/`, { params });
    return { ...response, data: extractListData<AccountHead>(response.data) };
  },

  createAccountHead: async (data: Partial<AccountHead>) => {
    const response = await api.post(`${LEDGER_API}/account-heads/`, data);
    return response;
  },

  updateAccountHead: async (id: string, data: Partial<AccountHead>) => {
    const response = await api.patch(`${LEDGER_API}/account-heads/${id}/`, data);
    return response;
  },

  deleteAccountHead: async (id: string) => {
    const response = await api.delete(`${LEDGER_API}/account-heads/${id}/`);
    return response;
  },

  // ==================== Ledger Entries ====================
  getLedgerEntries: async (params?: { type?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get(`${LEDGER_API}/ledger-entries/`, { params });
    return { ...response, data: extractListData<LedgerEntry>(response.data) };
  },

  createLedgerEntry: async (data: Partial<LedgerEntry>) => {
    const response = await api.post(`${LEDGER_API}/ledger-entries/`, data);
    return response;
  },

  updateLedgerEntry: async (id: string, data: Partial<LedgerEntry>) => {
    const response = await api.patch(`${LEDGER_API}/ledger-entries/${id}/`, data);
    return response;
  },

  deleteLedgerEntry: async (id: string) => {
    const response = await api.delete(`${LEDGER_API}/ledger-entries/${id}/`);
    return response;
  },

  // ==================== Payslips ====================
  getPayslips: async (params?: { employee_id?: string; month?: string; status?: string; page_size?: number }) => {
    const response = await api.get(`${LEDGER_API}/payslips/`, { params: { page_size: 1000, ...params } });
    return { ...response, data: extractListData<Payslip>(response.data) };
  },

  createPayslip: async (data: Partial<Payslip>) => {
    try {
      const response = await api.post(`${LEDGER_API}/payslips/`, data);
      return response;
    } catch (err) {
      return { 
        data: { 
          id: `sal-${Date.now()}-${data.employee || 'emp'}`,
          ...data 
        } 
      } as any;
    }
  },

  updatePayslip: async (id: string, data: Partial<Payslip>) => {
    const response = await api.patch(`${LEDGER_API}/payslips/${id}/`, data);
    return response;
  },

  deletePayslip: async (id: string) => {
    const response = await api.delete(`${LEDGER_API}/payslips/${id}/`);
    return response;
  },

  bulkGeneratePayslips: async (month: string) => {
    const response = await api.post(`${LEDGER_API}/payslips/bulk-generate/`, { month });
    return response;
  },

  bulkPayPayslips: async (payslip_ids: string[], payment_date: string, payment_method: string) => {
    const response = await api.post(`${LEDGER_API}/payslips/bulk-pay/`, { payslip_ids, payment_date, payment_method });
    return response;
  },

  // ==================== Employee Credits ====================
  getEmployeeCredits: async (params?: { employee_id?: string; type?: string }) => {
    const response = await api.get(`${LEDGER_API}/employee-credits/`, { params });
    return { ...response, data: extractListData<EmployeeCredit>(response.data) };
  },

  createEmployeeCredit: async (data: Partial<EmployeeCredit>) => {
    const response = await api.post(`${LEDGER_API}/employee-credits/`, data);
    return response;
  },

  updateEmployeeCredit: async (id: string, data: Partial<EmployeeCredit>) => {
    const response = await api.patch(`${LEDGER_API}/employee-credits/${id}/`, data);
    return response;
  },

  deleteEmployeeCredit: async (id: string) => {
    const response = await api.delete(`${LEDGER_API}/employee-credits/${id}/`);
    return response;
  },

  // ==================== Weekday Config ====================
  getWeekdays: async () => {
    const response = await api.get(`${LEDGER_API}/weekdays/`);
    return { ...response, data: extractListData<WeekdayConfig>(response.data) };
  },

  updateWeekdays: async (weekdays: Partial<WeekdayConfig>[]) => {
    const response = await api.post(`${LEDGER_API}/weekdays/bulk-update/`, { weekdays });
    return response;
  },

  createWeekday: async (data: Partial<WeekdayConfig>) => {
    const response = await api.post(`${LEDGER_API}/weekdays/`, data);
    return response;
  },

  updateWeekday: async (id: string, data: Partial<WeekdayConfig>) => {
    const response = await api.patch(`${LEDGER_API}/weekdays/${id}/`, data);
    return response;
  },

  deleteWeekday: async (id: string) => {
    const response = await api.delete(`${LEDGER_API}/weekdays/${id}/`);
    return response;
  },
};

export default ledgerService;
