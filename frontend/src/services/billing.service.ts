// Family billing: accounts, statements, family payments, credit, refunds, online payments, payment plans.
import api from './api';

const base = '/auth/finance';
const list = <T,>(d: any): T[] => (Array.isArray(d) ? d : d?.results || []);

export type AccountKind = 'household' | 'student';

export interface FamilyAccount {
  type: AccountKind;
  id: string;
  name: string;
  students: string[];
  outstanding: number;
  credit: number;
}

export interface StatementLine {
  date: string | null;
  type: 'invoice' | 'payment' | 'refund' | 'credit';
  ref: string;
  student: string;
  description: string;
  amount: number;
  balance: number;
  id: string;
  due_date?: string | null;
  status?: string;
  refundable?: number;
  open_amount?: number;
}

export interface Statement {
  account: { type: AccountKind; id: string; name: string; address: string };
  students: Array<{ id: string; full_name: string; student_id: string; class_name: string }>;
  billing_contacts: Array<{ id: string; name: string; email: string; phone: string }>;
  currency: string;
  period: { from: string | null; to: string | null };
  opening_balance: number;
  closing_balance: number;
  outstanding: number;
  credit_available: number;
  lines: StatementLine[];
  generated_at: string;
}

export interface GatewayConfig {
  id: string;
  provider: 'stripe' | 'jazzcash' | 'easypaisa';
  provider_display: string;
  name: string;
  merchant_id: string;
  api_url: string;
  callback_url: string;
  is_active: boolean;
  has_api_key: boolean;
  has_api_secret: boolean;
  has_webhook_secret: boolean;
}

export interface InstallmentPlan {
  id: string;
  name: string;
  description: string;
  total_amount: number | string;
  number_of_installments: number;
  installment_amount: number | string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | string;
  is_active: boolean;
}

export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'credit_card', label: 'Card (in person)' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online payment' },
];

export const REFUND_METHODS: Array<{ value: string; label: string }> = [
  { value: 'original', label: 'Back to the original payment method' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'account_credit', label: 'Keep as account credit' },
];

const acct = (kind: AccountKind, id: string) => `${base}/families/${kind}/${id}`;

const billingService = {
  accounts: async (params: { search?: string; owing?: boolean } = {}) => (await api.get(`${base}/families/`, {
    params: { ...(params.search ? { search: params.search } : {}), ...(params.owing ? { owing: 1 } : {}) },
  })).data as { results: FamilyAccount[]; total_outstanding: number; total_credit: number },
  myAccounts: async () => (await api.get<FamilyAccount[]>(`${base}/families/mine/`)).data,
  statement: async (kind: AccountKind, id: string, from = '', to = '') =>
    (await api.get<Statement>(`${acct(kind, id)}/statement/`, { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } })).data,
  recordPayment: async (kind: AccountKind, id: string, body: { amount: string; method: string; reference?: string; note?: string }) =>
    (await api.post(`${acct(kind, id)}/payments/`, body)).data as {
      allocated: Array<{ invoice: string; student: string; amount: number }>; credit_added: number; statement: Statement;
    },
  giveCredit: async (kind: AccountKind, id: string, amount: string, note: string) =>
    (await api.post<Statement>(`${acct(kind, id)}/credit/`, { amount, note, kind: 'goodwill' })).data,
  applyCredit: async (kind: AccountKind, id: string) => (await api.post<Statement>(`${acct(kind, id)}/apply-credit/`, {})).data,
  emailStatement: async (kind: AccountKind, id: string) =>
    (await api.post<{ sent_to: string[] }>(`${acct(kind, id)}/email-statement/`, {})).data,
  refund: async (paymentId: string, body: { amount: string; method: string; reason?: string }) =>
    (await api.post(`${base}/payments/${paymentId}/refund/`, body)).data,

  providers: async () => (await api.get<Array<{ code: string; label: string }>>(`${base}/payments/providers/`)).data,
  startOnlinePayment: async (invoiceId: string, provider: string) =>
    (await api.post(`${base}/payments/session/`, { invoice_id: invoiceId, provider, return_url: window.location.href.split('?')[0] })).data as {
      checkout_url: string; amount: number; currency: string;
    },

  gateways: async () => list<GatewayConfig>((await api.get(`${base}/payment-gateways/`)).data),
  saveGateway: async (body: Partial<GatewayConfig> & { api_key?: string; api_secret?: string; webhook_secret?: string }) =>
    body.id ? (await api.patch(`${base}/payment-gateways/${body.id}/`, body)).data : (await api.post(`${base}/payment-gateways/`, body)).data,
  deleteGateway: async (id: string) => api.delete(`${base}/payment-gateways/${id}/`),

  plans: async () => list<InstallmentPlan>((await api.get(`${base}/installment-plans/`)).data),
  savePlan: async (body: Partial<InstallmentPlan>) =>
    body.id ? (await api.patch(`${base}/installment-plans/${body.id}/`, body)).data : (await api.post(`${base}/installment-plans/`, body)).data,
  deletePlan: async (id: string) => api.delete(`${base}/installment-plans/${id}/`),
  openInvoices: async (search: string) => list<any>((await api.get(`${base}/invoices/`, { params: { search, status: 'issued' } })).data),
  splitInvoice: async (invoiceId: string, planId: string) =>
    (await api.post(`${base}/invoices/${invoiceId}/create-installments/`, { installment_plan_id: planId, plan_id: planId })).data,
};

export default billingService;
