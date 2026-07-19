// frontend/src/services/payroll.service.ts
import api, { extractListData } from './api';

export interface Payslip {
  id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  paid_amount: number;
  status: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  employee_name?: string;
  employee_id?: string;
}

export const payrollService = {
  /** GET /auth/finance/payslips/ — current employee's payslips */
  getPayslips: async (): Promise<Payslip[]> => {
    try {
      const res = await api.get('/auth/finance/payslips/');
      return extractListData<Payslip>(res.data);
    } catch {
      return [];
    }
  },
};

export default payrollService;
