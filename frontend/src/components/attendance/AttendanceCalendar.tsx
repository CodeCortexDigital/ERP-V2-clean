import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import attendanceRegister, {
  REASONS, codeStyle, type CalendarDay, type DailyStatus, type StudentCalendar,
} from '@/services/attendanceRegister.service';
import { Modal } from '@/components/ui/Modal';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LEGEND: Array<[string, boolean, string]> = [
  ['present', false, 'Present'], ['late', false, 'Tardy'], ['late', true, 'Tardy (excused)'], ['absent', false, 'Absent'],
  ['absent', true, 'Absent (excused)'], ['early_dismissal', false, 'Early dismissal'],
];

/** Month-by-month attendance history for one student, with codes, lessons, reports and alerts. */
export default function AttendanceCalendar({ studentId }: { studentId: string }) {
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [data, setData] = useState<StudentCalendar | null>(null);
  const [edit, setEdit] = useState<CalendarDay | null>(null);
  const [form, setForm] = useState({ status: 'absent' as DailyStatus, is_excused: false, reason: '', minutes_late: '', remarks: '' });

  const load = useCallback(() => attendanceRegister.calendar(studentId, ym.y, ym.m).then(setData).catch(() => toast.error('Could not load attendance.')), [studentId, ym]);
  useEffect(() => { load(); }, [load]);

  const move = (delta: number) => setYm(({ y, m }) => {
    const d = new Date(y, m - 1 + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });

  const open = (d: CalendarDay) => {
    if (!data?.can_edit || !d.school_day) return;
    setEdit(d);
    setForm({ status: (d.status && d.status !== 'excused' ? d.status : d.status === 'excused' ? 'absent' : 'absent') as DailyStatus,
      is_excused: d.is_excused, reason: d.reason, minutes_late: d.minutes_late ? String(d.minutes_late) : '', remarks: d.remarks });
  };

  const save = async () => {
    if (!edit) return;
    try {
      await attendanceRegister.setDay(studentId, edit.date, { ...form, minutes_late: form.minutes_late ? Number(form.minutes_late) : null });
      toast.success('Attendance updated');
      setEdit(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not update attendance.');
    }
  };

  if (!data) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;

  const first = new Date(`${data.days[0].date}T00:00:00`);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const s = data.year_summary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {([['Attendance (year)', s.rate == null ? '—' : `${s.rate}%`], ['Present', s.present], ['Absent, excused', s.absent_excused],
          ['Absent, unexcused', s.absent_unexcused], ['Tardy', s.tardy], ['Early dismissal', s.early_dismissal]] as const).map(([k, v]) => (
          <div key={k} className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">{k}</p><p className="text-xl font-bold">{v}</p></div>
        ))}
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => move(-1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
          <p className="font-bold">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          <button onClick={() => move(1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEKDAYS.map((w) => <div key={w} className="font-semibold text-slate-500 py-1">{w}</div>)}
          {Array.from({ length: lead }).map((_, i) => <div key={`pad-${i}`} />)}
          {data.days.map((d) => {
            const st = codeStyle(d.status, d.is_excused);
            const clickable = data.can_edit && d.school_day;
            return (
              <button key={d.date} onClick={() => open(d)} disabled={!clickable} title={[d.code, d.reason_label, d.minutes_late ? `${d.minutes_late} min late` : '', d.remarks].filter(Boolean).join(' · ') || undefined}
                className={`h-14 rounded-lg border text-left px-1.5 py-1 ${d.school_day ? 'border-slate-200' : 'border-transparent bg-slate-50'} ${clickable ? 'hover:border-[color:var(--app-accent)]' : 'cursor-default'}`}>
                <span className="block text-[11px] text-slate-500">{Number(d.date.slice(8))}</span>
                {st.short && <span className={`inline-block mt-0.5 px-1.5 rounded text-[11px] font-bold ${st.tone}`}>{st.short}</span>}
                {d.lessons.length > 0 && <span className="block text-[10px] text-slate-400">{d.lessons.length} lessons</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {LEGEND.map(([status, ex, label]) => { const st = codeStyle(status, ex); return <span key={label} className={`px-2 py-0.5 rounded ${st.tone}`}><b>{st.short}</b> {label}</span>; })}
        </div>
        {data.can_edit && <p className="mt-2 text-xs text-slate-500">Click a school day to change its code, excuse it or add a reason.</p>}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-2">Absence reports from the family</h3>
          {data.reports.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <ul className="space-y-2 text-sm">{data.reports.map((r) => (
              <li key={r.id}>{new Date(r.start_date).toLocaleDateString()}{r.end_date !== r.start_date ? ` – ${new Date(r.end_date).toLocaleDateString()}` : ''}: {r.kind_label}, {r.reason_label} <span className="text-xs font-semibold">({r.status_label})</span></li>
            ))}</ul>
          )}
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-sm mb-2">Alerts sent to the family</h3>
          {data.notices.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <ul className="space-y-2 text-sm">{data.notices.map((n, i) => (
              <li key={i}><span className="font-semibold">{n.kind}</span> · {new Date(n.date).toLocaleDateString()}<span className="block text-xs text-slate-500">{n.sent_to.length ? `Sent to ${n.sent_to.map((x) => x.replace('app:', 'app: ')).join(', ')}` : 'No contact details on file'}</span></li>
            ))}</ul>
          )}
        </section>
      </div>

      {edit && (
        <Modal open onClose={() => setEdit(null)} title={`Attendance on ${new Date(`${edit.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`} size="md"
          footer={<div className="flex justify-end gap-2"><button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button><button onClick={save} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Save</button></div>}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {([['present', 'Present'], ['late', 'Tardy'], ['absent', 'Absent'], ['early_dismissal', 'Early dismissal']] as Array<[DailyStatus, string]>).map(([v, l]) => (
                <label key={v} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${form.status === v ? 'border-[color:var(--app-accent)] bg-brand-soft' : 'border-slate-200'}`}>
                  <input type="radio" name="code" checked={form.status === v} onChange={() => setForm({ ...form, status: v })} /> {l}
                </label>
              ))}
            </div>
            {(form.status === 'absent' || form.status === 'late') && (
              <label className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4" checked={form.is_excused} onChange={(e) => setForm({ ...form, is_excused: e.target.checked })} /> Excused</label>
            )}
            {form.status === 'late' && (
              <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cal-min">Minutes late</label><input id="cal-min" type="number" min={1} className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.minutes_late} onChange={(e) => setForm({ ...form, minutes_late: e.target.value })} /></div>
            )}
            {form.status !== 'present' && (
              <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cal-reason">Reason</label>
                <select id="cal-reason" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                  <option value="">Choose…</option>{REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select></div>
            )}
            <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cal-note">Note</label><input id="cal-note" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
            {!form.is_excused && (form.status === 'absent' || form.status === 'late') && <p className="text-xs text-slate-500">The family will be told automatically if alerts are on.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
