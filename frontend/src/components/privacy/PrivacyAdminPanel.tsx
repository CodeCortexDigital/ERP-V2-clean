import { useEffect, useState } from 'react';
import { AlertOctagon, Download, FileText, Loader2, Megaphone, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import privacy, { ConsentTypeRow, errorText, LegalDoc, PrivacyReq } from '@/services/privacy.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' } as any);
const TONE: Record<string, string> = { open: 'bg-sky-100 text-sky-800', in_progress: 'bg-amber-100 text-amber-800', done: 'bg-emerald-100 text-emerald-700', refused: 'bg-slate-200 text-slate-700' };

/** Security & privacy → Privacy (admins): the school's privacy notice, consent questions and answers, privacy requests,
 *  and reporting a security or privacy problem. */
export default function PrivacyAdminPanel() {
  return (
    <div className="space-y-4">
      <Requests />
      <ConsentSection />
      <Documents />
      <ReportProblem />
    </div>
  );
}

function Documents() {
  const [data, setData] = useState<{ documents: LegalDoc[]; template: { title: string; body: string }; history: LegalDoc[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', summary: '' });
  const load = () => privacy.documents().then(setData).catch(() => undefined);
  useEffect(() => { load(); }, []);
  if (!data) return null;
  const school = data.documents.find((d) => d.kind === 'school_privacy');
  const start = () => { setForm({ title: school?.title || data.template.title, body: school?.body || data.template.body, summary: '' }); setEditing(true); };
  const publish = async () => {
    try { await privacy.publishNotice(form.title, form.body, form.summary); toast.success('Published. Everyone will be asked to read it when they next sign in.'); setEditing(false); load(); }
    catch (e) { toast.error(errorText(e, 'Could not publish.')); }
  };
  return (
    <section className={`${card} p-5`} aria-labelledby="docs-title">
      <h2 id="docs-title" className="flex items-center gap-2 font-bold text-slate-800"><FileText size={16} /> Privacy notice and terms</h2>
      <ul className="mt-2 divide-y divide-slate-100 text-sm">
        {data.documents.map((d) => (
          <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span><span className="font-semibold">{d.title}</span> <span className="text-slate-500">· {d.school ? 'this school' : 'the platform'} · version {d.version}</span></span>
            <span className="text-slate-600">{d.accepted} of {d.people} people have accepted</span>
          </li>
        ))}
        {!school && <li className="py-2 text-slate-600">The school has not published its own privacy notice yet.</li>}
      </ul>
      {editing ? (
        <div className="space-y-2 mt-3">
          <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
          <textarea className={`${input} font-mono text-xs`} rows={12} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} aria-label="Notice text" />
          <input className={input} placeholder="What changed (shown to people when they accept)" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <div className="flex justify-end gap-2"><button onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            <button onClick={publish} className="auth-primary-btn w-auto px-5">Publish new version</button></div>
        </div>
      ) : <button onClick={start} className="mt-3 text-sm font-semibold text-blue-600">{school ? 'Update the school privacy notice' : 'Write the school privacy notice (from a template)'}</button>}
    </section>
  );
}

function ConsentSection() {
  const [types, setTypes] = useState<ConsentTypeRow[]>([]);
  const [type, setType] = useState('');
  const [report, setReport] = useState<any>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: '', description: '', subject: 'student' });
  useEffect(() => { privacy.consentTypes().then((t) => { setTypes(t); if (t[0]) setType(t[0].id); }).catch(() => undefined); }, []);
  useEffect(() => { if (type) privacy.consentReport(type).then(setReport).catch(() => undefined); }, [type]);
  const add = async () => {
    try { const t = await privacy.saveConsentType(draft as any); setTypes(t); setAdding(false); setDraft({ label: '', description: '', subject: 'student' }); toast.success('Added. Families will see it under Privacy & consent.'); }
    catch (e) { toast.error(errorText(e, 'Could not add.')); }
  };
  return (
    <section className={`${card} p-5`} aria-labelledby="consent-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="consent-title" className="flex items-center gap-2 font-bold text-slate-800"><Users size={16} /> Consent</h2>
        <div className="flex gap-2">
          <select className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value)} aria-label="Consent">
            {types.filter((t) => t.is_active).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button onClick={() => privacy.consentCsv(type)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"><Download size={13} /> CSV</button>
          <button onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"><Plus size={13} /> New question</button>
        </div>
      </div>
      {adding && (
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          <input className={input} placeholder="Name, e.g. School trips" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <select className={input} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}><option value="student">Asked for each child</option><option value="user">Asked of each person</option></select>
          <button onClick={add} className="auth-primary-btn">Add</button>
          <textarea className={`${input} sm:col-span-3`} rows={2} placeholder="What the family agrees to, in plain words" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
      )}
      {report && (
        <>
          <p className="text-sm text-slate-600 mt-3"><strong className="text-emerald-700">{report.summary.yes} yes</strong> · <strong>{report.summary.no} no</strong> · {report.summary.not_answered} not answered</p>
          <div className="overflow-x-auto max-h-80 mt-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white"><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="py-2">Name</th><th className="py-2">{report.type.subject === 'student' ? 'Class' : 'Role'}</th><th className="py-2">Answer</th><th className="py-2">When / by</th></tr></thead>
              <tbody>{report.rows.map((r: any, i: number) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-1.5">{r.name}</td><td className="py-1.5 text-slate-600">{r.class}</td>
                  <td className="py-1.5">{r.answer === null ? <span className="text-slate-400">Not answered</span> : r.answer ? <span className="text-emerald-700 font-semibold">Yes</span> : <span className="font-semibold">No</span>}{r.outdated && <span className="block text-[11px] text-amber-700">Wording changed since</span>}</td>
                  <td className="py-1.5 text-xs text-slate-500">{r.when ? `${day(r.when)} · ${r.by}` : ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Requests() {
  const [rows, setRows] = useState<PrivacyReq[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});
  const load = () => privacy.requests().then((d) => { setRows(d.results); setStatuses(d.statuses); }).catch(() => setRows([]));
  useEffect(() => { load(); }, []);
  const update = async (r: PrivacyReq, status: string) => {
    try { await privacy.updateRequest(r.id, { status, response: replies[r.id] ?? r.response }); toast.success('Saved. The requester can see the reply under Privacy & consent.'); load(); }
    catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  const open = (rows || []).filter((r) => r.status === 'open' || r.status === 'in_progress');
  return (
    <section className={`${card} p-5`} aria-labelledby="req-title">
      <h2 id="req-title" className="flex items-center gap-2 font-bold text-slate-800"><Megaphone size={16} /> Privacy requests {open.length > 0 && <span className="rounded-full bg-sky-100 px-2 text-xs text-sky-800">{open.length} open</span>}</h2>
      <p className="text-xs text-slate-500">People's requests to see, correct, limit, erase or object to the use of their data. Reply within one month.</p>
      {rows === null ? <Loader2 className="animate-spin text-slate-400 mt-3" /> : rows.length === 0 ? <p className="text-sm text-slate-500 mt-3">No requests yet.</p> : (
        <ul className="divide-y divide-slate-100 mt-2">
          {rows.map((r) => (
            <li key={r.id} className="py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-slate-800">{r.kind_label}{r.student ? ` · ${r.student}` : ''} <span className="font-normal text-slate-500">from {r.requester}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.overdue ? 'bg-rose-100 text-rose-700' : TONE[r.status]}`}>{r.overdue ? `Overdue (due ${day(r.due_date)})` : `${r.status_label} · due ${day(r.due_date)}`}</span>
              </div>
              <p className="text-slate-600 mt-1">{r.details}</p>
              {(r.status === 'open' || r.status === 'in_progress') ? (
                <div className="mt-2 space-y-2">
                  <textarea className={input} rows={2} placeholder="Reply to the requester (required if you refuse)" value={replies[r.id] ?? r.response} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} />
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statuses).filter(([k]) => k !== r.status && k !== 'open').map(([k, v]) => (
                      <button key={k} onClick={() => update(r, k)} className={`rounded-lg border px-3 py-1 text-xs font-semibold ${k === 'done' ? 'border-emerald-300 text-emerald-700' : k === 'refused' ? 'border-rose-300 text-rose-700' : 'border-slate-300 text-slate-700'}`}>{v}</button>
                    ))}
                  </div>
                </div>
              ) : r.response && <p className="mt-1 text-xs text-slate-500">Reply: {r.response} ({r.handled_by})</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReportProblem() {
  const [form, setForm] = useState({ title: '', description: '' });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { toast.success((await privacy.reportIncident(form.title, form.description)).message); setForm({ title: '', description: '' }); }
    catch (e) { toast.error(errorText(e, 'Could not send.')); } finally { setBusy(false); }
  };
  return (
    <section className={`${card} p-5 space-y-2`} aria-labelledby="report-title">
      <h2 id="report-title" className="flex items-center gap-2 font-bold text-slate-800"><AlertOctagon size={16} /> Report a security or privacy problem</h2>
      <p className="text-xs text-slate-500">For example a lost device with school data, an email sent to the wrong family, or a sign-in you don't recognise. Report it straight away: some problems must be reported to the authorities within 72 hours.</p>
      <input className={input} placeholder="What happened, in a few words" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
      <textarea className={input} rows={3} placeholder="When it happened, what data may be involved, who knows about it" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Description" />
      <div className="flex justify-end"><button onClick={send} disabled={busy || !form.title || form.description.length < 10} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy && <Loader2 className="inline w-4 h-4 animate-spin" />} Report</button></div>
    </section>
  );
}
