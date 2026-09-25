import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import discipline, { type BehaviourReport, type Incident } from '@/services/discipline.service';
import { IncidentLine } from '@/components/behaviour/BehaviourHistory';
import IncidentPanel from '@/components/behaviour/IncidentPanel';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** School-wide behaviour: totals, categories, classes, days of the week, leaders, follow-ups and suspensions. */
export default function BehaviourReportPage() {
  const [range, setRange] = useState(() => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 30); return { from: iso(f), to: iso(t) }; });
  const [data, setData] = useState<BehaviourReport | null>(null);
  const [open, setOpen] = useState<Incident | null>(null);
  const load = useCallback(() => { setData(null); discipline.report(range).then(setData).catch(() => undefined); }, [range]);
  useEffect(() => { load(); }, [load]);

  const maxCat = Math.max(1, ...(data?.by_category || []).map((c) => c.count));
  const maxDay = Math.max(1, ...(data?.by_weekday || []).map((c) => c.count));
  const box = 'bg-white rounded-xl border border-slate-200 p-4';

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4 text-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold mr-auto">Behaviour report</h1>
        <label className="text-sm">From <input type="date" className={input} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="text-sm">To <input type="date" className={input} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
      </div>
      {!data ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[['Merits', data.totals.merits, 'text-emerald-700'], ['Incidents', data.totals.incidents, 'text-rose-700'], ['Open incidents', data.totals.open, 'text-amber-700'],
              ['Net points', data.totals.points, data.totals.points >= 0 ? 'text-emerald-700' : 'text-rose-700'], ['Students involved', data.totals.students, '']].map(([l, v, c]) => (
              <div key={l as string} className={box}><p className="text-xs text-slate-500">{l}</p><p className={`text-2xl font-black ${c}`}>{v}</p></div>
            ))}
          </div>

          {data.suspended_today.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
              <b>Suspended today:</b> {data.suspended_today.map((s) => `${s.student} (${s.type}${s.until ? ` until ${s.until}` : ''})`).join(', ')}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <section className={box}>
              <h2 className="font-bold mb-2">By category</h2>
              {data.by_category.length === 0 ? <p className="text-sm text-slate-500">Nothing in this period.</p> : data.by_category.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-sm py-0.5">
                  <span className="w-40 truncate">{c.name}</span>
                  <span className="flex-1 bg-slate-100 rounded h-3"><span className={`block h-3 rounded ${c.kind === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${(c.count / maxCat) * 100}%` }} /></span>
                  <span className="w-8 text-right font-semibold">{c.count}</span>
                </div>
              ))}
            </section>
            <section className={box}>
              <h2 className="font-bold mb-2">Incidents by day of the week</h2>
              <div className="flex items-end gap-2 h-32">
                {data.by_weekday.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-xs font-semibold">{d.count || ''}</span>
                    <span className="w-full bg-rose-400 rounded-t" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                    <span className="text-xs text-slate-500 mt-1">{d.day}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className={box}>
              <h2 className="font-bold mb-2">Top positive points</h2>
              <ol className="text-sm space-y-1">{data.top_positive.filter((s) => s.points > 0).map((s, n) => (
                <li key={s.id} className="flex gap-2"><span className="w-5 text-slate-400">{n + 1}.</span><Link className="flex-1 hover:underline" to={`/education/students/${s.id}?tab=behaviour`}>{s.name} <span className="text-slate-500">· {s.class_name}</span></Link><b className="text-emerald-700">{s.points}</b></li>
              ))}</ol>
            </section>
            <section className={box}>
              <h2 className="font-bold mb-2">Most incidents</h2>
              {data.most_incidents.length === 0 ? <p className="text-sm text-slate-500">No incidents in this period.</p> : (
                <ol className="text-sm space-y-1">{data.most_incidents.map((s, n) => (
                  <li key={s.id} className="flex gap-2"><span className="w-5 text-slate-400">{n + 1}.</span><Link className="flex-1 hover:underline" to={`/education/students/${s.id}?tab=behaviour`}>{s.name} <span className="text-slate-500">· {s.class_name}</span></Link><b className="text-rose-700">{s.incidents}</b></li>
                ))}</ol>
              )}
            </section>
          </div>

          <section className={box}>
            <h2 className="font-bold mb-2">By class</h2>
            <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-1">Class</th><th>Merits</th><th>Incidents</th><th>Net points</th></tr></thead>
              <tbody>{data.by_class.map((c) => <tr key={c.name} className="border-t border-slate-100"><td className="py-1">{c.name}</td><td>{c.merits}</td><td>{c.incidents}</td><td className={c.points >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{c.points}</td></tr>)}</tbody></table>
          </section>

          <section className={box}>
            <h2 className="font-bold mb-1">Follow-ups due</h2>
            {data.follow_ups_due.length === 0 ? <p className="text-sm text-slate-500">Nothing is waiting for a follow-up.</p> : (
              <ul className="divide-y divide-slate-100">{data.follow_ups_due.map((i) => <IncidentLine key={i.id} i={i} onOpen={setOpen} showStudent />)}</ul>
            )}
          </section>
        </>
      )}
      {open && <IncidentPanel incident={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
