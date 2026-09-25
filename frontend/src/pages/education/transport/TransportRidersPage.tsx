import { useEffect, useState } from 'react';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import transport, { errorText, Rider, Route } from '@/services/transport.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

function AssignForm({ routes, rider, onSaved }: { routes: Route[]; rider?: Rider; onSaved: () => void }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ id: string; full_name: string; student_id: string; class_name?: string }>>([]);
  const [student, setStudent] = useState<{ id: string; full_name: string } | null>(rider ? rider.student : null);
  const [v, setV] = useState({
    route_id: rider?.route_id || routes[0]?.id || '', pickup_stop_id: rider?.pickup_stop?.id || '', dropoff_stop_id: rider?.dropoff_stop?.id || '',
    direction: rider?.direction || 'both', start_date: new Date().toISOString().slice(0, 10), monthly_fee: rider?.own_fee ? String(rider.monthly_fee) : '', notes: rider?.notes || '',
  });
  const route = routes.find((r) => r.id === v.route_id);

  useEffect(() => {
    if (rider || q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => api.get('/students/', { params: { search: q, page_size: 8 } }).then((r) => {
      const rows = (Array.isArray(r.data) ? r.data : r.data?.results || []) as any[];
      setFound(rows.map((s) => ({ id: s.id, full_name: s.full_name, student_id: s.student_id, class_name: s.current_class_name || s.class_name })));
    }).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [q, rider]);

  const save = async () => {
    if (!student) return;
    try {
      const body = { ...v, student_id: student.id };
      if (rider && rider.route_id === v.route_id) await transport.updateRider(rider.id, body);
      else await transport.addRider(body);
      toast.success(`${student.full_name} is on ${route?.name}.`);
      onSaved();
    } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };

  return (
    <div className="space-y-3">
      {!rider && (
        <div>
          <label className="text-xs font-semibold text-slate-600">Student
            <input className={`${input} mt-1`} placeholder="Type a name or student number" value={student ? student.full_name : q}
              onChange={(e) => { setStudent(null); setQ(e.target.value); }} />
          </label>
          {!student && found.length > 0 && (
            <ul className="border border-slate-100 rounded-lg mt-1 divide-y divide-slate-100">
              {found.map((s) => <li key={s.id}><button onClick={() => setStudent(s)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">{s.full_name} <span className="text-slate-400">· {s.student_id}{s.class_name ? ` · ${s.class_name}` : ''}</span></button></li>)}
            </ul>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-slate-600">Route
          <select className={`${input} mt-1`} value={v.route_id} onChange={(e) => setV({ ...v, route_id: e.target.value, pickup_stop_id: '', dropoff_stop_id: '' })}>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.name}{r.seats_left != null ? ` (${r.seats_left} seats left)` : ''}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Uses the bus
          <select className={`${input} mt-1`} value={v.direction} onChange={(e) => setV({ ...v, direction: e.target.value as Rider['direction'] })}>
            <option value="both">To and from school</option><option value="morning">To school only</option><option value="afternoon">Home only</option>
          </select>
        </label>
        {v.direction !== 'afternoon' && (
          <label className="text-xs font-semibold text-slate-600">Picked up at
            <select className={`${input} mt-1`} value={v.pickup_stop_id} onChange={(e) => setV({ ...v, pickup_stop_id: e.target.value })}>
              <option value="">Choose a stop</option>{route?.stops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.morning_time ? ` · ${s.morning_time}` : ''}</option>)}
            </select>
          </label>
        )}
        {v.direction !== 'morning' && (
          <label className="text-xs font-semibold text-slate-600">Dropped off at
            <select className={`${input} mt-1`} value={v.dropoff_stop_id} onChange={(e) => setV({ ...v, dropoff_stop_id: e.target.value })}>
              <option value="">Same as pick-up</option>{route?.stops.map((s) => <option key={s.id} value={s.id}>{s.name}{s.afternoon_time ? ` · ${s.afternoon_time}` : ''}</option>)}
            </select>
          </label>
        )}
        {!rider && <label className="text-xs font-semibold text-slate-600">From<input type="date" className={`${input} mt-1`} value={v.start_date} onChange={(e) => setV({ ...v, start_date: e.target.value })} /></label>}
        <label className="text-xs font-semibold text-slate-600">Monthly fee (blank = route fee)<input type="number" min={0} className={`${input} mt-1`} value={v.monthly_fee} onChange={(e) => setV({ ...v, monthly_fee: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Notes for the crew<input className={`${input} mt-1`} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="e.g. Waits at the gate of house 12" /></label>
      </div>
      <div className="flex justify-end"><button onClick={save} disabled={!student || !v.route_id} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">Save</button></div>
    </div>
  );
}

/** Office: which students ride which route, from which stop. */
export default function TransportRidersPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [route, setRoute] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Rider[] | null>(null);
  const [editing, setEditing] = useState<Rider | 'new' | null>(null);
  const load = () => transport.riders({ ...(route ? { route } : {}), ...(q ? { q } : {}) }).then(setRows).catch(() => setRows([]));
  useEffect(() => { transport.routes().then(setRoutes).catch(() => undefined); }, []);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [route, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const end = async (x: Rider) => {
    if (!window.confirm(`Take ${x.student.full_name} off ${x.route_name} from today?`)) return;
    try { await transport.endRider(x.id); toast.success('Removed from the route.'); load(); } catch (e) { toast.error(errorText(e, 'Could not remove.')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input aria-label="Search riders" className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm" placeholder="Student name or number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Route" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={route} onChange={(e) => setRoute(e.target.value)}>
          <option value="">All routes</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={() => setEditing('new')} disabled={!routes.length} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50"><UserPlus size={15} /> Add a student</button>
      </div>
      {!rows ? <Loader2 className="animate-spin text-slate-400" /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 px-3">Student</th><th>Route</th><th>Picked up</th><th>Dropped off</th><th>Uses</th><th>Fee</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((x) => (
                <tr key={x.id}>
                  <td className="py-2 px-3 font-semibold">{x.student.full_name} <span className="text-xs text-slate-400 font-normal">{x.student.class_name}</span></td>
                  <td>{x.route_name}</td>
                  <td>{x.pickup_stop ? `${x.pickup_stop.name}${x.pickup_stop.morning_time ? ` · ${x.pickup_stop.morning_time}` : ''}` : '—'}</td>
                  <td>{x.dropoff_stop ? `${x.dropoff_stop.name}${x.dropoff_stop.afternoon_time ? ` · ${x.dropoff_stop.afternoon_time}` : ''}` : '—'}</td>
                  <td className="text-xs">{x.direction_label}</td><td>{formatMoney(x.monthly_fee)}</td>
                  <td className="text-right pr-3 whitespace-nowrap space-x-2">
                    <button onClick={() => setEditing(x)} className="text-xs font-bold text-blue-600">Change</button>
                    <button onClick={() => end(x)} className="text-xs font-bold text-rose-600">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No students on transport yet.</p>}
        </div>
      )}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a student to a route' : editing.student.full_name} size="lg">
          <AssignForm routes={routes} rider={editing === 'new' ? undefined : editing} onSaved={() => { setEditing(null); load(); transport.routes().then(setRoutes); }} />
        </Modal>
      )}
    </div>
  );
}
