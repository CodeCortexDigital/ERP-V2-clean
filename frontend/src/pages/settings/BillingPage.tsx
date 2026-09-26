import { useEffect, useState } from 'react';
import { Check, CreditCard, History, Loader2, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { usePlanStore } from '@/store/planStore';
import billing, { errorText, MySubscription, Plan } from '@/services/subscription.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const TONE: Record<string, string> = {
  trialing: 'bg-sky-100 text-sky-800', active: 'bg-emerald-100 text-emerald-700', past_due: 'bg-amber-100 text-amber-800',
  read_only: 'bg-rose-100 text-rose-700', suspended: 'bg-rose-100 text-rose-700', cancelled: 'bg-slate-200 text-slate-700', legacy: 'bg-slate-100 text-slate-600',
};
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' } as any) : '');
const money = (n: number, cur: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null | undefined }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600"><span>{label}</span><span className="font-semibold">{used}{limit ? ` of ${limit}` : ' (no limit)'}</span></div>
      {limit ? (
        <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full ${pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** Settings → Plan & billing: the school's plan, what it includes, usage, and changing or cancelling it. */
export default function BillingPage() {
  const isAdmin = useAuthStore((s) => s.role) === 'admin';
  const refreshPlan = usePlanStore((s) => s.refresh);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState('');
  const load = () => billing.mine().then((d) => { setSub(d); if (d.billing_cycle) setCycle(d.billing_cycle); }).catch((e) => toast.error(errorText(e, 'Could not load.')));
  useEffect(() => { load(); }, []);

  if (!isAdmin) return <div className={`${card} p-6 max-w-2xl mx-auto text-sm text-slate-600`}>The school's plan is managed by its administrators.</div>;
  if (!sub) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

  const choose = async (p: Plan) => {
    if (!window.confirm(`Switch to ${p.name} (${cycle})?`)) return;
    setBusy(p.code);
    try { toast.success((await billing.change(p.code, cycle)).message); await load(); refreshPlan(); } catch (e) { toast.error(errorText(e, 'Could not change the plan.')); } finally { setBusy(''); }
  };
  const cancel = async (resume: boolean) => {
    if (!resume && !window.confirm('End the subscription at the end of the current period? Nothing is deleted; the school becomes read-only.')) return;
    setBusy('cancel');
    try { toast.success((await billing.cancel(resume)).message); await load(); refreshPlan(); } catch (e) { toast.error(errorText(e, 'Could not do that.')); } finally { setBusy(''); }
  };

  const plan = sub.plan;
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <section className={`${card} p-5`} aria-labelledby="current-plan">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Current plan</p>
            <h2 id="current-plan" className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CreditCard size={18} /> {plan ? plan.name : 'No plan'}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[sub.status] || TONE.legacy}`}>{sub.status_label}</span>
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {sub.status === 'legacy' && 'This school was set up before plans; everything is open. Choose a plan when you are ready.'}
              {sub.status === 'trialing' && `Free trial of ${plan?.name} until ${day(sub.trial_ends_at)} (${sub.trial_days_left} day${sub.trial_days_left === 1 ? '' : 's'} left).`}
              {sub.status === 'active' && sub.current_period_end && `${sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}, paid until ${day(sub.current_period_end)}.`}
              {sub.status === 'past_due' && `Payment overdue. The school becomes read-only on ${day(sub.grace_ends_at)}.`}
              {sub.status === 'read_only' && 'Read-only: everyone can view and export, but nothing can be added or changed until a plan is paid.'}
              {sub.status === 'cancelled' && `Ends on ${day(sub.current_period_end)}; after that the school is read-only.`}
            </p>
            {sub.pending_plan && <p className="text-sm text-amber-700 mt-1">Changes to {sub.pending_plan.name} ({sub.pending_cycle}) on {day(sub.current_period_end)}.</p>}
            {sub.cancel_at_period_end && <p className="text-sm text-amber-700 mt-1">Set to end on {day(sub.current_period_end || sub.trial_ends_at)}.</p>}
          </div>
          <div className="w-full sm:w-72 space-y-3">
            <Usage label="Active students" used={sub.usage?.students || 0} limit={sub.limits?.students} />
            <Usage label="Active staff" used={sub.usage?.staff || 0} limit={sub.limits?.staff} />
          </div>
        </div>
        {plan && (
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.modules.map((m) => (
              <span key={m.key} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${m.included ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-400 line-through'}`}>
                {m.included ? <Check size={12} /> : <Minus size={12} />} {m.label}
              </span>
            ))}
          </div>
        )}
        {plan && sub.status !== 'legacy' && (
          <div className="mt-4">
            {sub.cancel_at_period_end || sub.status === 'cancelled'
              ? <button onClick={() => cancel(true)} disabled={!!busy} className="text-sm font-semibold text-blue-600">Keep the subscription</button>
              : <button onClick={() => cancel(false)} disabled={!!busy} className="text-sm font-semibold text-rose-600">Cancel subscription</button>}
          </div>
        )}
      </section>

      <section aria-labelledby="plans-title">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 id="plans-title" className="font-bold text-slate-800">Plans</h2>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="radiogroup" aria-label="Billing">
            {(['monthly', 'yearly'] as const).map((c) => (
              <button key={c} role="radio" aria-checked={cycle === c} onClick={() => setCycle(c)}
                className={`px-3 py-1 text-xs font-semibold rounded-md ${cycle === c ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>
                {c === 'monthly' ? 'Monthly' : 'Yearly (2 months free)'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(sub.plans || []).map((p) => {
            const current = plan?.code === p.code;
            const price = cycle === 'yearly' ? p.price_yearly : p.price_monthly;
            return (
              <div key={p.code} className={`${card} p-4 flex flex-col ${current ? 'ring-2 ring-brand border-transparent' : ''}`}>
                <p className="font-bold text-slate-800">{p.name}{current && <span className="ms-2 text-[11px] font-semibold text-brand">Current</span>}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{p.contact_sales ? 'Custom' : money(price, p.currency)}
                  {!p.contact_sales && <span className="text-xs font-normal text-slate-500"> / {cycle === 'yearly' ? 'year' : 'month'}</span>}</p>
                <p className="text-xs text-slate-600 mt-1 min-h-[48px]">{p.description}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-700 flex-1">
                  <li>{p.student_limit ? `Up to ${p.student_limit} students` : 'Unlimited students'}</li>
                  <li>{p.staff_limit ? `Up to ${p.staff_limit} staff` : 'Unlimited staff'}</li>
                  {p.modules.filter((m) => m.included).map((m) => <li key={m.key} className="flex items-center gap-1"><Check size={12} className="text-emerald-600" /> {m.label}</li>)}
                </ul>
                {p.too_small && p.too_small.length > 0 && <p className="mt-2 text-[11px] text-rose-700">{p.too_small.join('; ')}</p>}
                <div className="mt-3">
                  {p.contact_sales
                    ? <p className="text-center rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">Arranged with our team</p>
                    : <button onClick={() => choose(p)} disabled={!!busy || (current && sub.billing_cycle === cycle && sub.status !== 'trialing') || p.fits === false}
                        className="w-full auth-primary-btn disabled:opacity-40">
                        {busy === p.code && <Loader2 className="w-4 h-4 animate-spin" />}
                        {current && sub.billing_cycle === cycle && sub.status !== 'trialing' ? 'Your plan' : current ? 'Keep this plan' : `Choose ${p.name}`}
                      </button>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">Upgrades apply at once. A smaller plan starts when the current paid period ends, and only if your students and staff fit it. Payment by card arrives with the next update; until then our team confirms payment.</p>
      </section>

      {!!sub.events?.length && (
        <section className={card} aria-labelledby="billing-history">
          <h2 id="billing-history" className="flex items-center gap-2 px-5 pt-4 font-bold text-slate-800"><History size={16} /> History</h2>
          <ul className="divide-y divide-slate-100 px-5 py-2">
            {sub.events.map((e, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">{e.summary}</span>
                <span className="text-xs text-slate-500">{day(e.when)}{e.by ? ` · ${e.by}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
