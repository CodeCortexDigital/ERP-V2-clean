import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Search, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import cafeteria, { CafAccount, CafReport, CafSettings, errorText, Plan } from '@/services/cafeteria.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const fmt = (d: string) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function StudentSearch({ onPick }: { onPick: (s: { id: string; full_name: string }) => void }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Array<{ id: string; full_name: string; student_id: string }>>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setRows([]); return; }
    const t = setTimeout(() => api.get('/students/', { params: { search: q, page_size: 8 } }).then((r) => {
      const list = (Array.isArray(r.data) ? r.data : r.data?.results || []) as any[];
      setRows(list.map((s) => ({ id: s.id, full_name: s.full_name, student_id: s.student_id })));
    }).catch(() => setRows([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <input aria-label="Student" className={input} placeholder="Add a student: type a name" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length > 0 && <ul className="border border-slate-100 rounded-lg mt-1 divide-y divide-slate-100">{rows.map((s) => <li key={s.id}><button onClick={() => { onPick(s); setQ(''); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">{s.full_name} <span className="text-slate-400">· {s.student_id}</span></button></li>)}</ul>}
    </div>
  );
}

function AccountView({ studentId, onChanged }: { studentId: string; onChanged: () => void }) {
  const [a, setA] = useState<CafAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [adj, setAdj] = useState({ amount: '', note: '' });
  const load = () => cafeteria.account(studentId).then(setA).catch(() => toast.error('Could not load the account.'));
  useEffect(() => { load(); }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <Loader2 className="animate-spin text-slate-400" />;
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); load(); onChanged(); } catch (e) { toast.error(errorText(e, 'That did not work.')); } };
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-black mr-auto">{formatMoney(a.balance)}</p>
        <span className="text-xs text-slate-500">Daily limit {a.daily_limit != null ? formatMoney(a.daily_limit) : 'none'}{a.own_limit ? ' (set by the family)' : ''}</span>
        <button onClick={() => act(() => cafeteria.block(a.student.id, !a.is_blocked), a.is_blocked ? 'Account opened.' : 'Account paused.')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${a.is_blocked ? 'border-emerald-300 text-emerald-800' : 'border-rose-300 text-rose-700'}`}>{a.is_blocked ? 'Open account' : 'Pause account'}</button>
      </div>
      <div className="flex gap-2">
        <input aria-label="Cash top-up" type="number" min={0} className={input} placeholder="Cash received" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={() => amount && act(() => cafeteria.topUp(a.student.id, amount), 'Topped up.').then(() => setAmount(''))} className="px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold whitespace-nowrap">Add cash</button>
      </div>
      <div className="flex gap-2">
        <input aria-label="Adjustment" type="number" className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="± amount" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
        <input aria-label="Reason" className={input} placeholder="Reason for the correction" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
        <button onClick={() => act(() => cafeteria.adjust(a.student.id, adj.amount, adj.note), 'Corrected.').then(() => setAdj({ amount: '', note: '' }))} className="px-3 rounded-lg border border-slate-200 text-xs font-bold">Correct</button>
      </div>
      <table className="w-full">
        <tbody className="divide-y divide-slate-100">
          {(a.transactions || []).map((t) => (
            <tr key={t.id}>
              <td className="py-1.5 text-xs text-slate-500 w-28">{fmt(t.at)}</td>
              <td>{t.kind_label}{t.items.length ? <span className="text-slate-500"> · {t.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span> : null}{t.note ? <span className="block text-[11px] text-slate-400">{t.note}</span> : null}</td>
              <td className={`text-right font-bold ${t.amount >= 0 ? 'text-emerald-700' : 'text-slate-800'}`}>{t.amount > 0 ? '+' : ''}{formatMoney(t.amount)}</td>
              <td className="text-right text-xs text-slate-400 w-24">{formatMoney(t.balance_after)}</td>
              <td className="text-right w-16">{t.kind === 'purchase' && !t.refunded && <button onClick={() => window.confirm('Refund this purchase?') && act(() => cafeteria.refund(t.id), 'Refunded.')} className="text-xs font-bold text-rose-600">Refund</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Office: every student's balance, meal plans, and the cafeteria report and rules. */
export default function CafeteriaAccountsPage() {
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const [data, setData] = useState<{ results: CafAccount[]; total_balance: number } | null>(null);
  const [open, setOpen] = useState<CafAccount | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newPlan, setNewPlan] = useState({ name: '', meal: 'lunch', monthly_fee: '' });
  const [report, setReport] = useState<CafReport | null>(null);
  const [rules, setRules] = useState<CafSettings | null>(null);
  const [month, setMonth] = useState(new Date().toLocaleDateString('sv').slice(0, 7));

  const load = () => cafeteria.accounts({ q, low }).then(setData).catch(() => setData({ results: [], total_balance: 0 }));
  const loadPlans = () => cafeteria.plans().then(setPlans).catch(() => undefined);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q, low]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadPlans(); cafeteria.report().then(setReport).catch(() => undefined); cafeteria.settings().then(setRules).catch(() => undefined); }, []);
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); loadPlans(); load(); } catch (e) { toast.error(errorText(e, 'That did not work.')); } };

  return (
    <div className="space-y-4">
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[['Sales (30 days)', formatMoney(report.sales)], ['Purchases', report.transactions], ['Plan meals', report.meal_plan_meals], ['Money held', formatMoney(report.balances_held)], ['Low balances', report.low_balances], ['Below zero', report.below_zero]].map(([k, v]) => (
            <div key={String(k)} className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</p><p className="text-xl font-black text-slate-900">{v}</p></div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className={`${card} xl:col-span-2`}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-black text-slate-900 mr-auto">Student accounts</h2>
            <div className="relative w-60"><Search size={14} className="absolute left-3 top-2.5 text-slate-400" /><input aria-label="Search accounts" className={`${input} pl-8`} placeholder="Name or number" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button onClick={() => setLow(!low)} aria-pressed={low} className={`px-3 py-2 rounded-lg text-xs font-bold border inline-flex items-center gap-1 ${low ? 'bg-amber-500 text-white border-transparent' : 'border-amber-300 text-amber-800'}`}><AlertTriangle size={13} /> Low</button>
          </div>
          {!data ? <Loader2 className="animate-spin text-slate-400" /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">Student</th><th>Class</th><th className="text-right">Balance</th><th className="text-right">Spent today</th><th>Plan</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(a)}>
                    <td className="py-2 font-semibold">{a.student.full_name}{a.is_blocked && <span className="ml-1 text-[10px] font-black text-rose-600">PAUSED</span>}</td><td>{a.student.class_name}</td>
                    <td className={`text-right font-bold ${a.balance < 0 ? 'text-rose-600' : a.low ? 'text-amber-700' : ''}`}>{formatMoney(a.balance)}</td>
                    <td className="text-right">{formatMoney(a.spent_today)}</td><td className="text-xs">{a.meal_plans.map((p) => p.name).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data && data.results.length === 0 && <p className="text-sm text-slate-500 mt-2">No accounts yet. They open the first time a student is served or topped up.</p>}
        </section>
        <section className={card}>
          <h2 className="font-black text-slate-900 mb-2">Meal plans</h2>
          {plans.map((p) => (
            <div key={p.id} className="border-b border-slate-100 pb-3 mb-3">
              <p className="font-semibold">{p.name} <span className="text-xs text-slate-500">· {formatMoney(p.monthly_fee)} a month · {p.members.length} student(s){p.is_active ? '' : ' · stopped'}</span></p>
              <ul className="text-xs text-slate-600 my-1">{p.members.map((m) => <li key={m.id} className="flex items-center gap-1">{m.student.full_name} <span className="text-slate-400">{m.student.class_name}</span><button onClick={() => act(() => cafeteria.leave(p.id, m.student.id), 'Removed from the plan.')} aria-label={`Remove ${m.student.full_name}`} className="text-rose-600 ml-auto"><UserMinus size={12} /></button></li>)}</ul>
              <StudentSearch onPick={(s) => act(() => cafeteria.join(p.id, s.id), `${s.full_name} joined ${p.name}.`)} />
            </div>
          ))}
          <div className="space-y-2">
            <input aria-label="Plan name" className={input} placeholder="New plan, e.g. Lunch every school day" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
            <div className="flex gap-2">
              <select aria-label="Meal" className={input} value={newPlan.meal} onChange={(e) => setNewPlan({ ...newPlan, meal: e.target.value })}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="snack">Snack</option></select>
              <input aria-label="Monthly fee" type="number" min={0} className={input} placeholder="Monthly fee" value={newPlan.monthly_fee} onChange={(e) => setNewPlan({ ...newPlan, monthly_fee: e.target.value })} />
              <button onClick={() => act(() => cafeteria.addPlan(newPlan), 'Plan added.').then(() => setNewPlan({ name: '', meal: 'lunch', monthly_fee: '' }))} disabled={!newPlan.name || !newPlan.monthly_fee} className="px-3 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50"><Plus size={13} /></button>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <input aria-label="Month" type="month" className={input} value={month} onChange={(e) => setMonth(e.target.value)} />
              <button onClick={async () => { try { const r = await cafeteria.planInvoices(month); toast.success(`${r.created} meal plan invoice(s) made${r.already_billed ? `; ${r.already_billed} already billed` : ''}.`); } catch (e) { toast.error(errorText(e, 'Could not bill.')); } }} className="px-3 rounded-lg bg-blue-600 text-white text-xs font-bold whitespace-nowrap">Bill the month</button>
            </div>
          </div>
        </section>
      </div>
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className={card}><h2 className="font-black text-slate-900 mb-2">Best sellers (30 days)</h2><ol className="text-sm list-decimal pl-5">{report.top_items.map((i) => <li key={i.name}>{i.name} <span className="text-slate-400">· {i.quantity} · {formatMoney(i.value)}</span></li>)}</ol>{report.top_items.length === 0 && <p className="text-sm text-slate-500">No sales yet.</p>}</section>
          <section className={card}><h2 className="font-black text-slate-900 mb-2">Sales by day</h2><ul className="text-sm">{report.by_day.slice(-10).map((d) => <li key={d.date} className="flex justify-between"><span>{d.date}</span><b>{formatMoney(d.sales)}</b></li>)}</ul>{report.by_day.length === 0 && <p className="text-sm text-slate-500">No sales yet.</p>}</section>
          {rules && (
            <section className={card}>
              <h2 className="font-black text-slate-900 mb-2">Rules</h2>
              {([['default_daily_limit', 'Daily limit for everyone (blank = none)'], ['low_balance_level', 'Tell the family when the balance falls to'], ['allow_negative', 'May go below zero by (0 = never)']] as const).map(([k, l]) => (
                <label key={k} className="block text-xs font-semibold text-slate-600 mb-2">{l}<input type="number" min={0} className={`${input} mt-1`} value={rules[k] ?? ''} onChange={(e) => setRules({ ...rules, [k]: e.target.value === '' ? null : (e.target.value as unknown as number) })} /></label>
              ))}
              <button onClick={async () => { try { setRules(await cafeteria.saveSettings(rules)); toast.success('Rules saved.'); } catch (e) { toast.error(errorText(e, 'Could not save.')); } }} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save rules</button>
            </section>
          )}
        </div>
      )}
      {open && <Modal open onClose={() => { setOpen(null); load(); }} title={open.student.full_name} size="lg"><AccountView studentId={open.student.id} onChanged={load} /></Modal>}
    </div>
  );
}
