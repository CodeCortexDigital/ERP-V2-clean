import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import inventory, { Category, errorText, Supplier } from '@/services/inventory.service';
import { Modal } from '@/components/ui/Modal';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const FIELDS: Array<[keyof Supplier, string]> = [['name', 'Name'], ['contact_person', 'Contact person'], ['phone', 'Phone'], ['email', 'Email'], ['tax_number', 'Tax number (NTN / VAT)'], ['address', 'Address'], ['notes', 'Notes']];

function SupplierForm({ s, onSaved }: { s?: Supplier; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Supplier>>(s || { is_active: true });
  const save = async () => { try { await inventory.saveSupplier(v); toast.success('Supplier saved.'); onSaved(); } catch (e) { toast.error(errorText(e, 'Could not save.')); } };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FIELDS.map(([f, label]) => (
        <label key={f} className={`text-xs font-semibold text-slate-600 ${f === 'address' || f === 'notes' ? 'sm:col-span-2' : ''}`}>{label}
          <input className={`${input} mt-1`} value={String(v[f] ?? '')} onChange={(e) => setV({ ...v, [f]: e.target.value })} />
        </label>
      ))}
      <label className="text-xs font-semibold text-slate-600 inline-flex items-center gap-2"><input type="checkbox" checked={!!v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} /> Still buying from them</label>
      <div className="sm:col-span-2 flex justify-end"><button onClick={save} disabled={!v.name} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">Save</button></div>
    </div>
  );
}

/** Office: suppliers and item categories. */
export default function InventorySuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const load = () => { inventory.suppliers().then(setSuppliers).catch(() => undefined); inventory.categories().then(setCats).catch(() => undefined); };
  useEffect(load, []);
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errorText(e, 'That did not work.')); } };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <section className={`${card} xl:col-span-2`}>
        <div className="flex items-center mb-2"><h2 className="font-black text-slate-900 mr-auto">Suppliers</h2><button onClick={() => setEditing('new')} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Plus size={12} /> Add supplier</button></div>
        {suppliers.length === 0 ? <p className="text-sm text-slate-500">No suppliers yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {suppliers.map((s) => (
              <li key={s.id} className="py-2 flex flex-wrap items-center gap-2">
                <span className="mr-auto"><b>{s.name}</b>{!s.is_active && <span className="ml-1 text-[10px] font-black uppercase text-slate-400">inactive</span>} <span className="text-slate-500">· {[s.contact_person, s.phone, s.email].filter(Boolean).join(' · ')}</span></span>
                <span className="text-xs text-slate-400">{s.orders} order(s)</span>
                <button onClick={() => setEditing(s)} className="text-xs font-bold text-blue-600">Edit</button>
                <button onClick={() => window.confirm(`Delete ${s.name}?`) && act(() => inventory.removeSupplier(s.id), 'Deleted.')} aria-label={`Delete ${s.name}`} className="text-rose-600"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">Categories</h2>
        <div className="flex gap-2 mb-2">
          <input aria-label="New category" className={input} placeholder="e.g. Uniform, Cleaning, Sports" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button onClick={() => newCat.trim() && act(async () => { await inventory.addCategory(newCat.trim()); setNewCat(''); }, 'Category added.')} className="px-3 rounded-lg bg-slate-900 text-white text-xs font-bold">Add</button>
        </div>
        <ul className="text-sm divide-y divide-slate-100">
          {cats.map((c) => (
            <li key={c.id} className="py-1.5 flex items-center"><span className="mr-auto">{c.name} <span className="text-slate-400">· {c.items}</span></span>
              <button onClick={() => window.confirm(`Delete ${c.name}? Its items stay, without a category.`) && act(() => inventory.removeCategory(c.id), 'Deleted.')} aria-label={`Delete ${c.name}`} className="text-rose-600"><Trash2 size={13} /></button></li>
          ))}
        </ul>
      </section>
      {editing && <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a supplier' : editing.name} size="lg"><SupplierForm s={editing === 'new' ? undefined : editing} onSaved={() => { setEditing(null); load(); }} /></Modal>}
    </div>
  );
}
