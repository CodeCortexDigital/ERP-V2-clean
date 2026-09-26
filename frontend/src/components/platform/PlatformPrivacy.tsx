import { useEffect, useState } from 'react';
import { AlertOctagon, Check, FileText, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import privacy, { errorText, IncidentRow, SubProcessorRow } from '@/services/privacy.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';
const when = (d: string | null) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any) : '');
const SEV: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-amber-100 text-amber-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-rose-100 text-rose-700' };

/** Platform owner: the platform's privacy notice and terms, sub-processors, and the incident register. */
export default function PlatformPrivacy() {
  return (<div className="space-y-4"><Incidents /><PlatformDocs /><SubProcessors /></div>);
}

function PlatformDocs() {
  const [data, setData] = useState<any>(null);
  const [edit, setEdit] = useState<{ kind: string; title: string; body: string; summary: string } | null>(null);
  const load = () => privacy.platformDocuments().then(setData).catch(() => undefined);
  useEffect(() => { load(); }, []);
  if (!data) return null;
  const publish = async () => {
    try { await privacy.publishPlatform(edit!.kind, edit!.title, edit!.body, edit!.summary); toast.success('Published. Everyone will be asked to accept it.'); setEdit(null); load(); }
    catch (e) { toast.error(errorText(e, 'Could not publish.')); }
  };
  return (
    <section className={`${card} p-4`} aria-labelledby="pdocs-title">
      <h2 id="pdocs-title" className="flex items-center gap-2 font-bold text-slate-800"><FileText size={16} /> Privacy notice and terms (the platform)</h2>
      <ul className="text-sm mt-2 divide-y divide-slate-100">
        {(['privacy', 'terms'] as const).map((k) => {
          const d = data[k];
          return (
            <li key={k} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{k === 'privacy' ? 'Privacy notice' : 'Terms of use'}: {d.current ? `version ${d.current.version}, ${d.accepted} acceptances` : <span className="text-amber-700">not published (the public page shows the template)</span>}</span>
              <button onClick={() => setEdit({ kind: k, title: d.current?.title || d.template.title, body: d.current?.body || d.template.body, summary: '' })} className="text-xs font-semibold text-blue-600">{d.current ? 'Publish a new version' : 'Review template and publish'}</button>
            </li>
          );
        })}
      </ul>
      {edit && (
        <div className="space-y-2 mt-2">
          <input className={`${input} w-full`} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} aria-label="Title" />
          <textarea className={`${input} w-full font-mono text-xs`} rows={12} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} aria-label="Text" />
          <input className={`${input} w-full`} placeholder="What changed" value={edit.summary} onChange={(e) => setEdit({ ...edit, summary: e.target.value })} />
          <div className="flex justify-end gap-2"><button onClick={() => setEdit(null)} className="rounded-lg border px-3 py-1 text-sm">Cancel</button><button onClick={publish} className="rounded-lg bg-slate-800 px-3 py-1 text-sm font-semibold text-white">Publish</button></div>
        </div>
      )}
    </section>
  );
}

function SubProcessors() {
  const [rows, setRows] = useState<SubProcessorRow[]>([]);
  const blank = { name: '', purpose: '', data: '', location: '', optional: false, website: '' };
  const [draft, setDraft] = useState<SubProcessorRow>(blank);
  useEffect(() => { privacy.subprocessors().then(setRows).catch(() => undefined); }, []);
  const save = async (p: SubProcessorRow) => { try { setRows(await privacy.saveSubprocessor(p)); toast.success('Saved.'); if (!p.id) setDraft(blank); } catch (e) { toast.error(errorText(e, 'Could not save.')); } };
  return (
    <section className={`${card} p-4`} aria-labelledby="subs-title2">
      <h2 id="subs-title2" className="font-bold text-slate-800">Sub-processors <a href="/legal/subprocessors" target="_blank" className="ms-2 text-xs font-normal text-blue-600">public page</a></h2>
      <table className="w-full text-sm mt-2">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="py-1">Company</th><th className="py-1">Purpose</th><th className="py-1">Location</th><th /></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id} className="border-b border-slate-50">
            <td className="py-1.5 font-semibold">{p.name}{p.optional && <span className="ms-1 text-[11px] font-normal text-slate-500">optional</span>}</td>
            <td className="py-1.5 text-slate-600">{p.purpose}</td>
            <td className="py-1.5"><input className={`${input} w-32`} defaultValue={p.location} placeholder="e.g. EU (Frankfurt)" onBlur={(e) => e.target.value !== p.location && save({ ...p, location: e.target.value })} aria-label={`${p.name} location`} /></td>
            <td className="py-1.5 text-right"><button onClick={async () => setRows(await privacy.deleteSubprocessor(p.id!))} aria-label={`Remove ${p.name}`} className="text-rose-600"><Trash2 size={14} /></button></td>
          </tr>
        ))}</tbody>
      </table>
      <div className="flex flex-wrap gap-2 mt-2">
        <input className={input} placeholder="Company" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className={`${input} flex-1`} placeholder="What for" value={draft.purpose} onChange={(e) => setDraft({ ...draft, purpose: e.target.value })} />
        <input className={input} placeholder="Data" value={draft.data} onChange={(e) => setDraft({ ...draft, data: e.target.value })} />
        <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={draft.optional} onChange={(e) => setDraft({ ...draft, optional: e.target.checked })} /> Optional</label>
        <button onClick={() => save(draft)} disabled={!draft.name || !draft.purpose} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"><Plus size={12} /> Add</button>
      </div>
    </section>
  );
}

