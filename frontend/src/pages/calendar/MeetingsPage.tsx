import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Handshake, Loader2, MapPin, Trash2 } from 'lucide-react';
import calendar, { type MeetingSlot } from '@/services/calendar.service';
import { useAuth } from '@/contexts/AuthContext';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';
const day = (s: string) => new Date(`${s}T00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function byDay(slots: MeetingSlot[]) {
  const out: Record<string, MeetingSlot[]> = {};
  slots.forEach((s) => { (out[s.date] ||= []).push(s); });
  return Object.entries(out).sort(([a], [b]) => a.localeCompare(b));
}

/** Parent-teacher meetings: staff offer times, families book one about a child. */
export default function MeetingsPage() {
  const { role } = useAuth();
  const staff = role === 'admin' || role === 'teacher';
  const [slots, setSlots] = useState<MeetingSlot[] | null>(null);
  const [kids, setKids] = useState<Array<{ id: string; full_name: string; class_name: string }>>([]);
  const [booking, setBooking] = useState<{ slot: MeetingSlot; student: string; note: string } | null>(null);
  const [offer, setOffer] = useState({ date: '', from: '15:00', to: '17:00', minutes: 15, location: '', title: 'Parent-teacher meeting' });

  const load = useCallback(() => calendar.meetings().then(setSlots).catch(() => setSlots([])), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!staff) calendar.children().then(setKids).catch(() => undefined); }, [staff]);

  const make = async () => {
    try {
      const made = await calendar.offer(offer);
      toast.success(made.length ? `${made.length} meeting times offered` : 'Those times are already offered');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not offer those times.'); }
  };
  const book = async () => {
    if (!booking) return;
    try {
      await calendar.book(booking.slot.id, booking.student, booking.note);
      toast.success(`Booked with ${booking.slot.host.name}`);
      setBooking(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not book that time.'); load(); }
  };
  const cancel = async (s: MeetingSlot) => {
    if (!window.confirm('Cancel this meeting? The other person will be told.')) return;
    await calendar.cancel(s.id);
    load();
  };
  const removeSlot = async (s: MeetingSlot) => {
    if (s.booked && !window.confirm(`${s.booked_by} has booked this time. Remove it and tell them?`)) return;
    await calendar.removeSlot(s.id);
    load();
  };

  const mine = (slots || []).filter((s) => s.mine);
  const open = (slots || []).filter((s) => !s.booked);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 text-slate-800">
      <h1 className="text-xl font-bold inline-flex items-center gap-2"><Handshake className="w-5 h-5" /> Parent-teacher meetings</h1>

      {staff && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
          <p className="font-semibold">Offer meeting times</p>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="flex flex-col">Date<input type="date" className={input} aria-label="Meeting date" value={offer.date} onChange={(e) => setOffer({ ...offer, date: e.target.value })} /></label>
            <label className="flex flex-col">From<input type="time" className={input} aria-label="From" value={offer.from} onChange={(e) => setOffer({ ...offer, from: e.target.value })} /></label>
            <label className="flex flex-col">To<input type="time" className={input} aria-label="To" value={offer.to} onChange={(e) => setOffer({ ...offer, to: e.target.value })} /></label>
            <label className="flex flex-col">Each meeting
              <select className={input} value={offer.minutes} onChange={(e) => setOffer({ ...offer, minutes: Number(e.target.value) })}>
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select></label>
            <label className="flex flex-col flex-1 min-w-[140px]">Place<input className={input} placeholder="e.g. Room 4 or a video link" value={offer.location} onChange={(e) => setOffer({ ...offer, location: e.target.value })} /></label>
            <button onClick={make} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Offer times</button>
          </div>
          <p className="text-xs text-slate-500">Families of the students you teach can book one of these times. You'll get an email when they do, and both of you get a reminder the day before.</p>
        </section>
      )}

      {!slots ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : staff ? (
        slots.length === 0 ? <p className="text-sm text-slate-500">You haven't offered any meeting times yet.</p> : (
          byDay(slots).map(([d, list]) => (
            <section key={d} className="bg-white rounded-xl border border-slate-200">
              <h2 className="px-4 py-2 font-bold border-b border-slate-100">{day(d)}</h2>
              <ul className="divide-y divide-slate-100 text-sm">
                {list.map((s) => (
                  <li key={s.id} className="px-4 py-2 flex items-center gap-3">
                    <b className="w-28 shrink-0">{s.start_time}–{s.end_time}</b>
                    {s.booked ? <span className="flex-1"><b>{s.booked_by}</b>{s.student ? ` about ${s.student}` : ''}{s.note ? <span className="block text-xs text-slate-500">“{s.note}”</span> : null}</span>
                      : <span className="flex-1 text-slate-400">Open</span>}
                    {s.location && <span className="text-xs text-slate-500 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>}
                    <button aria-label="Remove time" onClick={() => removeSlot(s)} className="text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )
      ) : (
        <>
          {mine.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="font-bold mb-2">Your meetings</h2>
              <ul className="space-y-2 text-sm">
                {mine.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <span className="flex-1"><b>{day(s.date)}, {s.start_time}</b> with {s.host.name}{s.student ? ` about ${s.student}` : ''}{s.location ? ` · ${s.location}` : ''}</span>
                    <button onClick={() => cancel(s)} className="text-rose-600 font-semibold">Cancel</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {open.length === 0 ? <p className="text-sm text-slate-500">Your children's teachers haven't offered any meeting times yet.</p> : (
            byDay(open).map(([d, list]) => (
              <section key={d} className="bg-white rounded-xl border border-slate-200 p-4">
                <h2 className="font-bold mb-2">{day(d)}</h2>
                {[...new Set(list.map((s) => s.host.name))].map((host) => (
                  <div key={host} className="mb-2">
                    <p className="text-sm font-semibold text-slate-600 mb-1">{host}</p>
                    <div className="flex flex-wrap gap-2">
                      {list.filter((s) => s.host.name === host).map((s) => (
                        <button key={s.id} onClick={() => setBooking({ slot: s, student: kids.length === 1 ? kids[0].id : '', note: '' })}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold hover:border-[color:var(--app-accent)]">{s.start_time}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))
          )}
        </>
      )}

      {booking && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setBooking(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-3 text-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Book meeting">
            <h3 className="font-bold text-lg">Book {booking.slot.start_time} with {booking.slot.host.name}</h3>
            <p className="text-slate-600">{day(booking.slot.date)}{booking.slot.location ? ` · ${booking.slot.location}` : ''}</p>
            {kids.length > 1 && (
              <label className="block">About
                <select className={`${input} w-full`} aria-label="Child" value={booking.student} onChange={(e) => setBooking({ ...booking, student: e.target.value })}>
                  <option value="">Choose a child</option>
                  {kids.map((k) => <option key={k.id} value={k.id}>{k.full_name}{k.class_name ? ` (${k.class_name})` : ''}</option>)}
                </select></label>
            )}
            <textarea className={`${input} w-full`} rows={3} placeholder="Anything you'd like to talk about? (optional)" aria-label="Note" value={booking.note} onChange={(e) => setBooking({ ...booking, note: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBooking(null)} className="px-4 py-2 rounded-lg border border-slate-200 font-semibold">Back</button>
              <button onClick={book} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Book this time</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
