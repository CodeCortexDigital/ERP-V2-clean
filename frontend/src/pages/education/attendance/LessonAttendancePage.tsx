import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCheck, Loader2, Save } from 'lucide-react';
import attendanceRegister, { type LessonStatus, type Roster } from '@/services/attendanceRegister.service';
import classSectionService, { type ClassWithSections } from '@/services/classSection.service';

const input = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const BUTTONS: Array<{ value: LessonStatus; label: string; on: string }> = [
  { value: 'present', label: 'Present', on: 'bg-emerald-600 text-white' },
  { value: 'late', label: 'Tardy', on: 'bg-amber-500 text-white' },
  { value: 'absent', label: 'Absent', on: 'bg-rose-600 text-white' },
  { value: 'excused', label: 'Excused', on: 'bg-sky-600 text-white' },
];

type Draft = Record<string, { status: LessonStatus; minutes_late: string; remarks: string }>;

/** Teachers take attendance for each lesson; in period mode the day's code is worked out automatically. */
export default function LessonAttendancePage() {
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState<Roster | null>(null);
  const [period, setPeriod] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { classSectionService.getClassesWithSections().then((r) => setClasses(r.data as ClassWithSections[])); }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    attendanceRegister.roster(classId, date, sectionId)
      .then((r) => { setRoster(r); setPeriod((p) => (p && r.periods.some((x) => x.period_number === p) ? p : r.periods[0]?.period_number ?? null)); })
      .catch((err) => { setRoster(null); toast.error(err?.response?.data?.error || 'Could not load the class.'); })
      .finally(() => setLoading(false));
  }, [classId, sectionId, date]);

  // Start from saved marks for the chosen lesson, or everyone present.
  useEffect(() => {
    if (!roster || period == null) return;
    const next: Draft = {};
    roster.students.forEach((s) => {
      const m = s.marks[period];
      next[s.id] = { status: m?.status || 'present', minutes_late: m?.minutes_late ? String(m.minutes_late) : '', remarks: m?.remarks || '' };
    });
    setDraft(next);
  }, [roster, period]);

  const lesson = roster?.periods.find((p) => p.period_number === period);
  const sections = classes.find((c) => c.id === classId)?.sections || [];
  const counts = useMemo(() => Object.values(draft).reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.status]: (acc[d.status] || 0) + 1 }), {}), [draft]);

  const save = async () => {
    if (!roster || period == null) return;
    setSaving(true);
    try {
      const res = await attendanceRegister.saveLesson({
        date, class_id: classId, period_number: period, period_id: lesson?.period_id, subject: lesson?.subject,
        records: roster.students.map((s) => ({ student_id: s.id, status: draft[s.id]?.status || 'present',
          minutes_late: draft[s.id]?.minutes_late ? Number(draft[s.id].minutes_late) : null, remarks: draft[s.id]?.remarks || '' })),
      });
      toast.success(`Saved ${res.saved} students for ${lesson?.name || 'this lesson'}${res.mode === 'period' ? '. Daily attendance updated.' : ''}`);
      setRoster(await attendanceRegister.roster(classId, date, sectionId));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto text-slate-800">
      <div>
        <h1 className="text-xl font-bold">Lesson attendance</h1>
        <p className="text-sm text-slate-500">Take attendance for each lesson. Families are told about unexcused absences and tardies automatically.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-end bg-white rounded-xl border border-slate-200 p-4">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="la-class">Class</label>
          <select id="la-class" className={input} value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
            <option value="">Choose…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="la-sec">Section</label>
          <select id="la-sec" className={input} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">All</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="la-date">Date</label>
          <input id="la-date" type="date" className={input} value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></div>
        {roster && <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-slate-100">Mode: {roster.mode === 'period' ? 'each lesson sets the daily code' : 'daily register (lessons are extra detail)'}</span>}
      </div>

      {loading && <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>}
      {!loading && roster && !roster.school_day && <p className="text-sm text-amber-700">This date is not a school day.</p>}
      {!loading && roster && roster.periods.length === 0 && <p className="text-sm text-slate-500">No lessons are set up for this class. Add periods in Timetable first.</p>}

      {!loading && roster && roster.periods.length > 0 && (
        <>
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {roster.periods.map((p) => {
              const done = roster.students.some((s) => s.marks[p.period_number]);
              return (
                <button key={p.period_number} role="tab" aria-selected={period === p.period_number} onClick={() => setPeriod(p.period_number)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-sm font-semibold border ${period === p.period_number ? 'bg-brand text-white border-transparent' : 'bg-white border-slate-200'}`}>
                  {p.name}{p.subject ? ` · ${p.subject}` : ''}{p.start ? ` · ${p.start}` : ''} {done && <CheckCheck className="inline w-3.5 h-3.5 ml-1" />}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
              <p className="text-sm">{BUTTONS.map((b) => `${counts[b.value] || 0} ${b.label.toLowerCase()}`).join(' · ')}</p>
              <div className="flex gap-2">
                <button onClick={() => setDraft((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { ...v, status: 'present' as LessonStatus }])))} className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-semibold">All present</button>
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save lesson'}</button>
              </div>
            </div>
            <ul className="divide-y divide-slate-100">
              {roster.students.map((s) => {
                const d = draft[s.id] || { status: 'present', minutes_late: '', remarks: '' };
                const set = (patch: Partial<typeof d>) => setDraft((x) => ({ ...x, [s.id]: { ...d, ...patch } }));
                return (
                  <li key={s.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                    <span className="flex-1 min-w-[160px]"><span className="font-semibold">{s.full_name}</span><span className="block text-xs text-slate-500">{s.student_id}{s.daily ? ` · today: ${s.daily.code}` : ''}</span></span>
                    <span className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${s.full_name}`}>
                      {BUTTONS.map((b) => (
                        <button key={b.value} role="radio" aria-checked={d.status === b.value} onClick={() => set({ status: b.value })}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${d.status === b.value ? `${b.on} border-transparent` : 'bg-white border-slate-200 text-slate-600'}`}>{b.label}</button>
                      ))}
                    </span>
                    {d.status === 'late' && (
                      <input type="number" min={1} max={300} className={`${input} w-24`} placeholder="Min late" aria-label={`Minutes late for ${s.full_name}`} value={d.minutes_late} onChange={(e) => set({ minutes_late: e.target.value })} />
                    )}
                    <input className={`${input} w-48`} placeholder="Note" aria-label={`Note for ${s.full_name}`} value={d.remarks} onChange={(e) => set({ remarks: e.target.value })} />
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
