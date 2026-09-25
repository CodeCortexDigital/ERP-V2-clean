import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Edit, Home, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Search, Users } from 'lucide-react';
import householdService, { type Household } from '@/services/household.service';
import { formatMoney } from '@/utils/currency';
import { Modal } from '@/components/ui/Modal';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';

/** Household directory: every family with its guardians, children and balance. */
export default function FamiliesPage() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Household> | null>(null);
  const openId = params.get('household');
  const [open, setOpen] = useState<Household | null>(null);

  const load = async (q = search) => {
    setLoading(true);
    try {
      setRows(await householdService.households(q.trim()));
    } catch {
      toast.error('Could not load households.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = window.setTimeout(() => load(search), 300);
    return () => window.clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!openId) { setOpen(null); return; }
    householdService.household(openId).then(setOpen).catch(() => setOpen(null));
  }, [openId]);

  const totals = useMemo(() => ({
    households: rows.length,
    students: rows.reduce((n, h) => n + h.students.length, 0),
    guardians: rows.reduce((n, h) => n + h.guardians.length, 0),
  }), [rows]);

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error('Enter a household name.');
    try {
      if (editing.id) await householdService.updateHousehold(editing.id, editing);
      else await householdService.createHousehold(editing);
      toast.success('Household saved');
      setEditing(null);
      load();
      if (openId) householdService.household(openId).then(setOpen);
    } catch {
      toast.error('Could not save the household.');
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Households</h1>
          <p className="text-sm text-slate-500">
            {totals.households} households · {totals.students} students · {totals.guardians} guardians
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200" aria-label="Reload"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setEditing({ name: '' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> New household
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${input} pl-9`}
          placeholder="Search by family, guardian, student name or ID, phone or email" aria-label="Search households" />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
      ) : rows.length === 0 ? (
        <div className={`${card} p-10 text-center text-sm text-slate-500`}>
          <Home className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No households found. Households are created automatically when you add a student with parent details.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((h) => (
            <button key={h.id} onClick={() => setParams({ household: h.id })}
              className={`${card} p-4 text-left hover:border-[color:var(--app-accent)] transition-colors`}>
              <p className="font-bold">{h.name}</p>
              <p className="text-xs text-slate-500 truncate">{[h.address, h.city].filter(Boolean).join(', ') || 'No address'}</p>
              <div className="mt-3 text-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase">Guardians</p>
                <p className="truncate">{h.guardians.map((g) => `${g.full_name} (${g.relationship_label})`).join(', ') || '—'}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500 uppercase">Students</p>
                <p className="truncate">{h.students.map((s) => s.full_name).join(', ') || '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal open onClose={() => setParams({})} title={open.name} size="xl">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{[open.address, open.city, open.state, open.postal_code].filter(Boolean).join(', ') || 'No address'}</p>
                {open.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{open.phone}</p>}
                {open.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{open.email}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-semibold">Family balance</p>
                <p className="text-xl font-bold">{formatMoney(open.billing_balance || 0)}</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2 inline-flex items-center gap-2"><Users className="w-4 h-4" />Students</h3>
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {open.students.map((s) => (
                  <li key={s.id} className="px-3 py-2 flex justify-between text-sm">
                    <Link to={`/education/students/${s.id}?tab=family`} className="text-brand font-medium hover:underline">{s.full_name}</Link>
                    <span className="text-slate-500">{s.class_name || '—'}{s.is_active === false ? ' · inactive' : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2">Guardians</h3>
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {open.guardians.map((g) => (
                  <li key={g.id} className="px-3 py-2 flex justify-between text-sm">
                    <span><strong>{g.full_name}</strong> · {g.relationship_label}</span>
                    <span className="text-slate-500">{g.mobile_phone || g.email || ''}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">To add or change guardians and their permissions, open a student's Family tab.</p>
            </div>
            <button onClick={() => setEditing(open)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
              <Edit className="w-4 h-4" /> Edit household details
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? 'Edit household' : 'New household'} size="lg"
          footer={(
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Save</button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['name', 'Household name *'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Street address'],
              ['city', 'City'], ['state', 'State / province'], ['postal_code', 'Postal code'], ['country', 'Country'],
            ] as Array<[keyof Household, string]>).map(([k, text]) => (
              <div key={k}>
                <label htmlFor={`hh-${k}`} className="block text-xs font-semibold text-slate-600 mb-1">{text}</label>
                <input id={`hh-${k}`} className={input} value={String(editing[k] ?? '')}
                  onChange={(e) => setEditing((h) => ({ ...h, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
