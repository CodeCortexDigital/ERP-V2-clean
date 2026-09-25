import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Megaphone, Pin, Trash2 } from 'lucide-react';
import messaging, { type Announcement } from '@/services/messaging.service';
import classSectionService, { type ClassWithSections } from '@/services/classSection.service';
import { useAuth } from '@/contexts/AuthContext';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const AUDIENCES = [['everyone', 'Everyone'], ['parents', 'All parents'], ['staff', 'All staff'], ['students', 'All students'], ['class', 'Chosen classes'], ['grade', 'Grade levels']];

/** School announcements: staff post to a targeted audience (portal, email, SMS); everyone reads theirs. */
export default function AnnouncementsPage() {
  const { role } = useAuth();
  const staff = role === 'admin' || role === 'teacher';
  const [rows, setRows] = useState<Announcement[] | null>(null);
  const [classes, setClasses] = useState<ClassWithSections[]>([]);
  const [sms, setSms] = useState(false);
  const [f, setF] = useState({ title: '', body: '', audience: role === 'teacher' ? 'class' : 'everyone', class_ids: [] as string[], grade_levels: [] as number[],
    include_parents: true, include_students: false, send_email: true, send_sms: false, is_pinned: false, scheduled_for: '' });

  const load = useCallback(() => messaging.announcements().then(setRows).catch(() => setRows([])), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!staff) return;
    classSectionService.getClassesWithSections().then((r) => setClasses(r.data as ClassWithSections[]));
    if (role === 'admin') messaging.smsSettings().then((s) => setSms(s.ready)).catch(() => undefined);
  }, [staff, role]);

  const post = async () => {
    try {
      const a = await messaging.announce({ ...f, scheduled_for: f.scheduled_for ? new Date(f.scheduled_for).toISOString() : null });
      toast.success(a.sent_at ? `Sent to ${a.recipient_count} people (${a.email_count} emails${a.sms_count ? `, ${a.sms_count} texts` : ''})` : 'Scheduled');
      setF({ ...f, title: '', body: '', scheduled_for: '' });
      load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Could not post the announcement.'); }
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const grades = [...new Set(classes.map((c: any) => c.grade_level).filter((g: any) => g !== null && g !== undefined))].sort((a: any, b: any) => a - b) as number[];

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 text-slate-800">
      <h1 className="text-xl font-bold inline-flex items-center gap-2"><Megaphone className="w-5 h-5" /> Announcements</h1>
      {staff && (
        <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
          <input className={input} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Title" />
          <textarea className={input} rows={4} placeholder="Message" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} aria-label="Message" />
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.filter(([v]) => role === 'admin' || v === 'class').map(([v, l]) => (
              <button key={v} onClick={() => setF({ ...f, audience: v })} className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${f.audience === v ? 'bg-brand text-white border-transparent' : 'bg-white border-slate-200'}`}>{l}</button>
            ))}
          </div>
          {f.audience === 'class' && <div className="flex flex-wrap gap-2">{classes.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" checked={f.class_ids.includes(c.id)} onChange={() => setF({ ...f, class_ids: toggle(f.class_ids, c.id) })} />{c.name}</label>)}</div>}
          {f.audience === 'grade' && <div className="flex flex-wrap gap-2">{grades.map((g) => <label key={g} className="flex items-center gap-1.5"><input type="checkbox" checked={f.grade_levels.includes(g)} onChange={() => setF({ ...f, grade_levels: toggle(f.grade_levels, g) })} />{g === -1 ? 'Pre-K' : g === 0 ? 'K' : `Grade ${g}`}</label>)}</div>}
          {(f.audience === 'class' || f.audience === 'grade') && (
            <div className="flex gap-4"><label className="flex items-center gap-1.5"><input type="checkbox" checked={f.include_parents} onChange={(e) => setF({ ...f, include_parents: e.target.checked })} /> Parents</label>
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.include_students} onChange={(e) => setF({ ...f, include_students: e.target.checked })} /> Students</label></div>
          )}
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.send_email} onChange={(e) => setF({ ...f, send_email: e.target.checked })} /> Also email</label>
            {role === 'admin' && <label className={`flex items-center gap-1.5 ${sms ? '' : 'opacity-50'}`} title={sms ? '' : 'Set up SMS first'}><input type="checkbox" disabled={!sms} checked={f.send_sms} onChange={(e) => setF({ ...f, send_sms: e.target.checked })} /> Also text (SMS)</label>}
            {role === 'admin' && <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.is_pinned} onChange={(e) => setF({ ...f, is_pinned: e.target.checked })} /> Pin to the top</label>}
            <label className="flex items-center gap-1.5">Send later <input type="datetime-local" className="rounded border border-slate-300 px-2 py-1" value={f.scheduled_for} onChange={(e) => setF({ ...f, scheduled_for: e.target.value })} aria-label="Send later" /></label>
            <button onClick={post} className="ml-auto px-4 py-2 rounded-lg bg-brand text-white font-semibold">{f.scheduled_for ? 'Schedule' : 'Send now'}</button>
          </div>
        </section>
      )}
      {!rows ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : rows.length === 0 ? <p className="text-sm text-slate-500">No announcements yet.</p> : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className={`bg-white rounded-xl border p-4 ${a.read === false ? 'border-[color:var(--app-accent)]' : 'border-slate-200'}`}
              onMouseEnter={() => { if (a.read === false) { messaging.markRead(a.id); setRows((r) => (r || []).map((x) => (x.id === a.id ? { ...x, read: true } : x))); } }}>
              <div className="flex justify-between gap-2">
                <p className="font-bold inline-flex items-center gap-1.5">{a.is_pinned && <Pin className="w-3.5 h-3.5 text-brand" />}{a.title}</p>
                <span className="text-xs text-slate-500 shrink-0">{a.sent_at ? new Date(a.sent_at).toLocaleString() : `Scheduled ${a.scheduled_for ? new Date(a.scheduled_for).toLocaleString() : ''}`}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap mt-1">{a.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{a.author} · {a.audience_label}</span>
                {a.recipient_count !== undefined && a.sent_at && <span>Delivered to {a.recipient_count} · read by {a.read_count} · {a.email_count} emails{a.sms_count ? ` · ${a.sms_count} texts` : ''}</span>}
                {a.recipient_count !== undefined && <button onClick={async () => { await messaging.removeAnnouncement(a.id); load(); }} className="ml-auto inline-flex items-center gap-1 text-rose-600"><Trash2 className="w-3.5 h-3.5" /> Remove</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
