import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, Link2, Loader2, MapPin, Plus, Trash2, X } from 'lucide-react';
import calendar, { type CalendarItem } from '@/services/calendar.service';
import classSectionService, { type ClassWithSections } from '@/services/classSection.service';
import { useAuth } from '@/contexts/AuthContext';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const KINDS: Array<[string, string]> = [['event', 'Event'], ['holiday', 'Holiday / closure'], ['meeting', 'Meeting'], ['deadline', 'Deadline'],
  ['exam', 'Exam'], ['trip', 'Trip'], ['sports', 'Sports'], ['other', 'Other']];
const COLORS: Record<string, string> = {
  holiday: 'bg-rose-100 text-rose-800 border-rose-200', exam: 'bg-amber-100 text-amber-800 border-amber-200',
  deadline: 'bg-orange-100 text-orange-800 border-orange-200', meeting: 'bg-violet-100 text-violet-800 border-violet-200',
  term: 'bg-emerald-100 text-emerald-800 border-emerald-200', trip: 'bg-sky-100 text-sky-800 border-sky-200',
  sports: 'bg-lime-100 text-lime-800 border-lime-200',
};
const color = (k: string) => COLORS[k] || 'bg-blue-100 text-blue-800 border-blue-200';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const blank = { title: '', description: '', kind: 'event', start_date: '', end_date: '', start_time: '', end_time: '', location: '',
  audience: 'everyone', class_ids: [] as string[], grade_levels: [] as number[], closes_school: false, remind_days_before: '' };

