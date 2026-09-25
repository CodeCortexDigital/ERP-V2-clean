import { useEffect, useState } from 'react';
import { Bus, Loader2 } from 'lucide-react';
import transport, { BoardRow } from '@/services/transport.service';
import { Modal } from '@/components/ui/Modal';
import TripRunner from '@/components/transport/TripRunner';

const TONE = { not_started: 'bg-slate-100 text-slate-600', en_route: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700' };

/** Every route's two trips today: status, delays, who is on board. Open a trip to run it. Crew see only their routes. */
export default function TransportTodayPage({ crew = false }: { crew?: boolean }) {
  const [data, setData] = useState<{ date: string; routes: BoardRow[] } | null>(null);
  const [open, setOpen] = useState<{ id: string; name: string; kind: 'morning' | 'afternoon' } | null>(null);
  const load = () => transport.today().then(setData).catch(() => setData({ date: '', routes: [] }));
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  return (
    <div className="space-y-4">
      {crew && <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><Bus size={18} className="text-blue-600" /> Bus duty</h1>}
      {data.routes.length === 0 ? <p className="text-sm text-slate-500">{crew ? 'You are not the driver or attendant on any route.' : 'No routes yet. Add one under Routes.'}</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.routes.map((r) => (
            <section key={r.route.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-2 mb-2">
                <div className="mr-auto">
                  <p className="font-black text-slate-900">{r.route.name}</p>
                  <p className="text-xs text-slate-500">{[r.route.vehicle, r.route.driver && `Driver ${r.route.driver}`, r.route.driver_phone].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {r.trips.map((t) => (
                  <button key={t.kind} onClick={() => setOpen({ id: r.route.id, name: r.route.name, kind: t.kind })}
                    className="text-left rounded-lg border border-slate-100 hover:border-blue-300 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-auto">{t.kind === 'morning' ? 'To school' : 'Home'}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${TONE[t.status]}`}>{t.status_label}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1"><b>{t.boarded}</b> on · <b>{t.dropped}</b> off · {t.riders - t.absent} expected</p>
                    <p className="text-[11px] text-slate-500">{t.absent ? `${t.absent} absent · ` : ''}{t.no_show ? `${t.no_show} not at stop · ` : ''}{t.delay_minutes ? `${t.delay_minutes} min late` : ''}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {open && (
        <Modal open onClose={() => { setOpen(null); load(); }} title={open.name} size="xl">
          <div className="max-h-[72vh] overflow-y-auto"><TripRunner routeId={open.id} kind={open.kind} /></div>
        </Modal>
      )}
    </div>
  );
}
