import { useEffect, useState } from 'react';
import { Bus, CheckCircle2, Clock, Loader2, MapPin, Phone } from 'lucide-react';
import transport, { FamilyTransport } from '@/services/transport.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const EVENT: Record<string, string> = { boarded: 'Got on', dropped: 'Dropped off', no_show: 'Not at the stop' };

/** Portal (student / parent): each child's route, stops and times, vehicle and crew, and today's trips as they happen. */
export default function MyTransportPage() {
  const [data, setData] = useState<{ date: string; children: FamilyTransport[] } | null>(null);
  useEffect(() => {
    const load = () => transport.mine().then(setData).catch(() => setData({ date: '', children: [] }));
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-10"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><Bus size={18} className="text-blue-600" /> School transport</h1>
      {data.children.length === 0 && <p className="text-sm text-slate-500">No children are linked to this account.</p>}
      {data.children.map((c) => (
        <section key={c.student.id} className={card}>
          <h2 className="font-black text-slate-900">{c.student.full_name}</h2>
          {!c.rider ? <p className="text-sm text-slate-500 mt-1">Not on school transport. Contact the office to join a route.</p> : (
            <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">{c.route?.name}{c.vehicle ? <span className="text-slate-500 font-normal"> · {c.vehicle.name} ({c.vehicle.registration_no})</span> : null}</p>
                <p className="text-slate-600">{c.rider.direction_label}</p>
                {c.rider.pickup_stop && <p className="inline-flex items-center gap-1 text-slate-700"><MapPin size={13} /> Picked up at <b>{c.rider.pickup_stop.name}</b>{c.rider.pickup_stop.morning_time ? ` · ${c.rider.pickup_stop.morning_time}` : ''}</p>}
                {c.rider.dropoff_stop && <p className="inline-flex items-center gap-1 text-slate-700"><MapPin size={13} /> Dropped off at <b>{c.rider.dropoff_stop.name}</b>{c.rider.dropoff_stop.afternoon_time ? ` · ${c.rider.dropoff_stop.afternoon_time}` : ''}</p>}
              </div>
              <div className="space-y-1">
                {c.driver && <p className="inline-flex items-center gap-1"><Phone size={13} /> Driver {c.driver.name}{c.driver.phone ? <a href={`tel:${c.driver.phone}`} className="text-blue-600 ml-1">{c.driver.phone}</a> : null}</p>}
                {c.attendant && <p className="inline-flex items-center gap-1"><Phone size={13} /> Attendant {c.attendant.name}{c.attendant.phone ? <a href={`tel:${c.attendant.phone}`} className="text-blue-600 ml-1">{c.attendant.phone}</a> : null}</p>}
                {c.absent_today && <p className="text-xs font-bold text-amber-700">{c.absent_today} today, so the bus won't wait.</p>}
              </div>
              <div className="space-y-2">
                {c.trips?.map((t) => (
                  <div key={t.kind} className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">{t.kind === 'morning' ? 'To school today' : 'Home today'}</p>
                    <p className="font-semibold inline-flex items-center gap-1">
                      {t.status === 'completed' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Clock size={13} className="text-slate-400" />} {t.status_label}
                      {t.delay_minutes ? <span className="text-amber-700 font-bold"> · about {t.delay_minutes} min late{t.note ? ` (${t.note})` : ''}</span> : null}
                    </p>
                    {Object.keys(t.events).length > 0 && <p className="text-xs text-slate-600">{Object.entries(t.events).map(([k, at]) => `${EVENT[k] || k} ${at}`).join(' · ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
