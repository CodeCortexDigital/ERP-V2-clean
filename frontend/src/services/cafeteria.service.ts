// School cafeteria: food, weekly menu, meal plans, the till, prepaid accounts, top-ups and reports.
import api from './api';

const base = '/auth/cafeteria';

export interface Food {
  id: string; name: string; category: string; category_label: string; price: number; description: string; allergens: string;
  allergen_list: string[]; is_vegetarian: boolean; is_halal: boolean; is_available: boolean;
}
export interface MenuMeal { id: string; date: string; meal: 'breakfast' | 'lunch' | 'snack'; meal_label: string; note: string; items: Food[] }
export interface CafTxn {
  id: string; kind: 'top_up' | 'purchase' | 'meal_plan' | 'refund' | 'adjustment'; kind_label: string; amount: number; balance_after: number;
  items: Array<{ item_id: string; name: string; quantity: number; price: string }>; method: string; meal: string; note: string;
  refunded: boolean; student: { id: string; full_name: string }; by: string; at: string;
}
export interface CafAccount {
  id: string; student: { id: string; full_name: string; student_id: string; class_name: string };
  balance: number; daily_limit: number | null; own_limit: boolean; spent_today: number; left_today: number | null;
  is_blocked: boolean; low: boolean; allergies: string; dietary_restrictions: string; severe_allergy: boolean;
  meal_plans: Array<{ id: string; member_id: string; name: string; meal: string; served_today: boolean }>;
  pending_top_ups: Array<{ id: string; amount: number; invoice_number: string | null }>; transactions?: CafTxn[];
}
export interface Plan {
  id: string; name: string; meal: string; monthly_fee: number; description: string; is_active: boolean;
  members: Array<{ id: string; student: { id: string; full_name: string; class_name: string }; start_date: string }>;
}
export interface CafSettings { default_daily_limit: number | null; low_balance_level: number; allow_negative: number }
export interface CafReport {
  days: number; sales: number; transactions: number; meal_plan_meals: number; by_day: Array<{ date: string; sales: number }>;
  top_items: Array<{ name: string; quantity: number; value: number }>; top_ups: Array<{ method: string; amount: number }>;
  balances_held: number; low_balances: number; below_zero: number; meal_plan_members: number;
}

/** Meals first, then snacks, drinks, fruit, desserts. */
const ORDER = ['meal', 'snack', 'drink', 'fruit', 'dessert', 'other'];
export const byCategory = (a: Food, b: Food) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.name.localeCompare(b.name);

const cafeteria = {
  settings: async () => (await api.get<CafSettings>(`${base}/settings/`)).data,
  saveSettings: async (body: Partial<Record<keyof CafSettings, string | number | null>>) => (await api.patch<CafSettings>(`${base}/settings/`, body)).data,
  items: async (available = false) => (await api.get<Food[]>(`${base}/items/`, { params: available ? { available: 1 } : {} })).data,
  saveItem: async (body: Partial<Food>) => (body.id ? (await api.patch<Food>(`${base}/items/${body.id}/`, body)).data : (await api.post<Food>(`${base}/items/`, body)).data),
  removeItem: async (id: string) => api.delete(`${base}/items/${id}/`),
  menu: async (week = '') => (await api.get<{ week: string; days: MenuMeal[] }>(`${base}/menu/`, { params: week ? { week } : {} })).data,
  setMenu: async (date: string, meal: string, item_ids: string[], note = '') => (await api.put<MenuMeal>(`${base}/menu/`, { date, meal, item_ids, note })).data,
  copyWeek: async (from_week: string, to_week: string) => (await api.post<{ copied: number }>(`${base}/menu/copy/`, { from_week, to_week })).data,
  plans: async () => (await api.get<Plan[]>(`${base}/plans/`)).data,
  addPlan: async (body: { name: string; meal: string; monthly_fee: string; description?: string }) => (await api.post<Plan[]>(`${base}/plans/`, body)).data,
  updatePlan: async (id: string, body: Record<string, unknown>) => (await api.patch(`${base}/plans/${id}/`, body)).data,
  join: async (planId: string, student_id: string) => (await api.post(`${base}/plans/${planId}/members/`, { student_id })).data,
  leave: async (planId: string, student_id: string) => api.delete(`${base}/plans/${planId}/members/`, { params: { student_id } }),
  planInvoices: async (month: string) => (await api.post<{ created: number; already_billed: number; month: string }>(`${base}/plans/invoices/`, { month })).data,
  find: async (q: string) => (await api.get<CafAccount[]>(`${base}/till/find/`, { params: { q } })).data,
  charge: async (student_id: string, items: Array<{ item_id: string; quantity: number }>, extra: { meal_plan?: boolean; override_allergy?: boolean } = {}) =>
    (await api.post<{ transaction: CafTxn; account: CafAccount }>(`${base}/till/charge/`, { student_id, items, ...extra })).data,
  accounts: async (params: { q?: string; low?: boolean } = {}) =>
    (await api.get<{ results: CafAccount[]; total_balance: number }>(`${base}/accounts/`, { params: { ...(params.q ? { q: params.q } : {}), ...(params.low ? { low: 1 } : {}) } })).data,
  account: async (studentId: string) => (await api.get<CafAccount>(`${base}/accounts/${studentId}/`)).data,
  topUp: async (studentId: string, amount: string, method = 'cash') => (await api.post<CafAccount>(`${base}/accounts/${studentId}/top-up/`, { amount, method })).data,
  adjust: async (studentId: string, amount: string, note: string) => (await api.post<CafAccount>(`${base}/accounts/${studentId}/adjust/`, { amount, note })).data,
  block: async (studentId: string, blocked: boolean) => (await api.post<CafAccount>(`${base}/accounts/${studentId}/block/`, { blocked })).data,
  refund: async (txnId: string) => (await api.post<CafTxn>(`${base}/transactions/${txnId}/refund/`, {})).data,
  mine: async () => (await api.get<{ children: CafAccount[]; week: string; menu: MenuMeal[]; can_set_limit: boolean }>(`${base}/mine/`)).data,
  setLimit: async (studentId: string, daily_limit: string) => (await api.post<CafAccount>(`${base}/mine/${studentId}/limit/`, { daily_limit })).data,
  requestTopUp: async (studentId: string, amount: string) => (await api.post<CafAccount>(`${base}/mine/${studentId}/top-up/`, { amount })).data,
  report: async (days = 30) => (await api.get<CafReport>(`${base}/report/`, { params: { days } })).data,
};

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;
export default cafeteria;
