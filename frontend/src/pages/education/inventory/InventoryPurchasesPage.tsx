import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import inventory, { errorText, InvItem, Order, Supplier } from '@/services/inventory.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const TONE: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', ordered: 'bg-blue-100 text-blue-700', partial: 'bg-amber-100 text-amber-800', received: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-slate-100 text-slate-400' };
type Line = { item_id: string; quantity: string; unit_cost: string };

function NewOrder({ suppliers, items, start, onSaved }: { suppliers: Supplier[]; items: InvItem[]; start?: { supplier_id: string; lines: Line[] }; onSaved: () => void }) {
  const [supplier, setSupplier] = useState(start?.supplier_id || suppliers[0]?.id || '');
  const [expected, setExpected] = useState('');
  const [lines, setLines] = useState<Line[]>(start?.lines.length ? start.lines : [{ item_id: '', quantity: '', unit_cost: '' }]);
  const setLine = (i: number, p: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);
  const save = async () => {
    try {
      const o = await inventory.createOrder({ supplier_id: supplier, expected_date: expected || undefined, lines: lines.filter((l) => l.item_id) });
      toast.success(`${o.number} saved as a draft.`);
      onSaved();
    } catch (e) { toast.error(errorText(e, 'Could not save the order.')); }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-600">Supplier<select className={`${input} mt-1`} value={supplier} onChange={(e) => setSupplier(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Expected by<input type="date" className={`${input} mt-1`} value={expected} onChange={(e) => setExpected(e.target.value)} /></label>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th>Item</th><th className="w-28">Quantity</th><th className="w-32">Unit cost</th><th className="w-28 text-right">Total</th><th /></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="pr-2 py-1"><select aria-label={`Line ${i + 1} item`} className={input} value={l.item_id} onChange={(e) => { const it = items.find((x) => x.id === e.target.value); setLine(i, { item_id: e.target.value, unit_cost: l.unit_cost || String(it?.unit_cost ?? '') }); }}>
                <option value="">Choose…</option>{items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.quantity} in stock)</option>)}
              </select></td>
              <td className="pr-2"><input aria-label={`Line ${i + 1} quantity`} type="number" min={0} className={input} value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} /></td>
              <td className="pr-2"><input aria-label={`Line ${i + 1} cost`} type="number" min={0} className={input} value={l.unit_cost} onChange={(e) => setLine(i, { unit_cost: e.target.value })} /></td>
              <td className="text-right">{formatMoney((Number(l.quantity) || 0) * (Number(l.unit_cost) || 0))}</td>
              <td className="pl-2"><button onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove line" className="text-rose-600"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center">
        <button onClick={() => setLines([...lines, { item_id: '', quantity: '', unit_cost: '' }])} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1 mr-auto"><Plus size={12} /> Add a line</button>
        <span className="text-sm font-black mr-3">Total {formatMoney(total)}</span>
        <button onClick={save} disabled={!supplier || !lines.some((l) => l.item_id && Number(l.quantity) > 0)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">Save draft</button>
      </div>
    </div>
  );
}

