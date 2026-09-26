import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlarmClock, BookOpen, LifeBuoy, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import support, { Article, PRIORITIES, STATUSES, Ticket, when } from '@/services/support.service';
import { Conversation, STATUS_TONE } from '@/pages/help/TicketsPage';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm';
const errText = (e: any, f: string) => e?.response?.data?.error || f;
const ROLES = ['admin', 'teacher', 'staff', 'parent', 'student'];
const MODULES = [['getting-started', 'Getting started'], ['students', 'Students and admissions'], ['attendance', 'Attendance'],
  ['fees', 'Fees and payments'], ['exams', 'Exams and grades'], ['timetable', 'Timetable'], ['communication', 'Messages and announcements'],
  ['staff', 'Staff and payroll'], ['portal', 'Parent and student portal'], ['account', 'Your account and security'],
  ['settings', 'School settings and billing'], ['other', 'Other']];

/** Platform owner (P15): every school's support tickets with reply deadlines, and the help articles. */
export default function PlatformSupport() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState('open');
  const [list, setList] = useState<Ticket[] | null>(null);
  const [ov, setOv] = useState<Awaited<ReturnType<typeof support.overview>> | null>(null);
  const [openId, setOpenId] = useState<string | null>(params.get('ticket'));
  const [showArticles, setShowArticles] = useState(false);
  const load = () => {
    support.tickets(filter).then((d) => setList(d.tickets)).catch(() => undefined);
    support.overview().then(setOv).catch(() => undefined);
  };
  useEffect(load, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!list || !ov) return null;
  return (
    <section className={`${card} p-4 space-y-3`} aria-labelledby="support-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="support-title" className="flex items-center gap-2 font-bold text-slate-800"><LifeBuoy size={16} /> Support tickets
          <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-700">{ov.total} open · {ov.waiting} waiting for us</span>
          {ov.overdue > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 text-xs text-rose-700"><AlarmClock size={11} /> {ov.overdue} reply overdue</span>}
          {ov.urgent > 0 && <span className="rounded-full bg-rose-600 px-2 text-xs text-white">{ov.urgent} urgent</span>}</h2>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show" className={input}>
            <option value="open">Not resolved</option><option value="waiting_support">Waiting for us</option><option value="resolved">Resolved</option>
            <option value="closed">Closed</option><option value="">All</option>
          </select>
          <button onClick={() => setShowArticles((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"><BookOpen size={13} /> Help articles</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="py-1">Ticket</th><th>School</th><th>Priority</th><th>Status</th><th>Reply due</th><th>Assigned</th></tr></thead>
          <tbody>{list.map((t) => (
            <tr key={t.id} onClick={() => setOpenId(openId === t.id ? null : t.id)} className={`cursor-pointer border-b border-slate-50 ${openId === t.id ? 'bg-slate-50' : ''}`}>
              <td className="py-1.5"><span className="text-xs text-slate-500">#{t.number}</span> <span className="font-semibold">{t.subject}</span></td>
              <td className="text-xs">{t.school || '—'}<br /><span className="text-slate-500">{t.created_by_email}</span></td>
              <td className={`text-xs ${t.priority === 'urgent' ? 'font-bold text-rose-700' : ''}`}>{t.priority_label.split(':')[0]}</td>
              <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[t.status]}`}>{t.status_label}</span></td>
              <td className={`text-xs ${t.overdue ? 'font-bold text-rose-700' : 'text-slate-600'}`}>{t.first_reply_at ? 'Replied' : when(t.reply_due_at)}{t.overdue && ' (late)'}</td>
              <td className="text-xs">{t.assigned_to || '—'}</td>
            </tr>
          ))}{!list.length && <tr><td colSpan={6} className="py-5 text-center text-slate-500">No tickets here.</td></tr>}</tbody>
        </table>
      </div>
      {openId && <TicketPanel id={openId} ov={ov} onChange={load} />}
      {showArticles && <ArticlesManager />}
    </section>
  );
}

function TicketPanel({ id, ov, onChange }: { id: string; ov: NonNullable<Awaited<ReturnType<typeof support.overview>>>; onChange: () => void }) {
  const [t, setT] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setT(null); support.ticket(id).then(setT).catch(() => toast.error('Could not load the ticket.')); }, [id]);
  if (!t) return <Loader2 className="animate-spin text-slate-400" />;
  const manage = async (d: Record<string, unknown>) => {
    try { setT(await support.manage(id, d)); onChange(); } catch (e) { toast.error(errText(e, 'Could not update.')); }
  };
  const send = async () => {
    setBusy(true);
    try { setT(await support.act(id, { body: reply, internal })); setReply(''); onChange(); toast.success(internal ? 'Note added.' : 'Reply sent to the school.'); }
    catch (e) { toast.error(errText(e, 'Could not send.')); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <b>#{t.number}</b> <span className="text-slate-600">{t.category_label} · opened {when(t.created_at)}{t.page ? ` · page ${t.page}` : ''}</span>
        <select value={t.status} onChange={(e) => manage({ status: e.target.value })} aria-label="Status" className={input}>
          {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={t.priority} onChange={(e) => manage({ priority: e.target.value })} aria-label="Priority" className={input}>
          {PRIORITIES.map(([k, v]) => <option key={k} value={k}>{v.split(':')[0]}</option>)}</select>
        <select value={t.assigned_to_id || ''} onChange={(e) => manage({ assigned_to: e.target.value })} aria-label="Assigned to" className={input}>
          <option value="">Nobody</option>{ov.team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      </div>
      <Conversation t={t} />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value="" onChange={(e) => { const c = ov.canned.find((x) => x.id === e.target.value); if (c) setReply((r) => (r ? `${r}\n\n` : '') + c.body); }}
            aria-label="Saved reply" className={input}><option value="">Insert a saved reply…</option>{ov.canned.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (the school doesn't see it)</label>
        </div>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} aria-label="Reply" className={`${input} w-full`} />
        <button disabled={busy || !reply.trim()} onClick={send} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 ${internal ? 'bg-amber-600' : 'bg-blue-600'}`}>
          <Send size={13} /> {internal ? 'Add note' : 'Send reply'}</button>
      </div>
    </div>
  );
}

const blank: Partial<Article> = { title: '', summary: '', body: '', module: 'other', kind: 'guide', roles: [], video_url: '', published: true, order: 100 };

function ArticlesManager() {
  const [items, setItems] = useState<Article[] | null>(null);
  const [edit, setEdit] = useState<Partial<Article> | null>(null);
  const load = () => support.manageArticles().then(setItems).catch(() => toast.error('Could not load articles.'));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try { await support.saveArticle(edit!); toast.success('Saved.'); setEdit(null); load(); } catch (e) { toast.error(errText(e, 'Could not save.')); }
  };
  if (!items) return <Loader2 className="animate-spin text-slate-400" />;
  return (
    <div className="rounded-xl border border-slate-200 p-3 space-y-2">
      <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800">Help articles ({items.length})</h3>
        <button onClick={() => setEdit({ ...blank })} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white"><Plus size={12} /> New article</button></div>
      {edit && (
        <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm">
          <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Title" aria-label="Title" className={input} />
          <input value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} placeholder="One-line summary" aria-label="Summary" className={input} />
          <div className="flex flex-wrap gap-2">
            <select value={edit.module} onChange={(e) => setEdit({ ...edit, module: e.target.value })} aria-label="Topic" className={input}>{MODULES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Article['kind'] })} aria-label="Kind" className={input}>
              <option value="guide">Guide</option><option value="faq">Question and answer</option><option value="video">Video</option></select>
            <input value={edit.video_url} onChange={(e) => setEdit({ ...edit, video_url: e.target.value })} placeholder="Video address (optional)" aria-label="Video address" className={`${input} flex-1`} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-700">Who sees it (none ticked = everyone):
            {ROLES.map((r) => <label key={r} className="flex items-center gap-1"><input type="checkbox" checked={!!edit.roles?.includes(r)}
              onChange={(e) => setEdit({ ...edit, roles: e.target.checked ? [...(edit.roles || []), r] : (edit.roles || []).filter((x) => x !== r) })} /> {r}</label>)}
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} /> Published</label>
          </div>
          <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={8} aria-label="Text" className={`${input} font-mono text-xs`}
            placeholder={'Text. "## " starts a heading, "- " a bullet, "1. " a numbered step; a blank line starts a new paragraph.'} />
          <div className="flex gap-2"><button onClick={save} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white">Save</button>
            <button onClick={() => setEdit(null)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Cancel</button></div>
        </div>
      )}
      <table className="w-full text-sm"><tbody>{items.map((a) => (
        <tr key={a.id} className="border-b border-slate-50">
          <td className="py-1"><button onClick={() => setEdit(a)} className="text-left font-semibold text-blue-700 hover:underline">{a.title}</button>
            {!a.published && <span className="ms-1 rounded bg-slate-200 px-1 text-[10px]">hidden</span>}</td>
          <td className="text-xs text-slate-500">{a.module_label}</td>
          <td className="text-xs text-slate-500">{a.roles?.length ? a.roles.join(', ') : 'everyone'}</td>
          <td className="text-xs text-slate-500">👍 {a.helpful_yes} · 👎 {a.helpful_no}</td>
          <td><button aria-label={`Delete ${a.title}`} onClick={async () => { if (window.confirm(`Delete "${a.title}"?`)) { await support.deleteArticle(a.id); load(); } }}
            className="text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button></td>
        </tr>
      ))}</tbody></table>
    </div>
  );
}
