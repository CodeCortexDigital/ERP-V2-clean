import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarRange, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import billingService, { type InstallmentPlan } from '@/services/billing.service';
import api from '@/services/api';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';
const FREQ: Record<string, string> = { weekly: 'Weekly', biweekly: 'Every two weeks', monthly: 'Monthly', quarterly: 'Quarterly' };

/** Payment plans: reusable plan templates, and splitting an invoice into installments. */
export default function PaymentPlansPage() {
  const [plans, setPlans] = useState<InstallmentPlan[] | null>(null);
  const [draft, setDraft] = useState<{ name: string; number_of_installments: string; frequency: string; description: string } | null>(null);
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pick, setPick] = useState<any | null>(null);
  const [split, setSplit] = useState({ plan_id: '', installments: '3', frequency: 'monthly', first_due_date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);

  const load = () => billingService.plans().then(setPlans).catch(() => setPlans([]));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (search.trim().length < 2) { setInvoices([]); return; }
    const t = window.setTimeout(async () => {
      const res = await api.get('/auth/finance/invoices/', { params: { search: search.trim(), page_size: 20 } }).catch(() => null);
      const rows = Array.isArray(res?.data) ? res?.data : res?.data?.results || [];
      setInvoices(rows.filter((i: any) => ['issued', 'overdue'].includes(i.status) && !i.is_installment && Number(i.paid_amount || 0) === 0));
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const savePlan = async () => {
    if (!draft?.name.trim()) return toast.error('Name the plan.');
    const n = Number(draft.number_of_installments);
    if (!(n >= 2 && n <= 24)) return toast.error('Choose between 2 and 24 installments.');
    try {
      await billingService.savePlan({ name: draft.name, description: draft.description, number_of_installments: n, frequency: draft.frequency,
        total_amount: 0, installment_amount: 0, is_active: true } as Partial<InstallmentPlan>);
      toast.success('Plan saved');
      setDraft(null);
      load();
    } catch (err: any) {
      const body = err?.response?.data;
      toast.error(body?.error || (body ? Object.entries(body).map(([k, v]) => `${k}: ${v}`).join(' ') : 'Could not save the plan.'));
    }
  };

  const doSplit = async () => {
    if (!pick) return;
    setBusy(true);
    try {
      const res = await api.post(`/auth/finance/invoices/${pick.id}/payment-plan/`, {
        installments: Number(split.installments), frequency: split.frequency, first_due_date: split.first_due_date, plan_id: split.plan_id || undefined,
      });
      toast.success(`Created ${res.data.installments.length} installment invoices`);
      setPick(null);
      setSearch('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not create the payment plan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto text-slate-800">
      <div>
        <h1 className="text-xl font-bold">Payment plans</h1>
        <p className="text-sm text-slate-500">Let a family pay a large invoice in installments. The original invoice is closed and replaced, so nothing is billed twice.</p>
      </div>

      <section className={`${card} p-5 space-y-4`}>
        <h2 className="font-bold inline-flex items-center gap-2"><CalendarRange className="w-4 h-4" /> Put an invoice on a plan</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} pl-9`} placeholder="Find an unpaid invoice by student name or invoice number" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Find invoice" />
        </div>
        {invoices.length > 0 && !pick && (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {invoices.map((i) => (
              <li key={i.id}>
                <button onClick={() => setPick(i)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between gap-2">
                  <span><strong>{i.invoice_number}</strong> · {i.student_name || i.student?.full_name || ''}</span>
                  <span>{formatMoney(Number(i.balance_due ?? i.total_amount ?? i.amount))} · due {i.due_date}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pick && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm">
            <p>Splitting <strong>{pick.invoice_number}</strong> ({formatMoney(Number(pick.balance_due ?? pick.amount))})</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div><label className={lbl} htmlFor="sp-plan">Plan (optional)</label>
                <select id="sp-plan" className={input} value={split.plan_id} onChange={(e) => {
                  const p = plans?.find((x) => x.id === e.target.value);
                  setSplit({ ...split, plan_id: e.target.value, ...(p ? { installments: String(p.number_of_installments), frequency: p.frequency } : {}) });
                }}>
                  <option value="">Custom</option>{plans?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className={lbl} htmlFor="sp-n">Installments</label><input id="sp-n" type="number" min={2} max={24} className={input} value={split.installments} onChange={(e) => setSplit({ ...split, installments: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="sp-f">How often</label><select id="sp-f" className={input} value={split.frequency} onChange={(e) => setSplit({ ...split, frequency: e.target.value })}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className={lbl} htmlFor="sp-d">First due date</label><input id="sp-d" type="date" className={input} value={split.first_due_date} onChange={(e) => setSplit({ ...split, first_due_date: e.target.value })} /></div>
            </div>
            <div className="flex gap-2">
              <button disabled={busy} onClick={doSplit} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold disabled:opacity-60">Create installments</button>
              <button onClick={() => setPick(null)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 font-semibold">Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className={`${card} p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Saved plans</h2>
          <button onClick={() => setDraft({ name: '', number_of_installments: '3', frequency: 'monthly', description: '' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Plus className="w-4 h-4" /> New plan</button>
        </div>
        {!plans ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : plans.length === 0 ? <p className="text-sm text-slate-500">No saved plans yet. For example: "Termly: 3 payments".</p> : (
          <ul className="divide-y divide-slate-100">
            {plans.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                <span><strong>{p.name}</strong> · {p.number_of_installments} payments, {(FREQ[p.frequency] || p.frequency).toLowerCase()}</span>
                <button onClick={async () => { await billingService.deletePlan(p.id); load(); }} className="p-1.5 rounded text-rose-600 hover:bg-rose-50" aria-label={`Delete ${p.name}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {draft && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="sm:col-span-2"><label className={lbl} htmlFor="pl-name">Name</label><input id="pl-name" className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div><label className={lbl} htmlFor="pl-n">Installments</label><input id="pl-n" type="number" min={2} max={24} className={input} value={draft.number_of_installments} onChange={(e) => setDraft({ ...draft, number_of_installments: e.target.value })} /></div>
            <div><label className={lbl} htmlFor="pl-f">How often</label><select id="pl-f" className={input} value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="sm:col-span-4 flex gap-2"><button onClick={savePlan} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Save plan</button><button onClick={() => setDraft(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button></div>
          </div>
        )}
      </section>
    </div>
  );
}