/** The school calendar: events, holidays, terms, exams, due dates and meetings for the signed-in person. */
export default function CalendarPage() {
  const { role } = useAuth();
  const staff = role === 'admin' || role === 'teacher';
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [open, setOpen] = useState<CalendarItem | null>(null);
  const [form, setForm] = useState<(typeof blank & { id?: string }) | null>(null);
  const [classes, setClasses] = useState<ClassWithSections[]>([]);

  // The grid runs Monday to Sunday and covers whole weeks.
  const gridStart = useMemo(() => { const d = new Date(month); d.setDate(1 - ((d.getDay() + 6) % 7)); return d; }, [month]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(d.getDate() + i); return d; }), [gridStart]);
  const load = useCallback(() => {
    setItems(null);
    calendar.feed(iso(days[0]), iso(days[41])).then(setItems).catch(() => setItems([]));
  }, [days]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (staff) classSectionService.getClassesWithSections().then((r) => setClasses(r.data as ClassWithSections[])).catch(() => undefined); }, [staff]);

  const onDay = (d: string) => (items || []).filter((i) => i.start_date <= d && i.end_date >= d);
  const today = iso(new Date());
  const monthKey = iso(month).slice(0, 7);
  const agenda = (items || []).filter((i) => i.end_date.slice(0, 7) >= monthKey && i.start_date.slice(0, 7) <= monthKey);
  const grades = [...new Set(classes.map((c: any) => c.grade_level).filter((g: any) => g !== null && g !== undefined))].sort((a: any, b: any) => a - b) as number[];
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const newEvent = (date = today) => setForm({ ...blank, start_date: date, end_date: date, audience: role === 'teacher' ? 'class' : 'everyone' });
  const edit = (i: CalendarItem) => {
    setOpen(null);
    setForm({ ...blank, id: i.id.split(':')[1], title: i.title, description: i.description || '', kind: i.kind, start_date: i.start_date,
      end_date: i.end_date, start_time: i.start_time || '', end_time: i.end_time || '', location: i.location || '', audience: i.audience || 'everyone',
      class_ids: i.class_ids || [], grade_levels: i.grade_levels || [], closes_school: !!i.closes_school,
      remind_days_before: i.remind_days_before == null ? '' : String(i.remind_days_before) });
  };
  const save = async () => {
    if (!form) return;
    const { id, ...body } = form;
    const payload = { ...body, start_time: body.start_time || null, end_time: body.end_time || null,
      remind_days_before: body.remind_days_before === '' ? null : Number(body.remind_days_before) };
    try {
      if (id) await calendar.update(id, payload); else await calendar.create(payload);
      toast.success(id ? 'Event updated' : 'Event added');
      setForm(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save the event.'); }
  };
  const remove = async (i: CalendarItem) => {
    if (!window.confirm(`Delete "${i.title}"?`)) return;
    await calendar.remove(i.id.split(':')[1]);
    setOpen(null);
    load();
  };
  const subscribe = async () => {
    try {
      const url = await calendar.feedLink();
      await navigator.clipboard.writeText(url).catch(() => undefined);
      window.prompt('Your private calendar link was copied. In Google Calendar choose "Other calendars → From URL"; on iPhone go to Settings → Calendar → Accounts → Add Subscribed Calendar.', url);
    } catch { toast.error('Could not make the calendar link.'); }
  };
  const when = (i: CalendarItem) => {
    const d = (s: string) => new Date(`${s}T00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const span = i.start_date === i.end_date ? d(i.start_date) : `${d(i.start_date)} – ${d(i.end_date)}`;
    return i.start_time ? `${span}, ${i.start_time}${i.end_time ? `–${i.end_time}` : ''}` : `${span} (all day)`;
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4 text-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold inline-flex items-center gap-2 mr-auto"><CalendarDays className="w-5 h-5" /> School calendar</h1>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
          {(['month', 'agenda'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 font-semibold ${view === v ? 'bg-brand text-white' : ''}`}>{v === 'month' ? 'Month' : 'List'}</button>)}
        </div>
        <button onClick={subscribe} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold"><Link2 className="w-4 h-4" /> Add to my phone calendar</button>
        {staff && <button onClick={() => newEvent()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold"><Plus className="w-4 h-4" /> Add event</button>}
      </div>

      <div className="flex items-center gap-2">
        <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-lg border border-slate-200 bg-white"><ChevronLeft className="w-4 h-4" /></button>
        <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-lg border border-slate-200 bg-white"><ChevronRight className="w-4 h-4" /></button>
        <h2 className="font-bold text-lg">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="ml-2 text-sm text-brand font-semibold">Today</button>
        {!items && <Loader2 className="w-4 h-4 animate-spin text-brand" />}
      </div>

      {view === 'month' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[720px] text-xs">
            {WEEKDAYS.map((w) => <div key={w} className="px-2 py-1.5 font-semibold text-slate-500 border-b border-slate-200">{w}</div>)}
            {days.map((d) => {
              const key = iso(d);
              const list = onDay(key);
              const closed = list.some((i) => i.closes_school);
              return (
                <div key={key} onDoubleClick={() => staff && newEvent(key)} data-date={key}
                  className={`min-h-[96px] border-b border-r border-slate-100 p-1 ${d.getMonth() !== month.getMonth() ? 'bg-slate-50 text-slate-400' : ''} ${closed ? 'bg-rose-50/60' : ''}`}>
                  <div className={`text-right mb-1 ${key === today ? 'font-bold text-brand' : ''}`}>{d.getDate()}</div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map((i) => (
                      <button key={i.id} onClick={() => setOpen(i)} title={i.title} className={`w-full text-left truncate rounded border px-1 py-0.5 ${color(i.kind)}`}>
                        {i.start_time && i.start_date === key ? `${i.start_time} ` : ''}{i.title}
                      </button>
                    ))}
                    {list.length > 3 && <button onClick={() => { setView('agenda'); }} className="text-[11px] text-slate-500">+{list.length - 3} more</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {agenda.length === 0 && <p className="p-4 text-sm text-slate-500">Nothing on the calendar this month.</p>}
          {agenda.map((i) => (
            <button key={i.id} onClick={() => setOpen(i)} className="w-full text-left p-3 flex gap-3 items-start hover:bg-slate-50">
              <span className={`shrink-0 text-xs rounded border px-2 py-0.5 ${color(i.kind)}`}>{KINDS.find(([k]) => k === i.kind)?.[1] || (i.kind === 'term' ? 'Term' : i.kind)}</span>
              <span className="flex-1"><b className="text-sm">{i.title}</b><span className="block text-xs text-slate-500">{when(i)}{i.location ? ` · ${i.location}` : ''}</span></span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {[['event', 'Events'], ['holiday', 'Holidays (no school)'], ['exam', 'Exams'], ['deadline', 'Due dates & fees'], ['term', 'Terms'], ['meeting', 'Meetings']].map(([k, l]) => (
          <span key={k} className={`rounded border px-2 py-0.5 ${color(k)}`}>{l}</span>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-2" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.title}>
            <div className="flex justify-between gap-2"><h3 className="font-bold text-lg">{open.title}</h3><button aria-label="Close" onClick={() => setOpen(null)}><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-slate-600">{when(open)}</p>
            {open.location && <p className="text-sm inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {open.location}</p>}
            {open.closes_school && <p className="text-sm font-semibold text-rose-700">School is closed.</p>}
            {open.description && <p className="text-sm whitespace-pre-wrap">{open.description}</p>}
            {open.editable && (
              <div className="flex gap-2 pt-2">
                <button onClick={() => edit(open)} className="px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold">Edit</button>
                <button onClick={() => remove(open)} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-sm font-semibold inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            )}
          </div>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-3 text-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Event">
            <div className="flex justify-between"><h3 className="font-bold text-lg">{form.id ? 'Edit event' : 'Add event'}</h3><button aria-label="Close" onClick={() => setForm(null)}><X className="w-4 h-4" /></button></div>
            <input className={input} placeholder="Title" aria-label="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <label>Type<select className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, closes_school: e.target.value === 'holiday' || form.closes_school })}>
                {KINDS.filter(([k]) => role === 'admin' || k !== 'holiday').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label>Place<input className={input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
              <label>From<input type="date" className={input} aria-label="Start date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: form.end_date < e.target.value ? e.target.value : form.end_date })} /></label>
              <label>To<input type="date" className={input} aria-label="End date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></label>
              <label>Starts at <span className="text-slate-400">(blank = all day)</span><input type="time" className={input} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
              <label>Ends at<input type="time" className={input} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
            </div>
            <textarea className={input} rows={3} placeholder="Details (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <p className="font-semibold mb-1">Who sees it</p>
              <div className="flex flex-wrap gap-2">
                {[['everyone', 'Everyone'], ['families', 'Families'], ['staff', 'Staff only'], ['class', 'Chosen classes'], ['grade', 'Grade levels']]
                  .filter(([v]) => role === 'admin' || v === 'class').map(([v, l]) => (
                    <button key={v} onClick={() => setForm({ ...form, audience: v })} className={`px-3 py-1 rounded-full font-semibold border ${form.audience === v ? 'bg-brand text-white border-transparent' : 'bg-white border-slate-200'}`}>{l}</button>
                  ))}
              </div>
              {form.audience === 'class' && <div className="flex flex-wrap gap-2 mt-2">{classes.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" checked={form.class_ids.includes(c.id)} onChange={() => setForm({ ...form, class_ids: toggle(form.class_ids, c.id) })} />{c.name}</label>)}</div>}
              {form.audience === 'grade' && <div className="flex flex-wrap gap-2 mt-2">{grades.map((g) => <label key={g} className="flex items-center gap-1.5"><input type="checkbox" checked={form.grade_levels.includes(g)} onChange={() => setForm({ ...form, grade_levels: toggle(form.grade_levels, g) })} />{g === -1 ? 'Pre-K' : g === 0 ? 'K' : `Grade ${g}`}</label>)}</div>}
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              {role === 'admin' && <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.closes_school} onChange={(e) => setForm({ ...form, closes_school: e.target.checked })} /> School is closed (no attendance)</label>}
              <label className="flex items-center gap-1.5">Remind people
                <select className="rounded border border-slate-300 px-2 py-1" aria-label="Reminder" value={form.remind_days_before} onChange={(e) => setForm({ ...form, remind_days_before: e.target.value })}>
                  <option value="">no reminder</option><option value="0">on the day</option><option value="1">1 day before</option><option value="2">2 days before</option><option value="3">3 days before</option><option value="7">a week before</option>
                </select></label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-slate-200 font-semibold">Cancel</button>
              <button onClick={save} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Save event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
