import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LifeBuoy, Loader2, Plus, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import support, { CATEGORIES, PRIORITIES, Ticket, when } from '@/services/support.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
export const STATUS_TONE: Record<string, string> = {
  open: 'bg-sky-100 text-sky-800', waiting_support: 'bg-amber-100 text-amber-800', waiting_school: 'bg-violet-100 text-violet-800',
  resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-600',
};
const errText = (e: any, f: string) => e?.response?.data?.error || f;

/** A school's support tickets (P15): list, new ticket, and the conversation with the support team. */
export default function TicketsPage() {
  const { id } = useParams();
  return id ? <TicketView id={id} /> : <TicketList />;
}

function NewTicket({ onDone }: { onDone: (t: Ticket) => void }) {
  const [f, setF] = useState({ subject: '', body: '', category: 'question', priority: 'normal' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { onDone(await support.openTicket({ ...f, page: document.referrer ? new URL(document.referrer).pathname : '' })); toast.success('Sent. We will email you when support replies.'); }
    catch (e2) { toast.error(errText(e2, 'Could not send.')); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className={`${card} p-4 space-y-3`} aria-labelledby="new-ticket">
      <h2 id="new-ticket" className="font-bold text-slate-800">Contact support</h2>
      <label className="block text-sm font-semibold text-slate-700">Subject
        <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={200} required className={`${input} mt-1`}
          placeholder="e.g. Report cards show the wrong term" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">What is it about?
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={`${input} mt-1`}>
            {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700">How urgent?
          <select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} className={`${input} mt-1`}>
            {PRIORITIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">What happened?
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={6} required className={`${input} mt-1`}
          placeholder="Which page were you on, what did you do, and what did you expect? The more detail, the faster we can help." /></label>
      <p className="text-xs text-slate-500">We reply first within 4 hours for urgent problems, 1 day for high, 2 days for normal and 5 days for low (working time).</p>
      <button disabled={busy || !f.subject.trim() || !f.body.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send</button>
    </form>
  );
}

function TicketList() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showNew, setShowNew] = useState(params.get('new') === '1');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<{ tickets: Ticket[]; can_open_tickets: boolean } | null>(null);
  useEffect(() => { support.tickets(status).then(setData).catch(() => toast.error('Could not load tickets.')); }, [status]);
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <Link to="/help" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={14} className="rtl:rotate-180" /> Help & support</Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><LifeBuoy /> Support tickets</h1>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Show" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All</option><option value="open">Not resolved</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
          {data?.can_open_tickets && !showNew && <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"><Plus size={14} /> New ticket</button>}
        </div>
      </div>
      {showNew && data?.can_open_tickets && <NewTicket onDone={(t) => navigate(`/help/tickets/${t.id}`)} />}
      {data && !data.can_open_tickets && <p className={`${card} p-4 text-sm text-slate-600`}>Please contact your school office; they can reach our support team for you.</p>}
      {!data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <ul className={`${card} divide-y divide-slate-100`}>
          {data.tickets.map((t) => (
            <li key={t.id}>
              <Link to={`/help/tickets/${t.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-slate-50">
                <span><span className="text-xs text-slate-500">#{t.number} · {t.category_label} · {t.created_by}</span>
                  <span className="block text-sm font-semibold text-slate-800">{t.subject}</span></span>
                <span className="text-end"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[t.status]}`}>{t.status_label}</span>
                  <span className="block text-xs text-slate-500">{when(t.updated_at)}</span></span>
              </Link>
            </li>
          ))}
          {!data.tickets.length && <li className="p-6 text-center text-sm text-slate-500">No tickets yet.</li>}
        </ul>
      )}
    </div>
  );
}

export function Conversation({ t }: { t: Ticket }) {
  return (
    <ol className="space-y-3">
      {(t.messages || []).map((m) => m.kind === 'event' ? (
        <li key={m.id} className="text-center text-xs text-slate-500">{m.body} · {m.author} · {when(m.at)}</li>
      ) : (
        <li key={m.id} className={`rounded-xl border p-3 ${m.kind === 'note' ? 'border-amber-300 bg-amber-50' : m.from_support ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <p className="mb-1 text-xs text-slate-500"><b className="text-slate-700">{m.author}</b>{m.kind === 'note' && ' · internal note'} · {when(m.at)}</p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
        </li>
      ))}
    </ol>
  );
}

function TicketView({ id }: { id: string }) {
  const [t, setT] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { support.ticket(id).then(setT).catch(() => toast.error('Could not load the ticket.')); }, [id]);
  if (!t) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  const act = async (d: Record<string, unknown>, ok?: string) => {
    setBusy(true);
    try { setT(await support.act(id, d)); if (ok) toast.success(ok); setReply(''); } catch (e) { toast.error(errText(e, 'Could not do that.')); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <Link to="/help/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"><ArrowLeft size={14} className="rtl:rotate-180" /> Support tickets</Link>
      <div className={`${card} p-4`}>
        <p className="text-xs text-slate-500">#{t.number} · {t.category_label} · {t.priority_label} · opened {when(t.created_at)} by {t.created_by}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-slate-900">{t.subject}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[t.status]}`}>{t.status_label}</span>
        </div>
      </div>
      <Conversation t={t} />
      {t.status === 'closed' ? <p className={`${card} p-4 text-sm text-slate-600`}>This ticket is closed. For something new, please open another ticket.</p> : (
        <div className={`${card} p-4 space-y-2`}>
          <label htmlFor="reply" className="text-sm font-semibold text-slate-700">Reply</label>
          <textarea id="reply" value={reply} onChange={(e) => setReply(e.target.value)} rows={4} className={input} />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !reply.trim()} onClick={() => act({ body: reply }, 'Sent.')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Send size={14} /> Send</button>
            {t.status === 'resolved'
              ? <button disabled={busy} onClick={() => act({ action: 'reopen' }, 'Opened again.')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"><RotateCcw size={14} /> Not sorted after all</button>
              : <button disabled={busy} onClick={() => act({ action: 'resolve' }, 'Marked as sorted. Thank you!')} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={14} /> It's sorted</button>}
          </div>
        </div>
      )}
    </div>
  );
}
