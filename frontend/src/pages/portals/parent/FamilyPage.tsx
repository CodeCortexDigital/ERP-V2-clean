import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Home, Loader2, Mail, Pencil, Phone, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import portal, { ChildSummary, Family, FamilyGuardian, FamilyHousehold } from '@/services/portal.service';
import { rememberChild } from '@/components/portal/ChildPicker';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const LABELS: Record<string, string> = {
  address: 'Address', city: 'City', state: 'State / province', postal_code: 'Postal code', country: 'Country',
  phone: 'Home phone', email: 'Email', preferred_language: 'Preferred language', first_name: 'First name',
  last_name: 'Last name', mobile_phone: 'Mobile phone', home_phone: 'Home phone', work_phone: 'Work phone',
  occupation: 'Occupation', employer: 'Employer',
};
const STATUS_ICON = { pending: Clock, approved: CheckCircle2, declined: XCircle };
const STATUS_TONE = { pending: 'text-amber-700 bg-amber-50', approved: 'text-emerald-700 bg-emerald-50', declined: 'text-rose-700 bg-rose-50' };

type Target = { kind: 'household'; h: FamilyHousehold } | { kind: 'guardian'; g: FamilyGuardian };

function ChildCard({ c, onOpen }: { c: ChildSummary; onOpen: (path: string) => void }) {
  return (
    <div className={card}>
      <div className="flex items-center gap-3">
        {c.photo ? <img src={c.photo} alt="" className="w-11 h-11 rounded-full object-cover" /> : (
          <span className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center">{c.full_name.slice(0, 1)}</span>
        )}
        <div className="min-w-0">
          <p className="font-black text-slate-900 truncate">{c.full_name}</p>
          <p className="text-xs text-slate-500">{[c.class_name, c.section_name].filter(Boolean).join(' · ') || 'No class'}{c.student_id ? ` · ${c.student_id}` : ''}</p>
        </div>
        {c.today && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">Today: {c.today.replace('_', ' ')}</span>}
      </div>
      {c.alerts.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {c.alerts.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-[11px] font-bold"><AlertTriangle size={11} /> {a}</span>)}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-2 mt-3 text-sm">
        {[
          ['Attendance', c.attendance_rate != null ? `${c.attendance_rate}%` : '—', '/parent/attendance'],
          ['Average', c.average != null ? `${c.average}%` : '—', '/parent/progress'],
          ['Work due', `${c.due_count}${c.overdue_count ? ` (+${c.overdue_count} overdue)` : ''}`, '/parent/assignments'],
          ['Balance', formatMoney(c.balance), '/parent/fees'],
        ].map(([label, value, path]) => (
          <button key={label} onClick={() => onOpen(path)} className="text-left rounded-lg bg-slate-50 hover:bg-blue-50 px-3 py-2">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="font-bold text-slate-800">{value}</dd>
          </button>
        ))}
      </dl>
      {c.next_due && <p className="text-xs text-slate-500 mt-2">Next: {c.next_due}</p>}
    </div>
  );
}

function ChangeForm({ target, fields, onDone }: { target: Target; fields: string[]; onDone: () => void }) {
  const source = (target.kind === 'household' ? target.h : target.g) as unknown as Record<string, string>;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f, source[f] || ''])));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = fields.filter((f) => (values[f] || '') !== (source[f] || ''));

  const send = async () => {
    setBusy(true);
    try {
      await portal.requestChange({
        ...(target.kind === 'household' ? { household_id: target.h.id } : { guardian_id: target.g.id }),
        changes: Object.fromEntries(changed.map((f) => [f, values[f]])), note,
      });
      toast.success('Sent to the school office. You will be told when it is updated.');
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f} className={`text-xs font-semibold text-slate-600 ${f === 'address' ? 'sm:col-span-2' : ''}`}>
            {LABELS[f] || f}
            {f === 'address'
              ? <textarea rows={2} className={`${input} mt-1`} value={values[f]} onChange={(e) => setValues({ ...values, [f]: e.target.value })} />
              : <input className={`${input} mt-1`} type={f === 'email' ? 'email' : 'text'} value={values[f]} onChange={(e) => setValues({ ...values, [f]: e.target.value })} />}
          </label>
        ))}
        <label className="sm:col-span-2 text-xs font-semibold text-slate-600">Note for the office (optional)
          <input className={`${input} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. We moved on 1 October" />
        </label>
      </div>
      <p className="text-xs text-slate-500">The office checks every change before it is saved on your record.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold">Cancel</button>
        <button onClick={send} disabled={!changed.length || busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
          {busy ? 'Sending…' : `Send ${changed.length || ''} change${changed.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}

/** Parent portal: all children at a glance, the household and guardians, and contact update requests. */
export default function FamilyPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Family | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Target | null>(null);

  const load = () => portal.family().then(setData).catch(() => setError('Could not load your family.'));
  useEffect(() => { load(); }, []);

  const open = (child: ChildSummary, path: string) => { rememberChild(child.id); navigate(path); };

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Loading your family…</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 mr-auto"><Users size={18} className="text-blue-600" /> My family</h1>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-100 px-3 py-1">{data.children.length} child{data.children.length === 1 ? '' : 'ren'}</span>
          <span className={`rounded-full px-3 py-1 ${data.totals.overdue_fees ? 'bg-rose-100 text-rose-700' : 'bg-slate-100'}`}>Family balance {formatMoney(data.totals.balance)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{data.totals.due_count} piece(s) of work due</span>
        </div>
      </div>

      {data.children.length === 0 ? <p className="text-sm text-slate-500">No children are linked to this account yet. Please contact the school office.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.children.map((c) => <ChildCard key={c.id} c={c} onOpen={(p) => open(c, p)} />)}
        </div>
      )}

      {data.households.map((h) => (
        <section key={h.id} className={card}>
          <div className="flex flex-wrap items-start gap-2">
            <div className="mr-auto">
              <h2 className="font-black text-slate-900 flex items-center gap-2"><Home size={16} /> {h.name}</h2>
              <p className="text-sm text-slate-600 mt-1">{[h.address, h.city, h.state, h.postal_code, h.country].filter(Boolean).join(', ') || 'No address on file'}</p>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-3">
                {h.phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {h.phone}</span>}
                {h.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {h.email}</span>}
                <span>Children: {h.children.join(', ')}</span>
              </p>
            </div>
            <button onClick={() => setEditing({ kind: 'household', h })} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600"><Pencil size={12} /> Update address</button>
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mt-4 mb-2">Parents & guardians</h3>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {h.guardians.map((g) => (
              <li key={g.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="mr-auto">
                    <p className="font-bold text-slate-800">{g.name} {g.is_me && <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 text-[10px] font-black uppercase">You</span>}</p>
                    <p className="text-xs text-slate-500">{g.relationship_label}{g.occupation ? ` · ${g.occupation}` : ''}</p>
                  </div>
                  <button onClick={() => setEditing({ kind: 'guardian', g })} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Pencil size={12} /> Update</button>
                </div>
                <p className="text-xs text-slate-600 mt-1 flex flex-wrap gap-3">
                  {g.mobile_phone && <span className="inline-flex items-center gap-1"><Phone size={11} /> {g.mobile_phone}</span>}
                  {g.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {g.email}</span>}
                </p>
                {g.children.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {g.children.map((c) => `${c.name}: ${[c.primary && 'main contact', c.pickup ? 'may collect' : 'may not collect', c.emergency && 'emergency contact', c.billing && 'gets invoices'].filter(Boolean).join(', ')}`).join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400 mt-2">Custody and pickup permissions can only be changed by the school office.</p>
        </section>
      ))}

      {data.requests.length > 0 && (
        <section className={card}>
          <h2 className="font-black text-slate-900 mb-2">My update requests</h2>
          <ul className="divide-y divide-slate-100">
            {data.requests.map((r) => {
              const Icon = STATUS_ICON[r.status];
              return (
                <li key={r.id} className="py-2 text-sm flex flex-wrap items-start gap-2">
                  <div className="mr-auto">
                    <p className="font-semibold text-slate-800">{r.target}</p>
                    <p className="text-xs text-slate-500">{Object.entries(r.changes).map(([f, c]) => `${LABELS[f] || f}: ${c.to || '(blank)'}`).join(' · ')}</p>
                    {r.review_note && <p className="text-xs text-slate-600 mt-0.5">Office: {r.review_note}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[r.status]}`}><Icon size={12} /> {r.status_label}</span>
                  <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.kind === 'household' ? `Update ${editing.h.name}` : `Update ${editing.g.name}`} size="lg">
          <ChangeForm target={editing} fields={editing.kind === 'household' ? data.fields.household : data.fields.guardian}
            onDone={() => { setEditing(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}
