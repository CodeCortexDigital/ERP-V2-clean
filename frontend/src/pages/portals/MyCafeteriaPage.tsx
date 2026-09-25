import { useEffect, useState } from 'react';
import { Loader2, UtensilsCrossed, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import cafeteria, { byCategory, CafAccount, errorText, MenuMeal } from '@/services/cafeteria.service';
import { usePortalHome } from '@/components/portal/ChildPicker';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';

function Child({ a, canManage, onChanged }: { a: CafAccount; canManage: boolean; onChanged: () => void }) {
  const home = usePortalHome();
  const [limit, setLimit] = useState(a.own_limit && a.daily_limit != null ? String(a.daily_limit) : '');
  const [amount, setAmount] = useState('');
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); onChanged(); } catch (e) { toast.error(errorText(e, 'That did not work.')); } };
  return (
    <section className={card}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="font-black text-slate-900">{a.student.full_name}</h2>
          <p className="text-xs text-slate-500">{a.meal_plans.length ? a.meal_plans.map((p) => `${p.name}${p.served_today ? ' · had it today' : ''}`).join(', ') : 'No meal plan'}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${a.low ? 'text-amber-700' : 'text-slate-900'}`}>{formatMoney(a.balance)}</p>
          <p className="text-xs text-slate-500">spent {formatMoney(a.spent_today)} today{a.daily_limit != null ? ` of ${formatMoney(a.daily_limit)}` : ''}</p>
        </div>
      </div>
      {a.low && <p className="text-xs font-bold text-amber-800 mt-1">The balance is low.</p>}
      {a.pending_top_ups.length > 0 && <p className="text-xs text-slate-600 mt-1">Waiting for payment: {a.pending_top_ups.map((t) => `${formatMoney(t.amount)} (invoice ${t.invoice_number})`).join(', ')}. <Link to={`${home}/fees`} className="text-blue-600 font-bold">Pay now</Link></p>}
      {canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="flex gap-2">
            <input aria-label={`Top up ${a.student.full_name}`} type="number" min={1} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Amount to add" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button onClick={() => act(() => cafeteria.requestTopUp(a.student.id, amount), 'Invoice made. Pay it under Fees and the money is added straight away.').then(() => setAmount(''))} disabled={!amount} className="px-3 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"><Wallet size={13} /> Top up</button>
          </div>
          <div className="flex gap-2">
            <input aria-label={`Daily limit for ${a.student.full_name}`} type="number" min={0} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Daily limit (blank = school default)" value={limit} onChange={(e) => setLimit(e.target.value)} />
            <button onClick={() => act(() => cafeteria.setLimit(a.student.id, limit), 'Daily limit saved.')} className="px-3 rounded-lg border border-slate-200 text-xs font-bold">Save limit</button>
          </div>
        </div>
      )}
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mt-4 mb-1">Recent</h3>
      {(a.transactions || []).length === 0 ? <p className="text-sm text-slate-500">Nothing yet.</p> : (
        <ul className="text-sm divide-y divide-slate-100">
          {(a.transactions || []).slice(0, 12).map((t) => (
            <li key={t.id} className="py-1.5 flex justify-between gap-2">
              <span className="truncate"><span className="text-xs text-slate-400 mr-2">{new Date(t.at).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span>{t.kind === 'purchase' || t.kind === 'meal_plan' ? t.items.map((i) => `${i.quantity}× ${i.name}`).join(', ') : t.kind_label}{t.kind === 'meal_plan' ? ' (meal plan)' : ''}</span>
              <b className={t.amount > 0 ? 'text-emerald-700' : ''}>{t.kind === 'meal_plan' ? '—' : `${t.amount > 0 ? '+' : ''}${formatMoney(t.amount)}`}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Portal: each child's cafeteria balance, what they bought, this week's menu; parents top up and set a daily limit. */
export default function MyCafeteriaPage() {
  const [data, setData] = useState<{ children: CafAccount[]; week: string; menu: MenuMeal[]; can_set_limit: boolean } | null>(null);
  const load = () => cafeteria.mine().then(setData).catch(() => setData({ children: [], week: '', menu: [], can_set_limit: false }));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  const dates = Array.from(new Set(data.menu.map((m) => m.date))).sort();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><UtensilsCrossed size={18} className="text-blue-600" /> Cafeteria</h1>
      {data.children.map((a) => <Child key={a.id} a={a} canManage={data.can_set_limit} onChanged={load} />)}
      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">This week's menu</h2>
        {dates.length === 0 ? <p className="text-sm text-slate-500">The menu for this week hasn't been published yet.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {dates.map((d) => (
              <div key={d} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-500 mb-1">{new Date(`${d}T00:00:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                {data.menu.filter((m) => m.date === d).map((m) => (
                  <div key={m.id} className="mb-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{m.meal_label}</p>
                    {[...m.items].sort(byCategory).map((i) => <p key={i.id} className="text-sm">{i.name} <span className="text-xs text-slate-400">{formatMoney(i.price)}</span>{i.allergen_list.length ? <span className="block text-[10px] text-rose-700">contains {i.allergen_list.join(', ')}</span> : null}</p>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
