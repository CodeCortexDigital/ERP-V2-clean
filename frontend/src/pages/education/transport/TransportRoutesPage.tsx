import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import transport, { Crew, errorText, Route, Stop, Vehicle } from '@/services/transport.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

function RouteEditor({ route, vehicles, crew, onSaved }: { route?: Route; vehicles: Vehicle[]; crew: Crew[]; onSaved: () => void }) {
  const [v, setV] = useState({
    name: route?.name || '', code: route?.code || '', monthly_fee: String(route?.monthly_fee ?? ''),
    vehicle_id: route?.vehicle?.id || '', driver_id: route?.driver?.id || '', attendant_id: route?.attendant?.id || '', notes: route?.notes || '',
  });
  const [stops, setStops] = useState<Stop[]>(route?.stops || []);
  const [busy, setBusy] = useState(false);
  const setStop = (i: number, patch: Partial<Stop>) => setStops(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => { const n = [...stops]; [n[i], n[i + d]] = [n[i + d], n[i]]; setStops(n); };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await transport.saveRoute({ ...(route ? { id: route.id } : {}), ...v });
      await transport.saveStops(saved.id, stops.filter((s) => s.name.trim()));
      toast.success('Route saved.');
      onSaved();
    } catch (e) { toast.error(errorText(e, 'Could not save the route.')); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Route name<input className={`${input} mt-1`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Route 3 – Gulberg" /></label>
        <label className="text-xs font-semibold text-slate-600">Code<input className={`${input} mt-1`} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} /></label>
        <label className="text-xs font-semibold text-slate-600">Vehicle
          <select className={`${input} mt-1`} value={v.vehicle_id} onChange={(e) => setV({ ...v, vehicle_id: e.target.value })}>
            <option value="">—</option>{vehicles.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.registration_no} · {x.capacity} seats</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Driver
          <select className={`${input} mt-1`} value={v.driver_id} onChange={(e) => setV({ ...v, driver_id: e.target.value })}>
            <option value="">—</option>{crew.filter((c) => c.role === 'driver').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Attendant
          <select className={`${input} mt-1`} value={v.attendant_id} onChange={(e) => setV({ ...v, attendant_id: e.target.value })}>
            <option value="">—</option>{crew.filter((c) => c.role === 'attendant').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Monthly fee<input type="number" min={0} className={`${input} mt-1`} value={v.monthly_fee} onChange={(e) => setV({ ...v, monthly_fee: e.target.value })} /></label>
      </div>
      <div>
        <div className="flex items-center mb-2">
          <h4 className="text-sm font-black text-slate-800 mr-auto">Stops, in order</h4>
          <button onClick={() => setStops([...stops, { name: '', address: '', morning_time: '', afternoon_time: '' }])} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Plus size={12} /> Add stop</button>
        </div>
        {stops.length === 0 ? <p className="text-xs text-slate-400">No stops yet.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th>#</th><th>Stop</th><th>Address / landmark</th><th>Pick-up</th><th>Drop-off</th><th /></tr></thead>
            <tbody>
              {stops.map((s, i) => (
                <tr key={s.id || `new-${i}`}>
                  <td className="pr-2 text-slate-400">{i + 1}</td>
                  <td className="pr-2 py-1"><input aria-label={`Stop ${i + 1} name`} className={input} value={s.name} onChange={(e) => setStop(i, { name: e.target.value })} /></td>
                  <td className="pr-2"><input aria-label={`Stop ${i + 1} address`} className={input} value={s.address} onChange={(e) => setStop(i, { address: e.target.value })} /></td>
                  <td className="pr-2"><input aria-label={`Stop ${i + 1} pick-up`} type="time" className={input} value={s.morning_time || ''} onChange={(e) => setStop(i, { morning_time: e.target.value })} /></td>
                  <td className="pr-2"><input aria-label={`Stop ${i + 1} drop-off`} type="time" className={input} value={s.afternoon_time || ''} onChange={(e) => setStop(i, { afternoon_time: e.target.value })} /></td>
                  <td className="whitespace-nowrap">
                    <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button disabled={i === stops.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button onClick={() => setStops(stops.filter((_, j) => j !== i))} aria-label="Remove stop" className="text-rose-600 ml-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex justify-end"><button onClick={save} disabled={busy || !v.name.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save route'}</button></div>
    </div>
  );
}

/** Office: routes with their vehicle, crew, fee and stops; how full each one is. */
export default function TransportRoutesPage() {
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [crew, setCrew] = useState<Crew[]>([]);
  const [editing, setEditing] = useState<Route | 'new' | null>(null);
  const load = () => transport.routes().then(setRoutes).catch(() => setRoutes([]));
  useEffect(() => { load(); transport.vehicles().then(setVehicles).catch(() => undefined); transport.crew().then(setCrew).catch(() => undefined); }, []);

  const remove = async (r: Route) => {
    if (!window.confirm(`Delete ${r.name}?`)) return;
    try { await transport.removeRoute(r.id); load(); } catch (e) { toast.error(errorText(e, 'Could not delete.')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setEditing('new')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"><Plus size={15} /> Add route</button></div>
      {!routes ? <Loader2 className="animate-spin text-slate-400" /> : routes.length === 0 ? <p className="text-sm text-slate-500">No routes yet. Add vehicles and drivers under Fleet & Crew, then add a route.</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {routes.map((r) => (
            <section key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start gap-2">
                <div className="mr-auto">
                  <p className="font-black text-slate-900">{r.name}{!r.is_active && <span className="ml-2 text-[10px] font-black uppercase text-slate-400">inactive</span>}</p>
                  <p className="text-xs text-slate-500">{[r.vehicle && `${r.vehicle.name} (${r.vehicle.registration_no})`, r.driver && `Driver ${r.driver.name}`, r.attendant && `Attendant ${r.attendant.name}`].filter(Boolean).join(' · ') || 'No vehicle or crew yet'}</p>
                </div>
                <button onClick={() => setEditing(r)} className="text-xs font-bold text-blue-600">Edit</button>
                <button onClick={() => remove(r)} aria-label={`Delete ${r.name}`} className="text-rose-600"><Trash2 size={14} /></button>
              </div>
              <p className="text-sm text-slate-700 mt-2">
                <b>{r.riders}</b>{r.vehicle ? ` / ${r.vehicle.capacity}` : ''} riders{r.seats_left != null && r.seats_left <= 0 ? <span className="ml-1 font-bold text-rose-600">· full</span> : null} · {formatMoney(r.monthly_fee)} a month
              </p>
              <ol className="mt-2 text-xs text-slate-600 space-y-0.5">
                {r.stops.map((s) => <li key={s.id}>{s.order}. {s.name}{s.morning_time ? ` · ${s.morning_time}` : ''}{s.afternoon_time ? ` / ${s.afternoon_time}` : ''}</li>)}
              </ol>
            </section>
          ))}
        </div>
      )}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === 'new' ? 'Add a route' : `Edit ${editing.name}`} size="xl">
          <div className="max-h-[72vh] overflow-y-auto">
            <RouteEditor route={editing === 'new' ? undefined : editing} vehicles={vehicles} crew={crew} onSaved={() => { setEditing(null); load(); }} />
          </div>
        </Modal>
      )}
    </div>
  );
}
