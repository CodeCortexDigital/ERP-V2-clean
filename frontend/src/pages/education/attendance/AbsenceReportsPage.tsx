import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Check, Loader2, X } from 'lucide-react';
import attendanceRegister, { type AbsenceReport, type AttendanceSettings } from '@/services/attendanceRegister.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const fmt = (d: string) => new Date(d).toLocaleDateString();

/** Office: review absence reports from parents, and set attendance codes and family alerts. */
export default function AbsenceReportsPage() {
  const [filter, setFilter] = useState<'pending' | ''>('pending');
  const [rows, setRows] = useState<AbsenceReport[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [cfg, setCfg] = useState<AttendanceSettings | null>(null);

  const load = useCallback(() => attendanceRegister.reports(filter).then(setRows).catch(() => setRows([])), [filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { attendanceRegister.settings().then(setCfg).catch(() => undefined); }, []);

  const review = async (r: AbsenceReport, decision: 'approve' | 'decline') => {
    try {
      await attendanceRegister.review(r.id, decision, notes[r.id] || '');
      toast.success(decision === 'approve' ? 'Absence excused' : 'Report declined');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not review the report.');
    }
  };

  const saveCfg = async (patch: Partial<AttendanceSettings>) => {
    if (!cfg) return;
    const next = { ...cfg, ...patch };
    setCfg(next);
    try {
      setCfg(await attendanceRegister.saveSettings(next));
      toast.success('Attendance settings saved');
    } catch {
      toast.error('Could not save the settings.');
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto text-slate-800">
      <div>
        <h1 className="text-xl font-bold">Absence reports</h1>
        <p className="text-sm text-slate-500">Parents report absences from the parent portal. Approving one marks those days as excused.</p>
      </div>

      <div className="flex gap-2">
        {([['pending', 'Waiting for review'], ['', 'All reports']] as const).map(([v, l]) => (
          <button key={l} onClick={() => setFilter(v)} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${filter === v ? 'bg-brand text-white' : 'bg-white border border-slate-200'}`}>{l}</button>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        {!rows ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
          : rows.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">{filter ? 'Nothing waiting for review.' : 'No absence reports yet.'}</p> : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="p-4 flex flex-wrap gap-3 items-start">
                  <div className="flex-1 min-w-[240px] text-sm">
                    <p><Link to={`/education/students/${r.student_id}?tab=attendance`} className="font-bold text-brand hover:underline">{r.student}</Link> <span className="text-slate-500">{r.class_name}</span></p>
                    <p>{r.kind_label}: {fmt(r.start_date)}{r.end_date !== r.start_date ? ` to ${fmt(r.end_date)}` : ''} · <strong>{r.reason_label}</strong></p>
                    {r.note && <p className="text-slate-600">"{r.note}"</p>}
                    <p className="text-xs text-slate-500">From {r.submitted_by} on {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  {r.status === 'pending' ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-56" placeholder="Note to the family (optional)" value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} aria-label="Note to the family" />
                      <button onClick={() => review(r, 'approve')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold"><Check className="w-4 h-4" /> Excuse</button>
                      <button onClick={() => review(r, 'decline')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 text-sm font-semibold"><X className="w-4 h-4" /> Decline</button>
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{r.status_label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>

      {cfg && (
        <section className={`${card} p-5 space-y-4`}>
          <h2 className="font-bold inline-flex items-center gap-2"><Bell className="w-4 h-4" /> Attendance settings and family alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <fieldset className="space-y-2">
              <legend className="font-semibold mb-1">How attendance is taken</legend>
              <label className="flex items-start gap-2"><input type="radio" name="mode" checked={cfg.mode === 'daily'} onChange={() => saveCfg({ mode: 'daily' })} className="mt-1" />
                <span>Once a day (homeroom register). Lesson attendance is extra detail.</span></label>
              <label className="flex items-start gap-2"><input type="radio" name="mode" checked={cfg.mode === 'period'} onChange={() => saveCfg({ mode: 'period' })} className="mt-1" />
                <span>Every lesson. The daily code is worked out from the lessons: absent all day, tardy, or early dismissal.</span></label>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="font-semibold mb-1">Tell families automatically</legend>
              {([['alert_absent', 'When a student is absent without an excuse'], ['alert_tardy', 'When a student arrives late without an excuse'],
                ['alert_email', 'By email'], ['alert_in_app', 'In the parent portal']] as const).map(([k, l]) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={Boolean(cfg[k])} onChange={(e) => saveCfg({ [k]: e.target.checked })} /> {l}</label>
              ))}
              <label className="flex items-center gap-2">Warn after
                <input type="number" min={0} max={30} className="w-16 rounded border border-slate-300 px-2 py-1" value={cfg.chronic_threshold}
                  onChange={(e) => setCfg({ ...cfg, chronic_threshold: Number(e.target.value) })} onBlur={() => saveCfg({ chronic_threshold: cfg.chronic_threshold })} aria-label="Absence warning threshold" />
                unexcused absences in 30 days (0 = off)</label>
            </fieldset>
          </div>
          <p className="text-xs text-slate-500">Alerts go to guardians marked "Receives school messages" and to linked parent accounts. Each alert is sent once.</p>
        </section>
      )}
    </div>
  );
}
