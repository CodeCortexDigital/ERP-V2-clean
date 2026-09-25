import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Minus, Plus, ShieldAlert, UtensilsCrossed, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import cafeteria, { byCategory, CafAccount, CafTxn, errorText, Food } from '@/services/cafeteria.service';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';

/** The cafeteria till: find the student, see balance / limit / meal plan / allergies, tap food, charge. */
export default function CafeteriaTillPage({ standalone = false }: { standalone?: boolean }) {
  const [food, setFood] = useState<Food[]>([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<CafAccount[]>([]);
  const [who, setWho] = useState<CafAccount | null>(null);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string[] | null>(null);
  const [recent, setRecent] = useState<CafTxn[]>([]);
  const [topUp, setTopUp] = useState('');
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cafeteria.items(true).then((f) => setFood([...f].sort(byCategory))).catch(() => toast.error('Could not load the food list.')); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => cafeteria.find(q.trim()).then((r) => { setFound(r); if (r.length === 1 && r[0].student.student_id.toLowerCase() === q.trim().toLowerCase()) pick(r[0]); }).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (a: CafAccount) => { setWho(a); setFound([]); setQ(''); setBasket({}); setWarning(null); };
  const add = (id: string, d: number) => setBasket((b) => { const n = Math.max((b[id] || 0) + d, 0); const c = { ...b }; if (n) c[id] = n; else delete c[id]; return c; });
  const lines = Object.entries(basket).map(([id, qty]) => ({ item: food.find((f) => f.id === id)!, qty })).filter((l) => l.item);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const plan = who?.meal_plans.find((p) => !p.served_today);

  const charge = async (mealPlan = false, override = false) => {
    if (!who || !lines.length) return;
    setBusy(true);
    try {
      const r = await cafeteria.charge(who.student.id, lines.map((l) => ({ item_id: l.item.id, quantity: l.qty })), { meal_plan: mealPlan, override_allergy: override });
      toast.success(mealPlan ? `${who.student.full_name}: meal plan meal served.` : `${formatMoney(total)} charged. Balance ${formatMoney(r.account.balance)}.`);
      setRecent((x) => [r.transaction, ...x].slice(0, 10));
      setWho(null); setBasket({}); setWarning(null);
      findRef.current?.focus();
    } catch (e: any) {
      if (e?.response?.status === 409) setWarning(e.response.data.allergy || [e.response.data.error]);
      else toast.error(errorText(e, 'Could not charge.'));
    } finally { setBusy(false); }
  };
  const addMoney = async () => {
    if (!who || !topUp) return;
    try { const a = await cafeteria.topUp(who.student.id, topUp); setWho(a); setTopUp(''); toast.success(`Added. Balance ${formatMoney(a.balance)}.`); }
    catch (e) { toast.error(errorText(e, 'Could not top up.')); }
  };

  const groups = Array.from(new Set(food.map((f) => f.category_label)));
  return (
    <div className="space-y-4">
      {standalone && <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><UtensilsCrossed size={18} className="text-blue-600" /> Cafeteria till</h1>}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 space-y-3">
          {groups.map((g) => (
            <section key={g} className={card}>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">{g}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {food.filter((f) => f.category_label === g).map((f) => (
                  <button key={f.id} onClick={() => add(f.id, 1)} disabled={!who}
                    className={`rounded-lg border p-3 text-left disabled:opacity-40 ${basket[f.id] ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                    <p className="text-sm font-bold text-slate-800">{f.name}{basket[f.id] ? <span className="ml-1 text-blue-700">×{basket[f.id]}</span> : null}</p>
                    <p className="text-xs text-slate-500">{formatMoney(f.price)}{f.allergen_list.length ? ` · ${f.allergen_list.join(', ')}` : ''}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {food.length === 0 && <p className="text-sm text-slate-500">No food on sale. Add items under Menu & Food.</p>}
        </div>

        <div className="xl:col-span-2 space-y-3">
          <section className={card}>
            <input ref={findRef} autoFocus aria-label="Find a student" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Type a name or scan the student number" value={q} onChange={(e) => setQ(e.target.value)} />
            {found.length > 0 && (
              <ul className="mt-2 divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {found.map((a) => <li key={a.id}><button onClick={() => pick(a)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between"><span>{a.student.full_name} <span className="text-slate-400">· {a.student.class_name}</span></span><b>{formatMoney(a.balance)}</b></button></li>)}
              </ul>
            )}
            {who && (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="mr-auto">
                    <p className="text-lg font-black text-slate-900">{who.student.full_name}</p>
                    <p className="text-xs text-slate-500">{who.student.class_name} · {who.student.student_id}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${who.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatMoney(who.balance)}</p>
                    <p className="text-[11px] text-slate-500">{who.daily_limit != null ? `${formatMoney(who.left_today ?? 0)} left today` : 'no daily limit'}</p>
                  </div>
                </div>
                {who.allergies && (
                  <p className={`rounded-lg px-3 py-2 text-xs font-bold inline-flex items-start gap-1.5 w-full ${who.severe_allergy ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800'}`}>
                    <ShieldAlert size={14} className="shrink-0" /> Allergies: {who.allergies}{who.severe_allergy ? ' (severe)' : ''}
                  </p>
                )}
                {who.dietary_restrictions && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-1.5">Diet: {who.dietary_restrictions}</p>}
                {who.is_blocked && <p className="text-xs font-bold text-rose-700">This account is paused by the office.</p>}
                {who.meal_plans.map((p) => <p key={p.member_id} className="text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg px-3 py-1.5">{p.name}: {p.served_today ? 'already served today' : 'not served yet today'}</p>)}
                {lines.length > 0 && (
                  <ul className="text-sm divide-y divide-slate-100">
                    {lines.map((l) => (
                      <li key={l.item.id} className="py-1.5 flex items-center gap-2">
                        <span className="mr-auto">{l.item.name}</span>
                        <button onClick={() => add(l.item.id, -1)} aria-label={`One less ${l.item.name}`} className="rounded border border-slate-200 p-0.5"><Minus size={12} /></button>
                        <b className="w-5 text-center">{l.qty}</b>
                        <button onClick={() => add(l.item.id, 1)} aria-label={`One more ${l.item.name}`} className="rounded border border-slate-200 p-0.5"><Plus size={12} /></button>
                        <span className="w-20 text-right">{formatMoney(l.item.price * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {warning && (
                  <div className="rounded-lg border-2 border-rose-500 bg-rose-50 p-3 text-sm">
                    <p className="font-black text-rose-800 flex items-center gap-1"><AlertTriangle size={15} /> Allergy warning</p>
                    <ul className="text-rose-800 list-disc pl-5">{warning.map((w) => <li key={w}>{w}</li>)}</ul>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setWarning(null)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold">Change the order</button>
                      <button onClick={() => charge(false, true)} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold">Sell anyway (recorded)</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  {plan && <button onClick={() => charge(true)} disabled={busy || !lines.length} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-black disabled:opacity-50">Meal plan</button>}
                  <button onClick={() => charge(false)} disabled={busy || !lines.length || who.is_blocked} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-black disabled:opacity-50">
                    {busy ? <Loader2 size={16} className="animate-spin inline" /> : `Charge ${formatMoney(total)}`}
                  </button>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <input aria-label="Cash top-up" type="number" min={0} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" placeholder="Cash received" value={topUp} onChange={(e) => setTopUp(e.target.value)} />
                  <button onClick={addMoney} disabled={!topUp} className="px-3 rounded-lg border border-emerald-300 text-emerald-800 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"><Wallet size={13} /> Add cash</button>
                </div>
              </div>
            )}
          </section>
          {recent.length > 0 && (
            <section className={card}>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Just now</h2>
              <ul className="text-sm divide-y divide-slate-100">
                {recent.map((t) => <li key={t.id} className="py-1.5 flex justify-between gap-2"><span className="truncate">{t.student.full_name} · {t.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span><b>{t.kind === 'meal_plan' ? 'plan' : formatMoney(-t.amount)}</b></li>)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
