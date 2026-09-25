import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Phone, Play, ShieldAlert, Square, UserX } from 'lucide-react';
import { toast } from 'sonner';
import transport, { errorText, Manifest, ManifestRow } from '@/services/transport.service';

const btn = 'px-2.5 py-1.5 rounded-lg text-xs font-bold border';

/**
 * Run one trip from a phone or the office: start, report a delay, finish; tick who got on and off, or who was not
 * at the stop. On the way home it shows who may collect each child. Families are told as each thing happens.
 */
export default function TripRunner({ routeId, kind: initialKind = 'morning' }: { routeId: string; kind?: 'morning' | 'afternoon' }) {
  const [kind, setKind] = useState<'morning' | 'afternoon'>(initialKind);
  const [m, setM] = useState<Manifest | null>(null);
  const [delay, setDelay] = useState('10');
  const [note, setNote] = useState('');

  const load = () => transport.manifest(routeId, kind).then(setM).catch((e) => toast.error(errorText(e, 'Could not load the trip.')));
  useEffect(() => { setM(null); load(); }, [routeId, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: 'start' | 'delay' | 'complete') => {
    try {
      const r = await transport.tripAction(routeId, kind, action, action === 'delay' ? { minutes: Number(delay) || 0, note } : {});
      toast.success(action === 'start' ? `Trip started. ${r.people_told} parent(s) told.`
        : action === 'delay' ? `Delay sent to ${r.people_told} parent(s).` : 'Trip completed.');
      load();
    } catch (e) { toast.error(errorText(e, 'That did not work.')); }
  };
  const mark = async (row: ManifestRow, event: 'boarded' | 'dropped' | 'no_show') => {
    try {
      let tripId = m?.trip.id;
      if (!tripId) { await transport.tripAction(routeId, kind, 'start'); tripId = (await transport.manifest(routeId, kind)).trip.id; }
      if (row.events[event]) await transport.unmark(tripId!, row.student.id, event);
      else await transport.mark(tripId!, row.student.id, event);
      load();
    } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };

  const expected = m ? m.students.filter((r) => !r.absent) : [];
  const onBoard = expected.filter((r) => r.events.boarded && !r.events.dropped).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['morning', 'afternoon'] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`${btn} ${kind === k ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>
            {k === 'morning' ? 'To school' : 'Home'}
          </button>
        ))}
        {m && <span className="text-xs text-slate-500 ml-1">{m.trip.status_label}{m.trip.delay_minutes ? ` · ${m.trip.delay_minutes} min late` : ''} · {onBoard} on board · {expected.length} expected</span>}
      </div>
      {!m ? <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><Loader2 className="animate-spin" size={16} /> Loading…</div> : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
            {m.trip.status === 'not_started' && <button onClick={() => act('start')} className={`${btn} bg-blue-600 text-white border-transparent inline-flex items-center gap-1`}><Play size={12} /> Start trip</button>}
            {m.trip.status !== 'completed' && (
              <>
                <input aria-label="Minutes late" type="number" min={1} className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs" value={delay} onChange={(e) => setDelay(e.target.value)} />
                <input aria-label="Reason" className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs" placeholder="Reason (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <button onClick={() => act('delay')} className={`${btn} border-amber-300 text-amber-800 inline-flex items-center gap-1`}><Clock size={12} /> Tell families we're late</button>
                {m.trip.status === 'en_route' && <button onClick={() => act('complete')} className={`${btn} bg-emerald-600 text-white border-transparent inline-flex items-center gap-1 ml-auto`}><Square size={12} /> Finish trip</button>}
              </>
            )}
          </div>
          {m.students.length === 0 ? <p className="text-sm text-slate-500">No students ride this trip.</p> : (
            <ul className="divide-y divide-slate-100">
              {m.students.map((r) => (
                <li key={r.rider_id} className={`py-2.5 ${r.absent ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 mr-auto">
                      <p className="text-sm font-semibold text-slate-800">{r.student.full_name} <span className="text-xs text-slate-400 font-normal">· {r.student.class_name}</span></p>
                      <p className="text-xs text-slate-500">
                        {r.stop ? `${r.stop.name}${(kind === 'morning' ? r.stop.morning_time : r.stop.afternoon_time) ? ` · ${kind === 'morning' ? r.stop.morning_time : r.stop.afternoon_time}` : ''}` : 'No stop'}
                        {r.absent && <span className="ml-1 font-bold text-rose-600">· {r.absent}</span>}
                      </p>
                    </div>
                    <button onClick={() => mark(r, 'boarded')} className={`${btn} ${r.events.boarded ? 'bg-emerald-600 text-white border-transparent' : 'border-slate-200'}`}>
                      {r.events.boarded ? <><CheckCircle2 size={12} className="inline" /> On {r.events.boarded}</> : 'Got on'}
                    </button>
                    <button onClick={() => mark(r, 'dropped')} className={`${btn} ${r.events.dropped ? 'bg-blue-600 text-white border-transparent' : 'border-slate-200'}`}>
                      {r.events.dropped ? `Off ${r.events.dropped}` : kind === 'morning' ? 'At school' : 'Dropped off'}
                    </button>
                    <button onClick={() => mark(r, 'no_show')} className={`${btn} ${r.events.no_show ? 'bg-rose-600 text-white border-transparent' : 'border-slate-200 text-rose-700'}`}>
                      <UserX size={12} className="inline" /> {r.events.no_show ? 'Not there' : 'Not at stop'}
                    </button>
                  </div>
                  {kind === 'afternoon' && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      May collect: {r.may_collect.length ? r.may_collect.map((p) => `${p.name} (${p.relationship})`).join(', ') : 'nobody listed — check with the office'}
                      {r.may_not_collect.length > 0 && <span className="ml-1 font-bold text-rose-700 inline-flex items-center gap-0.5"><ShieldAlert size={11} /> Not: {r.may_not_collect.join(', ')}</span>}
                    </p>
                  )}
                  {r.contacts.length > 0 && <p className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1"><Phone size={10} /> {r.contacts.map((c) => `${c.name} ${c.phone}`).join(' · ')}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
