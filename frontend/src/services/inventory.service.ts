// School inventory: items and stock, movements, suppliers, purchase orders, reorder list and reports.
import api from './api';

const base = '/auth/inventory';

export interface InvItem {
  id: string; sku: string; name: string; unit: string; unit_label: string; category: { id: string; name: string } | null;
  description: string; location: string; quantity: number; reorder_level: number; reorder_quantity: number; unit_cost: number;
  value: number; sale_price: number | null; is_active: boolean; low: boolean; preferred_supplier: { id: string; name: string } | null;
  movements?: InvMovement[]; on_order?: number; suggested?: number;
}
export interface InvMovement {
  id: string; item: { id: string; name: string; sku: string; unit: string }; kind: string; kind_label: string; quantity: number;
  unit_cost: number; balance_after: number; issued_to: string; student: { id: string; full_name: string } | null;
  invoice_number: string | null; reference: string; note: string; by: string; at: string;
}
export interface Supplier { id: string; name: string; contact_person: string; phone: string; email: string; address: string; tax_number: string; notes: string; is_active: boolean; orders: number }
export interface Category { id: string; name: string; description: string; items: number }
export interface OrderLine { id: string; item: { id: string; name: string; sku: string; unit: string }; quantity: number; unit_cost: number; received_quantity: number; outstanding: number; total: number }
export interface Order {
  id: string; number: string; status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'; status_label: string;
  supplier: { id: string; name: string }; order_date: string | null; expected_date: string | null; supplier_invoice: string;
  notes: string; total: number; created_at: string; line_count: number; lines?: OrderLine[];
}
export interface InvReport {
  days: number; items: number; value: number; low: InvItem[]; by_category: Array<{ category: string; items: number; value: number; low: number }>;
  most_used: Array<{ id: string; name: string; unit: string; quantity: number; value: number }>;
  by_department: Array<{ issued_to: string; value: number }>; purchases_by_supplier: Array<{ supplier: string; value: number }>;
  sales: number; open_orders: number;
}
export const UNITS: Array<[string, string]> = [['pcs', 'Pieces'], ['box', 'Boxes'], ['pack', 'Packs'], ['ream', 'Reams'], ['set', 'Sets'], ['pair', 'Pairs'], ['kg', 'Kilograms'], ['litre', 'Litres'], ['metre', 'Metres']];
export const KINDS: Array<[string, string, 'in' | 'out']> = [
  ['received', 'Received (bought)', 'in'], ['returned', 'Returned to store', 'in'], ['count_up', 'Stock count: more than recorded', 'in'],
  ['issued', 'Issued to a department / person', 'out'], ['sold', 'Sold to a student (billed)', 'out'],
  ['damaged', 'Damaged / lost', 'out'], ['count_down', 'Stock count: less than recorded', 'out'],
];

const inventory = {
  items: async (params: { q?: string; category?: string; low?: boolean; sellable?: boolean } = {}) =>
    (await api.get<{ results: InvItem[]; low_count: number; value: number }>(`${base}/items/`, {
      params: { ...(params.q ? { q: params.q } : {}), ...(params.category ? { category: params.category } : {}), ...(params.low ? { low: 1 } : {}), ...(params.sellable ? { sellable: 1 } : {}) },
    })).data,
  item: async (id: string) => (await api.get<InvItem>(`${base}/items/${id}/`)).data,
  saveItem: async (body: Record<string, unknown>) => (body.id ? (await api.patch<InvItem>(`${base}/items/${body.id}/`, body)).data : (await api.post<InvItem>(`${base}/items/`, body)).data),
  removeItem: async (id: string) => api.delete(`${base}/items/${id}/`),
  move: async (id: string, body: Record<string, unknown>) => (await api.post<{ movement: InvMovement; item: InvItem }>(`${base}/items/${id}/move/`, body)).data,
  movements: async (params: { kind?: string; q?: string } = {}) => (await api.get<InvMovement[]>(`${base}/movements/`, { params })).data,
  exportCsv: async () => (await api.get(`${base}/items/export/`, { responseType: 'blob' })).data as Blob,
  categories: async () => (await api.get<Category[]>(`${base}/categories/`)).data,
  addCategory: async (name: string) => (await api.post<Category>(`${base}/categories/`, { name })).data,
  removeCategory: async (id: string) => api.delete(`${base}/categories/${id}/`),
  suppliers: async () => (await api.get<Supplier[]>(`${base}/suppliers/`)).data,
  saveSupplier: async (s: Partial<Supplier>) => (s.id ? (await api.patch<Supplier>(`${base}/suppliers/${s.id}/`, s)).data : (await api.post<Supplier>(`${base}/suppliers/`, s)).data),
  removeSupplier: async (id: string) => api.delete(`${base}/suppliers/${id}/`),
  orders: async (status = '') => (await api.get<Order[]>(`${base}/orders/`, { params: status ? { status } : {} })).data,
  order: async (id: string) => (await api.get<Order>(`${base}/orders/${id}/`)).data,
  createOrder: async (body: { supplier_id: string; expected_date?: string; notes?: string; lines: Array<{ item_id: string; quantity: string; unit_cost: string }> }) =>
    (await api.post<Order>(`${base}/orders/`, body)).data,
  updateOrder: async (id: string, body: Record<string, unknown>) => (await api.patch<Order>(`${base}/orders/${id}/`, body)).data,
  removeOrder: async (id: string) => api.delete(`${base}/orders/${id}/`),
  orderAction: async (id: string, action: 'order' | 'receive' | 'cancel', body: Record<string, unknown> = {}) =>
    (await api.post<Order>(`${base}/orders/${id}/${action}/`, body)).data,
  reorder: async () => (await api.get<Array<{ supplier: { id: string; name: string } | null; items: InvItem[] }>>(`${base}/reorder/`)).data,
  report: async (days = 30) => (await api.get<InvReport>(`${base}/report/`, { params: { days } })).data,
};

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;
export default inventory;
