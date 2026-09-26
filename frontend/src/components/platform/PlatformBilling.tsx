import { useEffect, useState } from 'react';
import { CreditCard, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import subscriptions, { errorText, Plan, PlatformRow } from '@/services/subscription.service';
import PlatformInvoices from './PlatformInvoices';
import PlatformDeletions from './PlatformDeletions';
import PlatformPrivacy from './PlatformPrivacy';
import PlatformBackups from './PlatformBackups';
import PlatformErrors from './PlatformErrors';
import PlatformSetupChecks from './PlatformSetupChecks';
import PlatformSupport from './PlatformSupport';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';
const TONE: Record<string, string> = {
  trialing: 'bg-sky-100 text-sky-800', active: 'bg-emerald-100 text-emerald-700', past_due: 'bg-amber-100 text-amber-800',
  read_only: 'bg-rose-100 text-rose-700', suspended: 'bg-rose-100 text-rose-700', cancelled: 'bg-slate-200 text-slate-700', legacy: 'bg-slate-100 text-slate-600',
};

/** Platform owner: each school's plan and state, recording payments, and the price list. */
export default function PlatformBilling() {
  const [rows, setRows] = useState<PlatformRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const load = () => subscriptions.platform().then((d) => { setRows(d.schools); setPlans(d.plans); setStatuses(d.statuses); }).catch((e) => toast.error(errorText(e, 'Could not load plans.')));
  useEffect(() => { load(); }, []);

  const open = (r: PlatformRow) => { setEditing(r.school_id); setForm({ plan: r.plan_code || 'standard', status: '', cycle: r.billing_cycle || 'monthly', trial_ends_at: '', note: '' }); };
  const save = async (r: PlatformRow, renew: boolean) => {
    setBusy(r.school_id);
    try {
      const body: Record<string, unknown> = { plan: form.plan, cycle: form.cycle, note: form.note };
      if (form.status) body.status = form.status;
      if (form.trial_ends_at) body.trial_ends_at = form.trial_ends_at;
      if (renew) body.renew = true;
      await subscriptions.setSchool(r.school_id, body);
      toast.success(renew ? `Payment recorded for ${r.name}.` : `${r.name} updated.`);
      setEditing(null); load();
    } catch (e) { toast.error(errorText(e, 'Could not save.')); } finally { setBusy(''); }
  };
  const savePlan = async (p: Plan, patch: Record<string, unknown>) => {
    try { await subscriptions.savePlan(p.code, patch); toast.success(`${p.name} saved.`); load(); } catch (e) { toast.error(errorText(e, 'Could not save the plan.')); }
  };

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="subs-title">
        <h2 id="subs-title" className="flex items-center gap-2 px-4 pt-4 font-bold text-slate-800"><CreditCard size={16} /> Plans and subscriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
              <th className="px-4 py-2">School</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Until</th><th className="px-4 py-2 text-right">Students / staff</th><th className="px-4 py-2" /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.school_id} className="border-b border-slate-50 align-top">
                  <td className="px-4 py-2"><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-500">{r.code}</p></td>
                  <td className="px-4 py-2">{r.plan || <span className="text-slate-400">None (unlimited)</span>}{r.billing_cycle && r.plan ? <span className="text-xs text-slate-500"> · {r.billing_cycle}</span> : null}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[r.status] || TONE.legacy}`}>{r.status_label}</span></td>
                  <td className="px-4 py-2 text-slate-600 text-xs">{r.status === 'trialing' ? r.trial_ends_at && new Date(r.trial_ends_at).toLocaleDateString() : r.current_period_end && new Date(r.current_period_end).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right text-slate-600">{r.usage.students} / {r.usage.staff}</td>
                  <td className="px-4 py-2 text-right">
                    {editing === r.school_id ? (
                      <div className="flex flex-wrap justify-end gap-1.5 text-left">
                        <select className={input} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} aria-label="Plan">
                          {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                        </select>
                        <select className={input} value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} aria-label="Billing">
                          <option value="monthly">Monthly</option><option value="yearly">Yearly</option>
                        </select>
                        <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} aria-label="Status">
                          <option value="">Keep status</option>{Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <input className={input} type="date" value={form.trial_ends_at} onChange={(e) => setForm({ ...form, trial_ends_at: e.target.value })} aria-label="Trial ends" title="Trial ends" />
                        <input className={`${input} w-40`} placeholder="Note (e.g. bank transfer)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                        <button onClick={() => save(r, false)} disabled={!!busy} className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">Save</button>
                        <button onClick={() => save(r, true)} disabled={!!busy} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                          {busy === r.school_id && <Loader2 className="inline w-3 h-3 animate-spin" />} Record payment
                        </button>
                        <button onClick={() => setEditing(null)} className="px-2 text-xs text-slate-500">Cancel</button>
                      </div>
                    ) : <button onClick={() => open(r)} className="text-xs font-semibold text-blue-600">Manage</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card} aria-labelledby="price-title">
        <h2 id="price-title" className="px-4 pt-4 font-bold text-slate-800">Price list</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
              <th className="px-4 py-2">Plan</th><th className="px-4 py-2">Monthly</th><th className="px-4 py-2">Yearly</th>
              <th className="px-4 py-2">Students</th><th className="px-4 py-2">Staff</th><th className="px-4 py-2" /></tr></thead>
            <tbody>{plans.map((p) => <PlanRow key={p.code} plan={p} onSave={savePlan} />)}</tbody>
          </table>
        </div>
      </section>
      <PlatformInvoices />
      <PlatformDeletions />
      <PlatformSupport />
      <PlatformSetupChecks />
      <PlatformErrors />
      <PlatformBackups />
      <PlatformPrivacy />
    </div>
  );
}

function PlanRow({ plan, onSave }: { plan: Plan; onSave: (p: Plan, patch: Record<string, unknown>) => void }) {
  const [v, setV] = useState({ price_monthly: String(plan.price_monthly), price_yearly: String(plan.price_yearly),
    student_limit: plan.student_limit == null ? '' : String(plan.student_limit), staff_limit: plan.staff_limit == null ? '' : String(plan.staff_limit) });
  const field = (k: keyof typeof v, label: string, placeholder = '') => (
    <input className={`${input} w-24`} value={v[k]} placeholder={placeholder} aria-label={`${plan.name} ${label}`} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
  );
  return (
    <tr className="border-b border-slate-50">
      <td className="px-4 py-2 font-semibold text-slate-800">{plan.name} <span className="text-xs font-normal text-slate-500">{plan.currency}</span></td>
      <td className="px-4 py-2">{field('price_monthly', 'monthly price')}</td>
      <td className="px-4 py-2">{field('price_yearly', 'yearly price')}</td>
      <td className="px-4 py-2">{field('student_limit', 'student limit', 'Unlimited')}</td>
      <td className="px-4 py-2">{field('staff_limit', 'staff limit', 'Unlimited')}</td>
      <td className="px-4 py-2 text-right"><button onClick={() => onSave(plan, v)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><Save size={12} /> Save</button></td>
    </tr>
  );
}
