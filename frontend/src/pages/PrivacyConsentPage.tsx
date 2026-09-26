import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, FileText, Loader2, Send, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import privacy, { ConsentItem, errorText, PrivacyReq } from '@/services/privacy.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' } as any);
const STATUS_TONE: Record<string, string> = { open: 'bg-sky-100 text-sky-800', in_progress: 'bg-amber-100 text-amber-800', done: 'bg-emerald-100 text-emerald-700', refused: 'bg-slate-200 text-slate-700' };

function Consent({ item, onAnswer, busy }: { item: ConsentItem; onAnswer: (granted: boolean) => void; busy: boolean }) {
  const cur = item.current;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="font-semibold text-slate-800">{item.label}</p>
          <p className="text-sm text-slate-600">{item.description}</p>
          <p className="text-xs text-slate-500 mt-1">{cur ? `${cur.granted ? 'Yes' : 'No'}, since ${day(cur.when)}${cur.by ? ` (${cur.by})` : ''}` : 'Not answered yet'}
            {cur?.outdated && <span className="text-amber-700"> · The wording has changed since; please answer again.</span>}</p>
        </div>
        <div className="flex gap-2" role="group" aria-label={item.label}>
          <button disabled={busy} onClick={() => onAnswer(true)} aria-pressed={cur?.granted === true}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold ${cur?.granted === true ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 text-slate-700'}`}><Check size={14} /> Yes</button>
          <button disabled={busy} onClick={() => onAnswer(false)} aria-pressed={cur?.granted === false}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold ${cur?.granted === false ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-300 text-slate-700'}`}><X size={14} /> No</button>
        </div>
      </div>
      {item.history.length > 1 && (
        <details className="mt-1"><summary className="cursor-pointer text-xs text-slate-500">History</summary>
          <ul className="text-xs text-slate-500 mt-1">{item.history.map((h, i) => <li key={i}>{day(h.when)}: {h.granted ? 'Yes' : 'No'}{h.by ? ` (${h.by})` : ''}</li>)}</ul>
        </details>
      )}
    </li>
  );
}

/** Privacy & consent: answer the school's consent questions (per child), and ask to see, correct or erase data. */
export default function PrivacyConsentPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof privacy.me>> | null>(null);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({ kind: 'access', student: '', details: '' });
  const load = () => privacy.me().then(setData).catch(() => toast.error('Could not load.'));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

  const answer = async (item: ConsentItem, granted: boolean, student?: string) => {
    setBusy(item.type_id + (student || ''));
    try { await privacy.consent(item.type_id, granted, student); toast.success('Saved. You can change this at any time.'); await load(); }
    catch (e) { toast.error(errorText(e, 'Could not save.')); } finally { setBusy(''); }
  };
  const send = async () => {
    setBusy('request');
    try { toast.success((await privacy.request(form.kind, form.details, form.student || undefined)).message); setForm({ kind: 'access', student: '', details: '' }); load(); }
    catch (e) { toast.error(errorText(e, 'Could not send.')); } finally { setBusy(''); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-800"><ShieldCheck className="w-5 h-5 text-brand" /> Privacy & consent</h1>
        <p className="text-sm text-slate-600">Your choices about how the school uses information, and your rights over it.
          {data.school_notice && <> Read the <Link to={`/legal/school/${data.school_code}`} className="text-blue-600 font-semibold">school's privacy notice</Link>.</>}</p>
      </div>

      {data.children.map((c) => (
        <section key={c.id} className={`${card} p-5`} aria-labelledby={`child-${c.id}`}>
          <h2 id={`child-${c.id}`} className="font-bold text-slate-800">{c.name}</h2>
          <ul className="divide-y divide-slate-100">{c.consents.map((item) => <Consent key={item.type_id} item={item} busy={!!busy} onAnswer={(g) => answer(item, g, c.id)} />)}</ul>
        </section>
      ))}
      {data.mine.length > 0 && (
        <section className={`${card} p-5`} aria-labelledby="mine-title">
          <h2 id="mine-title" className="font-bold text-slate-800">About you</h2>
          <ul className="divide-y divide-slate-100">{data.mine.map((item) => <Consent key={item.type_id} item={item} busy={!!busy} onAnswer={(g) => answer(item, g)} />)}</ul>
        </section>
      )}

      <section className={`${card} p-5 space-y-3`} aria-labelledby="request-title">
        <h2 id="request-title" className="flex items-center gap-2 font-bold text-slate-800"><FileText size={16} /> Ask the school about your data</h2>
        <p className="text-sm text-slate-600">You can ask to see a copy of the data the school holds, to correct it, to limit or object to how it is used, or to erase it. The school replies within one month. To download your own account data straight away, use Account settings.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">I would like to
            <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {Object.entries(data.kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          {data.children.length > 0 && (
            <label className="text-xs font-semibold text-slate-600">About
              <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
                <option value="">Me</option>{data.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
          )}
        </div>
        <label className="block text-xs font-semibold text-slate-600">Details
          <textarea className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="What should the school look at?" />
        </label>
        <div className="flex justify-end"><button onClick={send} disabled={!!busy || form.details.trim().length < 5} className="auth-primary-btn w-auto px-5 disabled:opacity-50">{busy === 'request' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send request</button></div>
        {data.requests.length > 0 && (
          <ul className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {data.requests.map((r: PrivacyReq) => (
              <li key={r.id} className="py-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-slate-800">{r.kind_label}{r.student ? ` · ${r.student}` : ''}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[r.status]}`}>{r.status_label}</span></div>
                <p className="text-slate-600">{r.details}</p>
                <p className="text-xs text-slate-500">Sent {day(r.created_at)} · reply due by {day(r.due_date)}</p>
                {r.response && <p className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700">School's reply: {r.response}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
