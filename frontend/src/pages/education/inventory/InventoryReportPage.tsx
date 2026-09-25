import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import inventory, { InvMovement, InvReport } from '@/services/inventory.service';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';

/** Office: stock value by category, what is low, what gets used most and by whom, purchases by supplier, and recent movements. */
export default function InventoryReportPage() {
  const [days, setDays] = useState(30);
  const [r, setR] = useState<InvReport | null>(null);
  const [moves, setMoves] = useState<InvMovement[]>([]);
  useEffect(() => { setR(null); inventory.report(days).then(setR).catch(() => undefined); }, [days]);
  useEffect(() => { inventory.movements().then((m) => setMoves(m.slice(0, 25))).catch(() => undefined); }, []);
  if (!r) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>;

  const List = ({ title, rows }: { title: string; rows: Array<[string, string]> }) => (
    <section className={card}>
      <h2 className="font-black text-slate-900 mb-2">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-slate-500">Nothing yet.</p> : (
        <ul className="text-sm divide-y divide-slate-100">{rows.map(([a, b]) => <li key={a} className="py-1.5 flex justify-between gap-2"><span>{a}</span><b>{b}</b></li>)}</ul>
      )}
    </section>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[['Items', r.items], ['Stock value', formatMoney(r.value)], ['Running low', r.low.length], ['Open orders', r.open_orders], [`Sold to students (${days} days)`, formatMoney(r.sales)]].map(([k, v]) => (
          <div key={String(k)} className="bg-white rounded-xl border border-slate-200 p-3 min-w-36"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</p><p className="text-xl font-black text-slate-900">{v}</p></div>
        ))}
        <select aria-label="Period" className="ml-auto rounded-lg border border-slate-300 px-2 py-2 text-sm" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[30, 90, 180, 365].map((d) => <option key={d} value={d}>Last {d} days</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        <List title="Value by category" rows={r.by_category.map((c) => [`${c.category} (${c.items})${c.low ? ` · ${c.low} low` : ''}`, formatMoney(c.value)])} />
        <List title="Most used" rows={r.most_used.map((m) => [`${m.name} · ${m.quantity} ${m.unit.toLowerCase()}`, formatMoney(m.value)])} />
        <List title="Issued to" rows={r.by_department.map((x) => [x.issued_to, formatMoney(x.value)])} />
        <List title="Bought from" rows={r.purchases_by_supplier.map((x) => [x.supplier, formatMoney(x.value)])} />
      </div>
      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">Latest stock movements</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {moves.map((m) => (
              <tr key={m.id}>
                <td className="py-1.5 text-xs text-slate-500 w-32">{new Date(m.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="font-semibold">{m.item.name}</td><td>{m.kind_label}</td>
                <td className={`text-right font-bold ${m.quantity > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                <td className="text-xs pl-3">{[m.issued_to, m.student?.full_name, m.reference].filter(Boolean).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {moves.length === 0 && <p className="text-sm text-slate-500">No movements yet.</p>}
      </section>
    </div>
  );
}
