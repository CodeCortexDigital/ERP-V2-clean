import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CalendarX } from 'lucide-react';
import attendanceRegister, { REASONS, type AbsenceReport } from '@/services/attendanceRegister.service';
import api from '@/services/api';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

/** Parent portal: tell the school a child is (or will be) absent, late or leaving early. */
export default function ReportAbsenceCard() {
  const [kids, setKids] = useState<Array<{ id: string; full_name: string }>>([]);
  const [reports, setReports] = useState<AbsenceReport[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ student_id: '', start_date: today, end_date: today, kind: 'absent', reason: 'illness', note: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get('/students/', { params: { page_size: 20 } }).then((r) => {
      const rows = Array.isArray(r.data) ? r.data : r.data?.results || [];
      setKids(rows.map((s: any) => ({ id: s.id, full_name: s.full_name })));
      if (rows[0]) setForm((f) => ({ ...f, student_id: f.student_id || rows[0].id }));
    }).catch(() => setKids([]));
    attendanceRegister.reports().then(setReports).catch(() => setReports([]));
  }, []);

  if (!kids.length) return null;

  const send = async () => {
    if (form.end_date < form.start_date) return toast.error('The last day must be on or after the first day.');
    try {
      await attendanceRegister.report(form);
      toast.success('Thank you. The school has your report.');
      setOpen(false);
      setForm((f) => ({ ...f, note: '' }));
      setReports(await attendanceRegister.reports());
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not send the report.');
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold inline-flex items-center gap-2"><CalendarX className="w-4 h-4 text-brand" /> Report an absence</h2>
        {!open && <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Report</button>}
      </div>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {kids.length > 1 && (
            <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ra-kid">Child</label>
              <select id="ra-kid" className={input} value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>{kids.map((k) => <option key={k.id} value={k.id}>{k.full_name}</option>)}</select></div>
          )}
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ra-kind">What</label>
            <select id="ra-kind" className={input} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="absent">Absent all day</option><option value="late">Arriving late</option><option value="early_dismissal">Leaving early</option>
            </select></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ra-reason">Reason</label>
            <select id="ra-reason" className={input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>{REASONS.filter((r) => r.value !== 'unknown').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ra-from">First day</label><input id="ra-from" type="date" className={input} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: e.target.value > form.end_date ? e.target.value : form.end_date })} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ra-to">Last day</label><input id="ra-to" type="date" className={input} value={form.end_date} min={form.start_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ra-note">Note for the school (optional)</label><textarea id="ra-note" rows={2} className={input} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="sm:col-span-2 flex gap-2"><button onClick={send} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Send report</button><button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 font-semibold">Cancel</button></div>
        </div>
      )}
      {reports.length > 0 && (
        <ul className="text-sm divide-y divide-slate-100">
          {reports.slice(0, 5).map((r) => (
            <li key={r.id} className="py-2 flex justify-between gap-2">
              <span>{r.student}: {r.kind_label.toLowerCase()} {new Date(r.start_date).toLocaleDateString()}{r.end_date !== r.start_date ? ` – ${new Date(r.end_date).toLocaleDateString()}` : ''} ({r.reason_label})</span>
              <span className={`text-xs font-bold ${r.status === 'approved' ? 'text-emerald-700' : r.status === 'declined' ? 'text-rose-700' : 'text-slate-500'}`}>{r.status_label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
