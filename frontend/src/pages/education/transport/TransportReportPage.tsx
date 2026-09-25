import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import transport, { errorText, TransportReport } from '@/services/transport.service';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';

/** Office: how full each route is, documents about to expire, trips in the last 30 days, and monthly transport billing. */
export default function TransportReportPage() {
  const [r, setR] = useState<TransportReport | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  useEffect(() => { transport.report().then(setR).catch(() => undefined); }, []);

  const bill = async () => {
    setBusy(true);
    try {
      const x = await transport.invoices(month);
      toast.success(`${x.created} transport invoice(s) made for ${x.month}${x.already_billed ? `; ${x.already_billed} already billed` : ''}${x.no_fee ? `; ${x.no_fee} with no fee` : ''}.`);
    } catch (e) { toast.error(errorText(e, 'Could not make the invoices.')); }
    finally { setBusy(false); }
  };

  if (!r) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[['Riders', r.riders], ['Monthly fees', formatMoney(r.monthly_fees)], ['Trips (30 days)', r.trips_30_days], ['Delayed', r.delayed_30_days],
          ['Average delay', `${r.average_delay} min`], ['Not at stop', r.no_shows_30_days]].map(([k, v]) => (
          <div key={String(k)} className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k}</p><p className="text-xl font-black text-slate-900">{v}</p></div>
        ))}
      </div>
      {r.expiring.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-black text-amber-900 flex items-center gap-2 mb-1"><AlertTriangle size={15} /> Expiring within 30 days</h2>
          <ul className="text-sm text-amber-900">{r.expiring.map((e) => <li key={e.what}>{e.what}: {e.items.join(', ')}</li>)}</ul>
        </section>
      )}
      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">Routes</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1.5">Route</th><th>Vehicle</th><th>Stops</th><th>Riders</th><th>Full</th><th>Monthly fees</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {r.routes.map((x) => (
              <tr key={x.id}><td className="py-2 font-semibold">{x.name}</td><td>{x.vehicle || '—'}</td><td>{x.stops}</td><td>{x.riders}{x.capacity ? ` / ${x.capacity}` : ''}</td>
                <td className={x.full_percent != null && x.full_percent >= 100 ? 'text-rose-600 font-bold' : ''}>{x.full_percent != null ? `${x.full_percent}%` : '—'}</td><td>{formatMoney(x.monthly_fees)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2 flex items-center gap-2"><Receipt size={15} /> Transport invoices</h2>
        <p className="text-sm text-slate-600 mb-2">Make a transport invoice for every student riding in a month, using their route's fee (or their own fee). Students already billed for that month are skipped.</p>
        <div className="flex items-center gap-2">
          <input aria-label="Month" type="month" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button onClick={bill} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">{busy ? 'Working…' : 'Make invoices'}</button>
        </div>
      </section>
    </div>
  );
}
