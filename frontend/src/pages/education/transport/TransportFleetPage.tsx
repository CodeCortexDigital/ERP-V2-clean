import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import transport, { Crew, errorText, Vehicle } from '@/services/transport.service';
import { Modal } from '@/components/ui/Modal';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<div className="mt-1">{children}</div></label>;
}

function VehicleForm({ v: start, onSaved }: { v?: Vehicle; onSaved: () => void }) {
  const [v, setV] = useState<Partial<Vehicle>>(start || { kind: 'bus', capacity: 30, is_active: true });
  const set = (k: keyof Vehicle, val: unknown) => setV({ ...v, [k]: val });
  const save = async () => {
    try { await transport.saveVehicle(v); toast.success('Vehicle saved.'); onSaved(); } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Name"><input className={input} value={v.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Bus 3" /></Field>
      <Field label="Registration number"><input className={input} value={v.registration_no || ''} onChange={(e) => set('registration_no', e.target.value)} /></Field>
      <Field label="Type"><select className={input} value={v.kind} onChange={(e) => set('kind', e.target.value)}><option value="bus">Bus</option><option value="coaster">Coaster</option><option value="van">Van</option><option value="car">Car</option></select></Field>
      <Field label="Seats"><input type="number" min={1} className={input} value={v.capacity ?? ''} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
      <Field label="Make and model"><input className={input} value={v.make_model || ''} onChange={(e) => set('make_model', e.target.value)} /></Field>
      <Field label="Insurance expires"><input type="date" className={input} value={v.insurance_expiry || ''} onChange={(e) => set('insurance_expiry', e.target.value)} /></Field>
      <Field label="Fitness certificate expires"><input type="date" className={input} value={v.fitness_expiry || ''} onChange={(e) => set('fitness_expiry', e.target.value)} /></Field>
      <label className="text-xs font-semibold text-slate-600 inline-flex items-center gap-2 mt-6"><input type="checkbox" checked={!!v.is_active} onChange={(e) => set('is_active', e.target.checked)} /> In service</label>
      <div className="sm:col-span-2 flex justify-end"><button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save</button></div>
    </div>
  );
}

function CrewForm({ c: start, onSaved }: { c?: Crew; onSaved: () => void }) {
  const [c, setC] = useState<Partial<Crew>>(start || { role: 'driver', is_active: true });
  const set = (k: keyof Crew, val: unknown) => setC({ ...c, [k]: val });
  const save = async () => {
    try { await transport.saveCrew(c); toast.success('Saved.'); onSaved(); } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Role"><select className={input} value={c.role} onChange={(e) => set('role', e.target.value)}><option value="driver">Driver</option><option value="attendant">Attendant</option></select></Field>
      <Field label="Name"><input className={input} value={c.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Phone"><input className={input} value={c.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field label="National ID"><input className={input} value={c.national_id || ''} onChange={(e) => set('national_id', e.target.value)} /></Field>
      {c.role === 'driver' && <Field label="Licence number"><input className={input} value={c.licence_no || ''} onChange={(e) => set('licence_no', e.target.value)} /></Field>}
      {c.role === 'driver' && <Field label="Licence expires"><input type="date" className={input} value={c.licence_expiry || ''} onChange={(e) => set('licence_expiry', e.target.value)} /></Field>}
      <div className="sm:col-span-2"><Field label="Login email (optional: lets them run their route's trips on a phone under Bus duty)"><input className={input} value={c.user_email || ''} onChange={(e) => set('user_email', e.target.value)} /></Field></div>
      <div className="sm:col-span-2 flex justify-end"><button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save</button></div>
    </div>
  );
}

const Warn = ({ items }: { items: string[] }) => items.length ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 text-[11px] font-bold"><AlertTriangle size={11} /> {items.join(', ')} expiring</span> : null;

/** Office: vehicles (seats, insurance and fitness dates) and drivers / attendants (licences, phone logins). */
export default function TransportFleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [crew, setCrew] = useState<Crew[]>([]);
  const [editV, setEditV] = useState<Vehicle | 'new' | null>(null);
  const [editC, setEditC] = useState<Crew | 'new' | null>(null);
  const load = () => { transport.vehicles().then(setVehicles).catch(() => undefined); transport.crew().then(setCrew).catch(() => undefined); };
  useEffect(load, []);
  const del = async (fn: () => Promise<unknown>) => { try { await fn(); load(); } catch (e) { toast.error(errorText(e, 'Could not delete.')); } };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <section className={card}>
        <div className="flex items-center mb-2"><h2 className="font-black text-slate-900 mr-auto">Vehicles</h2><button onClick={() => setEditV('new')} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Plus size={12} /> Add vehicle</button></div>
        {vehicles.length === 0 ? <p className="text-sm text-slate-500">No vehicles yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {vehicles.map((v) => (
              <li key={v.id} className="py-2 flex flex-wrap items-center gap-2">
                <span className="mr-auto"><b>{v.name}</b> <span className="text-slate-500">· {v.registration_no} · {v.capacity} seats{v.is_active ? '' : ' · out of service'}</span></span>
                <Warn items={v.expiring} />
                <button onClick={() => setEditV(v)} className="text-xs font-bold text-blue-600">Edit</button>
                <button onClick={() => window.confirm(`Delete ${v.name}?`) && del(() => transport.removeVehicle(v.id))} aria-label={`Delete ${v.name}`} className="text-rose-600"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={card}>
        <div className="flex items-center mb-2"><h2 className="font-black text-slate-900 mr-auto">Drivers & attendants</h2><button onClick={() => setEditC('new')} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Plus size={12} /> Add person</button></div>
        {crew.length === 0 ? <p className="text-sm text-slate-500">Nobody yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {crew.map((c) => (
              <li key={c.id} className="py-2 flex flex-wrap items-center gap-2">
                <span className="mr-auto"><b>{c.name}</b> <span className="text-slate-500">· {c.role === 'driver' ? 'Driver' : 'Attendant'}{c.phone ? ` · ${c.phone}` : ''}{c.user_email ? ' · has login' : ''}</span></span>
                <Warn items={c.expiring} />
                <button onClick={() => setEditC(c)} className="text-xs font-bold text-blue-600">Edit</button>
                <button onClick={() => window.confirm(`Delete ${c.name}?`) && del(() => transport.removeCrew(c.id))} aria-label={`Delete ${c.name}`} className="text-rose-600"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {editV && <Modal open onClose={() => setEditV(null)} title={editV === 'new' ? 'Add a vehicle' : editV.name} size="lg"><VehicleForm v={editV === 'new' ? undefined : editV} onSaved={() => { setEditV(null); load(); }} /></Modal>}
      {editC && <Modal open onClose={() => setEditC(null)} title={editC === 'new' ? 'Add a driver or attendant' : editC.name} size="lg"><CrewForm c={editC === 'new' ? undefined : editC} onSaved={() => { setEditC(null); load(); }} /></Modal>}
    </div>
  );
}
