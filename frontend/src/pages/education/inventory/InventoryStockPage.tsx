import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Download, Loader2, PackagePlus, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import inventory, { Category, errorText, InvItem, KINDS, Supplier, UNITS } from '@/services/inventory.service';
import { saveBlob } from '@/services/portal.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const L = ({ t, children, wide }: { t: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={`text-xs font-semibold text-slate-600 ${wide ? 'sm:col-span-2' : ''}`}>{t}<div className="mt-1">{children}</div></label>
);

function ItemForm({ item, categories, suppliers, onSaved }: { item?: InvItem; categories: Category[]; suppliers: Supplier[]; onSaved: () => void }) {
  const [v, setV] = useState<Record<string, string>>({
    name: item?.name || '', sku: item?.sku || '', unit: item?.unit || 'pcs', category_id: item?.category?.id || '',
    location: item?.location || '', reorder_level: String(item?.reorder_level ?? ''), reorder_quantity: String(item?.reorder_quantity ?? ''),
    unit_cost: String(item?.unit_cost ?? ''), sale_price: item?.sale_price != null ? String(item.sale_price) : '',
    preferred_supplier_id: item?.preferred_supplier?.id || '', description: item?.description || '', opening_quantity: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const save = async () => {
    try { await inventory.saveItem({ ...(item ? { id: item.id } : {}), ...v }); toast.success('Item saved.'); onSaved(); }
    catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <L t="Name" wide><input className={input} value={v.name} onChange={set('name')} placeholder="e.g. A4 paper, Shirt size 10" /></L>
      <L t="Code (blank = automatic)"><input className={input} value={v.sku} onChange={set('sku')} /></L>
      <L t="Unit"><select className={input} value={v.unit} onChange={set('unit')}>{UNITS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></L>
      <L t="Category"><select className={input} value={v.category_id} onChange={set('category_id')}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
      <L t="Store room / shelf"><input className={input} value={v.location} onChange={set('location')} /></L>
      <L t="Warn when stock falls to"><input type="number" min={0} className={input} value={v.reorder_level} onChange={set('reorder_level')} /></L>
      <L t="Usually order"><input type="number" min={0} className={input} value={v.reorder_quantity} onChange={set('reorder_quantity')} /></L>
      <L t="Cost of one unit"><input type="number" min={0} className={input} value={v.unit_cost} onChange={set('unit_cost')} /></L>
      <L t="Sale price to students (blank = not sold)"><input type="number" min={0} className={input} value={v.sale_price} onChange={set('sale_price')} /></L>
      <L t="Usual supplier"><select className={input} value={v.preferred_supplier_id} onChange={set('preferred_supplier_id')}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></L>
      {!item && <L t="Opening stock"><input type="number" min={0} className={input} value={v.opening_quantity} onChange={set('opening_quantity')} /></L>}
      <div className="sm:col-span-2 flex justify-end"><button onClick={save} disabled={!v.name.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">Save</button></div>
    </div>
  );
}

function MoveForm({ item, onDone }: { item: InvItem; onDone: () => void }) {
  const [kind, setKind] = useState('issued');
  const [v, setV] = useState({ quantity: '', unit_cost: String(item.unit_cost || ''), issued_to: '', reference: '', note: '' });
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ id: string; full_name: string; student_id: string }>>([]);
  const [student, setStudent] = useState<{ id: string; full_name: string } | null>(null);
  useEffect(() => {
    if (kind !== 'sold' || q.trim().length < 2 || student) { setFound([]); return; }
    const t = setTimeout(() => api.get('/students/', { params: { search: q, page_size: 8 } }).then((r) => {
      const rows = (Array.isArray(r.data) ? r.data : r.data?.results || []) as any[];
      setFound(rows.map((s) => ({ id: s.id, full_name: s.full_name, student_id: s.student_id })));
    }).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [q, kind, student]);
  const dir = KINDS.find((k) => k[0] === kind)?.[2];
  const save = async () => {
    try {
      const r = await inventory.move(item.id, { kind, ...v, ...(student ? { student_id: student.id } : {}) });
      toast.success(`${item.name}: ${r.item.quantity} ${item.unit_label.toLowerCase()} in stock${r.movement.invoice_number ? ` · invoice ${r.movement.invoice_number}` : ''}.`);
      onDone();
    } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">In stock: <b>{item.quantity} {item.unit_label.toLowerCase()}</b>{item.sale_price != null ? ` · sells at ${formatMoney(item.sale_price)}` : ''}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <L t="What happened" wide><select className={input} value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map(([k, l, d]) => <option key={k} value={k}>{d === 'in' ? '＋' : '－'} {l}</option>)}</select></L>
        <L t="Quantity"><input type="number" min={0} className={input} value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} autoFocus /></L>
        {kind === 'received' && <L t="Cost of one unit"><input type="number" min={0} className={input} value={v.unit_cost} onChange={(e) => setV({ ...v, unit_cost: e.target.value })} /></L>}
        {kind === 'issued' && <L t="Issued to"><input className={input} value={v.issued_to} onChange={(e) => setV({ ...v, issued_to: e.target.value })} placeholder="e.g. Science dept, Grade 6, Mr Khan" /></L>}
        {kind === 'sold' && (
          <div className="sm:col-span-2">
            <L t="Student"><input className={input} value={student ? student.full_name : q} onChange={(e) => { setStudent(null); setQ(e.target.value); }} placeholder="Name or student number" /></L>
            {found.length > 0 && <ul className="border border-slate-100 rounded-lg mt-1 divide-y divide-slate-100">{found.map((s) => <li key={s.id}><button onClick={() => setStudent(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">{s.full_name} <span className="text-slate-400">· {s.student_id}</span></button></li>)}</ul>}
            {item.sale_price != null && v.quantity && <p className="text-xs text-slate-500 mt-1">The family is billed {formatMoney(Number(v.quantity) * item.sale_price)}.</p>}
          </div>
        )}
        <L t="Reference (bill / request no.)"><input className={input} value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} /></L>
        <L t="Note"><input className={input} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></L>
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={!v.quantity || (kind === 'sold' && !student)} className={`px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50 ${dir === 'in' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          {dir === 'in' ? 'Add to stock' : 'Take from stock'}
        </button>
      </div>
    </div>
  );
}

/** Office: the stock list with low-stock warnings; add items, record stock in and out, see each item's history. */
export default function InventoryStockPage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') || '');
  const [cat, setCat] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [data, setData] = useState<{ results: InvItem[]; low_count: number; value: number } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<InvItem | 'new' | null>(null);
  const [moving, setMoving] = useState<InvItem | null>(null);
  const [history, setHistory] = useState<InvItem | null>(null);

  const load = () => inventory.items({ q, category: cat, low: onlyLow }).then(setData).catch(() => setData({ results: [], low_count: 0, value: 0 }));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, cat, onlyLow]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { inventory.categories().then(setCategories).catch(() => undefined); inventory.suppliers().then(setSuppliers).catch(() => undefined); }, []);
  const openHistory = async (i: InvItem) => { try { setHistory(await inventory.item(i.id)); } catch { toast.error('Could not load the history.'); } };
  const exportCsv = async () => { try { saveBlob(await inventory.exportCsv(), `stock-${new Date().toLocaleDateString('sv')}.csv`); } catch { toast.error('Export failed.'); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input aria-label="Search items" className={`${input} pl-8`} placeholder="Item, code or shelf" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Category" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setOnlyLow(!onlyLow)} aria-pressed={onlyLow} className={`px-3 py-2 rounded-lg text-sm font-bold border inline-flex items-center gap-1 ${onlyLow ? 'bg-amber-500 text-white border-transparent' : 'border-amber-300 text-amber-800'}`}>
          <AlertTriangle size={14} /> Low stock {data ? data.low_count : ''}
        </button>
        <button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold inline-flex items-center gap-1"><Download size={14} /> CSV</button>
        <button onClick={() => setEditing('new')} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-1"><Plus size={14} /> Add item</button>
      </div>
      {!data ? <Loader2 className="animate-spin text-slate-400" /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-2 px-3">Item</th><th>Category</th><th>Shelf</th><th className="text-right">In stock</th><th className="text-right">Reorder at</th><th className="text-right">Value</th><th />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((i) => (
                <tr key={i.id} className={i.low ? 'bg-amber-50/60' : ''}>
                  <td className="py-2 px-3"><button onClick={() => openHistory(i)} className="font-semibold text-slate-800 hover:underline text-left">{i.name}</button> <span className="text-xs text-slate-400">{i.sku}</span></td>
                  <td>{i.category?.name || '—'}</td><td className="text-xs">{i.location}</td>
                  <td className={`text-right font-bold ${i.low ? 'text-amber-700' : ''}`}>{i.quantity} <span className="text-xs font-normal text-slate-400">{i.unit}</span>{i.low && <AlertTriangle size={12} className="inline ml-1" />}</td>
                  <td className="text-right text-slate-500">{i.reorder_level || '—'}</td><td className="text-right">{formatMoney(i.value)}</td>
                  <td className="text-right pr-3 whitespace-nowrap space-x-2">
                    <button onClick={() => setMoving(i)} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><PackagePlus size={12} /> In / out</button>
                    <button onClick={() => setEditing(i)} className="text-xs font-bold text-slate-600">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
            {data.results.length > 0 && <tfoot><tr className="border-t border-slate-200 font-black"><td className="py-2 px-3" colSpan={5}>Stock value</td><td className="text-right">{formatMoney(data.value)}</td><td /></tr></tfoot>}
          </table>
          {data.results.length === 0 && <p className="p-6 text-center text-sm text-slate-400">{onlyLow ? 'Nothing is running low.' : 'No items yet. Use "Add item" to start.'}</p>}
        </div>
      )}
      {editing && <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Add an item' : editing.name} size="lg"><ItemForm item={editing === 'new' ? undefined : editing} categories={categories} suppliers={suppliers} onSaved={() => { setEditing(null); load(); }} /></Modal>}
      {moving && <Modal open onClose={() => setMoving(null)} title={`Stock in / out · ${moving.name}`} size="lg"><MoveForm item={moving} onDone={() => { setMoving(null); load(); }} /></Modal>}
      {history && (
        <Modal open onClose={() => setHistory(null)} title={`${history.name} · history`} size="xl">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">When</th><th>What</th><th className="text-right">Qty</th><th className="text-right">Balance</th><th>To / from</th><th>By</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(history.movements || []).map((m) => (
                  <tr key={m.id}>
                    <td className="py-1.5 text-xs">{new Date(m.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{m.kind_label}</td>
                    <td className={`text-right font-bold ${m.quantity > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                    <td className="text-right">{m.balance_after}</td>
                    <td className="text-xs">{[m.issued_to, m.student?.full_name, m.invoice_number && `invoice ${m.invoice_number}`, m.reference, m.note].filter(Boolean).join(' · ')}</td>
                    <td className="text-xs text-slate-500">{m.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