function Incidents() {
  const [data, setData] = useState<Awaited<ReturnType<typeof privacy.incidents>> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IncidentRow | null>(null);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState({ title: '', description: '', severity: 'medium' });
  const load = () => privacy.incidents().then(setData).catch(() => undefined);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (openId) privacy.incident(openId).then(setDetail); else setDetail(null); }, [openId]);
  const act = async (body: Record<string, unknown>, msg?: string) => {
    try { setDetail(await privacy.incidentAction(openId!, body)); if (msg) toast.success(msg); load(); } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  const create = async () => {
    try { const i = await privacy.newIncident(draft.title, draft.description, draft.severity); setDraft({ title: '', description: '', severity: 'medium' }); load(); setOpenId(i.id); }
    catch (e) { toast.error(errorText(e, 'Could not open the incident.')); }
  };
  if (!data) return null;
  return (
    <section className={`${card} p-4`} aria-labelledby="inc-title">
      <h2 id="inc-title" className="flex items-center gap-2 font-bold text-slate-800"><AlertOctagon size={16} /> Incidents</h2>
      <table className="w-full text-sm mt-2">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="py-1">Incident</th><th className="py-1">Schools</th><th className="py-1">Status</th><th className="py-1">Regulator (72 h)</th></tr></thead>
        <tbody>{data.incidents.map((i) => (
          <tr key={i.id} className={`border-b border-slate-50 cursor-pointer ${openId === i.id ? 'bg-slate-50' : ''}`} onClick={() => setOpenId(openId === i.id ? null : i.id)}>
            <td className="py-1.5"><span className="font-semibold">{i.reference}</span> {i.title} <span className={`ms-1 rounded-full px-2 text-[11px] font-bold ${SEV[i.severity]}`}>{i.severity}</span></td>
            <td className="py-1.5 text-slate-600">{i.schools.join(', ') || '—'}</td>
            <td className="py-1.5">{i.status_label}</td>
            <td className="py-1.5 text-xs">{i.regulator_notified_at ? `Told ${when(i.regulator_notified_at)}` : i.regulator_overdue ? <span className="font-bold text-rose-700">Overdue since {when(i.regulator_deadline)}</span> : `By ${when(i.regulator_deadline)}`}</td>
          </tr>
        ))}{!data.incidents.length && <tr><td colSpan={4} className="py-4 text-center text-slate-500">No incidents recorded.</td></tr>}</tbody>
      </table>
      {detail && (
        <div className="mt-3 rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
          <p className="font-bold">{detail.reference}: {detail.title}</p>
          <p className="text-slate-600 whitespace-pre-line">{detail.description}</p>
          <div className="flex flex-wrap gap-2 items-center">
            <select className={input} value={detail.status} onChange={(e) => act({ action: 'update', status: e.target.value })} aria-label="Status">{Object.entries(data.statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className={input} value={detail.severity} onChange={(e) => act({ action: 'update', severity: e.target.value })} aria-label="Severity">{Object.entries(data.severities).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select multiple className={`${input} h-16`} value={detail.school_ids} onChange={(e) => act({ action: 'update', school_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })} aria-label="Affected schools">{data.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input className={input} placeholder="Data affected" defaultValue={detail.data_affected} onBlur={(e) => act({ action: 'update', data_affected: e.target.value })} />
            {!detail.regulator_notified_at && <button onClick={() => act({ action: 'update', regulator_notified_at: 'now' }, 'Recorded.')} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold">Regulator told now</button>}
            <button onClick={() => { const m = window.prompt('Message to the affected schools:', detail.description || ''); if (m) act({ action: 'notify_schools', message: m }, 'Schools told by email.'); }} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-white"><Send size={12} /> Tell affected schools</button>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Playbook</p>
            <ul className="space-y-1">{detail.checklist?.map((c) => (
              <li key={c.key}><label className="flex items-start gap-2"><input type="checkbox" checked={!!c.done_at} onChange={() => act({ action: 'step', step: c.key })} className="mt-0.5" /><span className={c.done_at ? 'text-slate-400 line-through' : ''}>{c.label}</span></label></li>
            ))}</ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Timeline</p>
            <ul className="space-y-1 text-xs text-slate-600">{detail.updates?.map((u, i) => <li key={i}><span className="text-slate-400">{when(u.when)} · {u.by}:</span> {u.note}</li>)}</ul>
            <div className="flex gap-2 mt-2"><input className={`${input} flex-1`} placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
              <button onClick={() => { act({ action: 'note', note }); setNote(''); }} disabled={!note} className="inline-flex items-center gap-1 rounded-lg border px-2 text-xs font-semibold"><Check size={12} /> Add</button></div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-3 border-t border-slate-100 pt-3">
        <input className={input} placeholder="New incident: title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input className={`${input} flex-1`} placeholder="What happened" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <select className={input} value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>{Object.entries(data.severities).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button onClick={create} disabled={!draft.title || draft.description.length < 10} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">{<Plus size={12} />} Open incident</button>
      </div>
    </section>
  );
}