function OrderView({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [o, setO] = useState<Order | null>(null);
  const [got, setGot] = useState<Record<string, string>>({});
  const [bill, setBill] = useState('');
  const load = () => inventory.order(id).then((x) => { setO(x); setBill(x.supplier_invoice); setGot(Object.fromEntries((x.lines || []).map((l) => [l.id, String(l.outstanding)]))); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!o) return <Loader2 className="animate-spin text-slate-400" />;
  const act = async (action: 'order' | 'receive' | 'cancel') => {
    try {
      await inventory.orderAction(o.id, action, action === 'receive' ? { supplier_invoice: bill, lines: Object.entries(got).map(([line_id, quantity]) => ({ line_id, quantity })) } : {});
      toast.success(action === 'order' ? 'Marked as sent to the supplier.' : action === 'receive' ? 'Goods added to stock.' : 'Order cancelled.');
      load(); onChanged();
    } catch (e) { toast.error(errorText(e, 'That did not work.')); }
  };
  const receiving = o.status === 'ordered' || o.status === 'partial';
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-600">{o.supplier.name} · <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE[o.status]}`}>{o.status_label}</span>{o.order_date ? ` · sent ${o.order_date}` : ''}{o.expected_date ? ` · expected ${o.expected_date}` : ''}</p>
      <table className="w-full">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">Item</th><th className="text-right">Ordered</th><th className="text-right">Received</th><th className="text-right">Unit cost</th><th className="text-right">Total</th>{receiving && <th className="text-right w-28">Arrived now</th>}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {(o.lines || []).map((l) => (
            <tr key={l.id}>
              <td className="py-1.5">{l.item.name}</td><td className="text-right">{l.quantity}</td><td className="text-right">{l.received_quantity}</td>
              <td className="text-right">{formatMoney(l.unit_cost)}</td><td className="text-right">{formatMoney(l.total)}</td>
              {receiving && <td className="text-right"><input aria-label={`Arrived ${l.item.name}`} type="number" min={0} max={l.outstanding} className="w-24 rounded border border-slate-300 px-2 py-1 text-sm text-right" value={got[l.id] || ''} onChange={(e) => setGot({ ...got, [l.id]: e.target.value })} /></td>}
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="font-black"><td className="py-1.5">Total</td><td colSpan={3} /><td className="text-right">{formatMoney(o.total)}</td>{receiving && <td />}</tr></tfoot>
      </table>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {receiving && <input aria-label="Supplier bill number" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" placeholder="Supplier's bill number" value={bill} onChange={(e) => setBill(e.target.value)} />}
        {o.status === 'draft' && <button onClick={() => act('order')} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">Mark as sent</button>}
        {receiving && <button onClick={() => act('receive')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold">Receive into stock</button>}
        {['draft', 'ordered'].includes(o.status) && <button onClick={() => window.confirm('Cancel this order?') && act('cancel')} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold">Cancel order</button>}
      </div>
    </div>
  );
}

/** Office: purchase orders (draft → sent → received) and the reorder list of low items. */
export default function InventoryPurchasesPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [reorder, setReorder] = useState<Array<{ supplier: { id: string; name: string } | null; items: InvItem[] }>>([]);
  const [creating, setCreating] = useState<{ supplier_id: string; lines: Line[] } | null>(null);
  const [open, setOpen] = useState<Order | null>(null);
  const load = () => {
    inventory.orders().then(setOrders).catch(() => setOrders([]));
    inventory.reorder().then(setReorder).catch(() => undefined);
    inventory.items().then((r) => setItems(r.results)).catch(() => undefined);
  };
  useEffect(() => { load(); inventory.suppliers().then(setSuppliers).catch(() => undefined); }, []);

  return (
    <div className="space-y-4">
      {reorder.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-black text-amber-900 flex items-center gap-2 mb-2"><AlertTriangle size={15} /> Running low: suggested orders</h2>
          {reorder.map((g) => (
            <div key={g.supplier?.id || 'none'} className="flex flex-wrap items-center gap-2 py-1 text-sm text-amber-900">
              <b className="mr-1">{g.supplier?.name || 'No usual supplier'}:</b>
              <span className="mr-auto">{g.items.map((i) => `${i.name} ×${i.suggested}${i.on_order ? ` (${i.on_order} on order)` : ''}`).join(', ')}</span>
              {g.supplier && g.items.some((i) => (i.suggested || 0) > 0) && (
                <button onClick={() => setCreating({ supplier_id: g.supplier!.id, lines: g.items.filter((i) => (i.suggested || 0) > 0).map((i) => ({ item_id: i.id, quantity: String(i.suggested), unit_cost: String(i.unit_cost) })) })}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold">Make an order</button>
              )}
            </div>
          ))}
        </section>
      )}
      <div className="flex justify-end">
        <button onClick={() => setCreating({ supplier_id: '', lines: [] })} disabled={!suppliers.length} title={suppliers.length ? '' : 'Add a supplier first'} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-50"><Plus size={14} /> New purchase order</button>
      </div>
      {!orders ? <Loader2 className="animate-spin text-slate-400" /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 px-3">Order</th><th>Supplier</th><th>Status</th><th>Sent</th><th>Items</th><th className="text-right pr-3">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(o)}>
                  <td className="py-2 px-3 font-semibold">{o.number}</td><td>{o.supplier.name}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE[o.status]}`}>{o.status_label}</span></td>
                  <td className="text-xs">{o.order_date || '—'}</td><td>{o.line_count}</td><td className="text-right pr-3">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No purchase orders yet.</p>}
        </div>
      )}
      {creating && <Modal open onClose={() => setCreating(null)} title="New purchase order" size="xl"><NewOrder suppliers={suppliers} items={items} start={creating.supplier_id ? creating : undefined} onSaved={() => { setCreating(null); load(); }} /></Modal>}
      {open && <Modal open onClose={() => { setOpen(null); load(); }} title={open.number} size="xl"><OrderView id={open.id} onChanged={load} /></Modal>}
    </div>
  );
}
