// Plans & billing (P11).
import api from './api';

export interface PlanModule { key: string; label: string; included: boolean }
export interface Plan {
  code: string; name: string; description: string; currency: string; price_monthly: number; price_yearly: number;
  student_limit: number | null; staff_limit: number | null; trial_days: number; modules: PlanModule[]; contact_sales: boolean;
  fits?: boolean; too_small?: string[]; is_public?: boolean;
}
export interface MySubscription {
  status: 'trialing' | 'active' | 'past_due' | 'read_only' | 'suspended' | 'cancelled' | 'legacy' | 'none';
  modules: string[]; can_write: boolean;
  // Administrators only:
  plan?: Plan | null; status_label?: string; billing_cycle?: 'monthly' | 'yearly'; trial_ends_at?: string | null;
  trial_days_left?: number | null; current_period_end?: string | null; cancel_at_period_end?: boolean; grace_ends_at?: string | null;
  pending_plan?: Plan | null; pending_cycle?: string; usage?: { students: number; staff: number };
  limits?: { students: number | null; staff: number | null }; plans?: Plan[]; events?: { when: string; summary: string; by: string }[];
}
export interface PlatformRow {
  school_id: string; name: string; code: string; is_active: boolean; plan: string | null; plan_code: string | null;
  status: string; status_label: string; usage: { students: number; staff: number }; trial_ends_at?: string | null;
  current_period_end?: string | null; billing_cycle?: string;
}

export interface PlatformInvoice {
  id: string; number: string; kind: 'period' | 'proration'; kind_label: string; plan: string; billing_cycle: string;
  period_start: string; period_end: string; currency: string; subtotal: number; tax_label: string; tax_rate: number;
  tax_amount: number; tax_note: string; total: number; status: 'open' | 'paid' | 'void' | 'overdue'; issue_date: string;
  due_date: string; paid_at: string | null; paid_via: string; payment_reference: string; school: string;
  bill_to: { legal_name?: string; address?: string; country?: string; tax_id?: string; email?: string };
}
export interface PaymentOptions { card: boolean; bank_details: string }
export interface BillingDetails { legal_name: string; address: string; country: string; tax_id: string; email: string }
export interface TaxRuleRow { country: string; label: string; rate: number; exempt_with_tax_id: boolean }

export const errorText = (e: any, fallback: string) => e?.response?.data?.detail || e?.response?.data?.error || fallback;

const subscriptionService = {
  details: () => api.get('/billing/details/').then((r) => r.data.details as BillingDetails),
  saveDetails: (d: Partial<BillingDetails>) => api.put('/billing/details/', d).then((r) => r.data.details as BillingDetails),
  invoices: () => api.get('/billing/invoices/').then((r) => r.data as { results: PlatformInvoice[]; payment: PaymentOptions }),
  invoice: (id: string) => api.get(`/billing/invoices/${id}/`).then((r) => r.data as { invoice: PlatformInvoice; payment: PaymentOptions; seller: { name: string; address: string; tax_id: string } }),
  pay: (id: string) => api.post(`/billing/invoices/${id}/pay/`, { origin: window.location.origin }).then((r) => r.data as { url: string }),
  platformInvoices: (status = '') => api.get('/billing/platform/invoices/', { params: status ? { status } : {} }).then((r) => r.data.results as PlatformInvoice[]),
  invoiceAction: (id: string, action: 'mark_paid' | 'void', extra: Record<string, string> = {}) => api.post(`/billing/platform/invoices/${id}/`, { action, ...extra }).then((r) => r.data),
  runBilling: () => api.post('/billing/platform/run/').then((r) => r.data as { issued: number; reminded: number }),
  taxRules: () => api.get('/billing/platform/tax/').then((r) => r.data.rules as TaxRuleRow[]),
  saveTax: (t: Partial<TaxRuleRow>) => api.put('/billing/platform/tax/', t).then((r) => r.data.rules as TaxRuleRow[]),
  deleteTax: (country: string) => api.delete('/billing/platform/tax/', { params: { country } }).then((r) => r.data.rules as TaxRuleRow[]),
  plans: () => api.get('/billing/plans/').then((r) => r.data.plans as Plan[]),
  mine: () => api.get('/billing/subscription/').then((r) => r.data as MySubscription),
  change: (plan: string, cycle: string) => api.post('/billing/subscription/change/', { plan, cycle }).then((r) => r.data as { message: string }),
  cancel: (resume = false) => api.post('/billing/subscription/cancel/', resume ? { resume: true } : {}).then((r) => r.data as { message: string }),
  platform: () => api.get('/billing/platform/').then((r) => r.data as { schools: PlatformRow[]; plans: Plan[]; statuses: Record<string, string> }),
  setSchool: (id: string, body: Record<string, unknown>) => api.post(`/billing/platform/schools/${id}/`, body).then((r) => r.data),
  savePlan: (code: string, body: Record<string, unknown>) => api.put(`/billing/platform/plans/${code}/`, body).then((r) => r.data as Plan),
};

export default subscriptionService;
