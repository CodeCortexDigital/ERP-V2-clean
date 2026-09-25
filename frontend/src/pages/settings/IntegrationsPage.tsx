import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Copy, GraduationCap, KeyRound, Loader2, Mail, Plug, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import integrations, { CompareReport, Course, errorText, Hub, IntegrationRow } from '@/services/integrations.service';
import { Modal } from '@/components/ui/Modal';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-5';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

function Status({ on, label }: { on: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{on ? <CheckCircle2 size={12} /> : <Circle size={12} />} {label}</span>;
}

function CopyLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">{label}: <code className="rounded bg-slate-100 px-1.5 py-0.5 break-all">{value}</code>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(value); toast.success('Copied.'); }} className="text-blue-600 inline-flex items-center gap-0.5 font-bold"><Copy size={11} /> Copy</button>
    </p>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`text-xs font-semibold text-slate-600 ${wide ? 'sm:col-span-2' : ''}`}>{label}<div className="mt-1">{children}</div></label>;
}

function useForm(row: IntegrationRow, extra: string[] = []) {
  const [v, setV] = useState<Record<string, any>>({ ...row.config, enabled: row.enabled, ...Object.fromEntries(extra.map((k) => [k, ''])) });
  return [v, (k: string, val: any) => setV((x) => ({ ...x, [k]: val }))] as const;
}

function MicrosoftCard({ row, onSaved }: { row: IntegrationRow; onSaved: () => void }) {
  const [v, set] = useForm(row, ['client_secret']);
  const save = async () => {
    try {
      await integrations.save('microsoft', { ...v, allowed_domains: Array.isArray(v.allowed_domains) ? v.allowed_domains.join(', ') : v.allowed_domains });
      toast.success('Microsoft sign-in saved.'); onSaved();
    } catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <section className={card}>
      <div className="flex items-center gap-2 mb-1"><KeyRound size={16} className="text-blue-600" /><h2 className="font-black text-slate-900 mr-auto">Microsoft 365 / Entra ID sign-in</h2><Status on={row.ready} label={row.ready ? 'On' : 'Off'} /></div>
      <p className="text-sm text-slate-500 mb-3">Staff, students and parents sign in with their school Microsoft account. They must already have an account here with the same email address.</p>
      <ol className="text-xs text-slate-500 list-decimal pl-5 mb-3 space-y-0.5">
        <li>In the Microsoft Entra admin centre, go to App registrations → New registration.</li>
        <li>Add the redirect address below as a <b>Web</b> redirect URI.</li>
        <li>Copy the Application (client) ID and the Directory (tenant) ID, and create a client secret.</li>
      </ol>
      <CopyLine label="Redirect address" value={row.redirect_uri} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <Field label="Application (client) ID"><input className={input} value={v.client_id || ''} onChange={(e) => set('client_id', e.target.value)} /></Field>
        <Field label="Directory (tenant) ID"><input className={input} value={v.directory || ''} placeholder="organizations" onChange={(e) => set('directory', e.target.value)} /></Field>
        <Field label={`Client secret${row.secrets_set.client_secret ? ' (saved; leave blank to keep)' : ''}`}><input type="password" autoComplete="new-password" className={input} value={v.client_secret} onChange={(e) => set('client_secret', e.target.value)} /></Field>
        <Field label="School email domains (comma separated)"><input className={input} value={Array.isArray(v.allowed_domains) ? v.allowed_domains.join(', ') : v.allowed_domains || ''} placeholder="myschool.edu.pk" onChange={(e) => set('allowed_domains', e.target.value)} /></Field>
      </div>
      {row.last_error && <p className="text-xs text-rose-600 mt-2">Last problem: {row.last_error}</p>}
      <div className="flex items-center gap-3 mt-3">
        <label className="text-sm font-semibold inline-flex items-center gap-2 mr-auto"><input type="checkbox" checked={!!v.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Show "Continue with Microsoft" for these domains</label>
        {row.enabled && <button onClick={async () => { await integrations.disconnect('microsoft'); onSaved(); }} className="text-xs font-bold text-rose-600">Turn off and forget</button>}
        <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save</button>
      </div>
    </section>
  );
}

function EmailCard({ row, onSaved }: { row: IntegrationRow; onSaved: () => void }) {
  const [v, set] = useForm(row, ['password']);
  useEffect(() => { if (!v.port) set('port', 587); if (v.use_tls == null && !v.use_ssl) set('use_tls', true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => { try { await integrations.save('email', v); toast.success('School email saved.'); onSaved(); } catch (e) { toast.error(errorText(e, 'Could not save.')); } };
  const test = async () => {
    setBusy(true);
    try { const r = await integrations.testEmail(to); toast.success(`Test email sent to ${r.sent_to}.`); onSaved(); }
    catch (e) { toast.error(errorText(e, 'The test email did not go.')); onSaved(); } finally { setBusy(false); }
  };
  return (
    <section className={card}>
      <div className="flex items-center gap-2 mb-1"><Mail size={16} className="text-blue-600" /><h2 className="font-black text-slate-900 mr-auto">School email</h2><Status on={row.ready} label={row.ready ? 'Sending from the school' : 'Using the system sender'} /></div>
      <p className="text-sm text-slate-500 mb-3">Send notices, reminders and receipts from the school's own address, e.g. Google Workspace (smtp.gmail.com, port 587 with an app password), Microsoft 365 (smtp.office365.com, 587), SendGrid or Mailgun.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Mail server"><input className={input} value={v.host || ''} placeholder="smtp.gmail.com" onChange={(e) => set('host', e.target.value)} /></Field>
        <Field label="Port"><input type="number" className={input} value={v.port ?? ''} onChange={(e) => set('port', e.target.value)} /></Field>
        <Field label="Security"><select className={input} value={v.use_ssl ? 'ssl' : 'tls'} onChange={(e) => { set('use_ssl', e.target.value === 'ssl'); set('use_tls', e.target.value === 'tls'); }}><option value="tls">STARTTLS (587)</option><option value="ssl">SSL (465)</option></select></Field>
        <Field label="Username"><input className={input} value={v.username || ''} onChange={(e) => set('username', e.target.value)} /></Field>
        <Field label={`Password${row.secrets_set.password ? ' (saved)' : ''}`}><input type="password" autoComplete="new-password" className={input} value={v.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <Field label="Send as (address)"><input className={input} value={v.from_email || ''} placeholder="office@myschool.edu.pk" onChange={(e) => set('from_email', e.target.value)} /></Field>
        <Field label="Sender name"><input className={input} value={v.from_name || ''} placeholder="Hillside School" onChange={(e) => set('from_name', e.target.value)} /></Field>
      </div>
      {row.last_error && <p className="text-xs text-rose-600 mt-2">Last problem: {row.last_error}</p>}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <label className="text-sm font-semibold inline-flex items-center gap-2 mr-auto"><input type="checkbox" checked={!!v.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Send the school's email through this server</label>
        <input aria-label="Send a test to" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Send a test to (blank = me)" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={test} disabled={!row.ready || busy} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50">{busy ? 'Sending…' : 'Send test'}</button>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Save</button>
      </div>
    </section>
  );
}

function ClassroomCard({ row, onSaved }: { row: IntegrationRow; onSaved: () => void }) {
  const [v, set] = useForm(row, ['client_secret']);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [busy, setBusy] = useState('');
  const loadCourses = () => { setBusy('list'); integrations.courses().then(setCourses).catch((e) => toast.error(errorText(e, 'Could not reach Google Classroom.'))).finally(() => setBusy('')); };
  useEffect(() => {
    if (row.connected) loadCourses();
    api.get('/auth/academics/classes/', { params: { is_active: true } }).then((r) => { const rows = (Array.isArray(r.data) ? r.data : r.data?.results || []) as any[]; setClasses(rows.map((c) => ({ id: c.id, name: c.name }))); }).catch(() => undefined);
  }, [row.connected]); // eslint-disable-line react-hooks/exhaustive-deps
  const connect = async () => {
    try { await integrations.save('google_classroom', v); window.location.assign(await integrations.classroomConnect()); }
    catch (e) { toast.error(errorText(e, 'Could not start.')); }
  };
  const compare = async (c: Course) => { setBusy(c.id); try { setReport(await integrations.compare(c.id)); } catch (e) { toast.error(errorText(e, 'Could not compare.')); } finally { setBusy(''); } };
  return (
    <section className={card}>
      <div className="flex items-center gap-2 mb-1"><GraduationCap size={16} className="text-blue-600" /><h2 className="font-black text-slate-900 mr-auto">Google Classroom</h2><Status on={!!row.connected} label={row.connected ? `Connected${row.config.google_account ? ` as ${row.config.google_account}` : ''}` : 'Not connected'} /></div>
      <p className="text-sm text-slate-500 mb-3">See your Classroom courses, link each one to a class here, and check which students are missing on either side (matched by email). Read only: nothing is changed in Classroom.</p>
      {!row.connected && (
        <>
          <ol className="text-xs text-slate-500 list-decimal pl-5 mb-2 space-y-0.5">
            <li>In Google Cloud console, turn on the <b>Google Classroom API</b>.</li>
            <li>Create an OAuth client (Web application) and add the redirect address below.</li>
          </ol>
          <CopyLine label="Redirect address" value={row.redirect_uri} />
          {!row.uses_server_app && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Field label="OAuth client ID"><input className={input} value={v.client_id || ''} onChange={(e) => set('client_id', e.target.value)} /></Field>
              <Field label={`Client secret${row.secrets_set.client_secret ? ' (saved)' : ''}`}><input type="password" autoComplete="new-password" className={input} value={v.client_secret} onChange={(e) => set('client_secret', e.target.value)} /></Field>
            </div>
          )}
          <div className="flex justify-end mt-3"><button onClick={connect} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-1.5"><Plug size={14} /> Connect Google Classroom</button></div>
        </>
      )}
      {row.connected && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-black text-slate-800 mr-auto">Active courses</h3>
            <button onClick={loadCourses} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
            <button onClick={async () => { if (window.confirm('Disconnect Google Classroom?')) { await integrations.disconnect('google_classroom'); onSaved(); } }} className="text-xs font-bold text-rose-600">Disconnect</button>
          </div>
          {busy === 'list' ? <Loader2 className="animate-spin text-slate-400" /> : !courses?.length ? <p className="text-sm text-slate-500">No active courses found for this Google account.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">Course</th><th>Linked class</th><th>Last check</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 font-semibold">{c.name}{c.section ? <span className="text-slate-400 font-normal"> · {c.section}</span> : null}</td>
                    <td>
                      <select aria-label={`Class for ${c.name}`} className="rounded border border-slate-200 px-2 py-1 text-sm" value={c.class?.id || ''}
                        onChange={async (e) => { await integrations.link(c.id, e.target.value, c.name); loadCourses(); }}>
                        <option value="">Not linked</option>{classes.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                    </td>
                    <td className="text-xs text-slate-500">{c.last_report ? `${c.last_report.in_both.length} matched · ${c.last_report.only_in_classroom.length + c.last_report.only_in_class.length} to check` : '—'}</td>
                    <td className="text-right">{c.class && <button onClick={() => compare(c)} disabled={busy === c.id} className="text-xs font-bold text-blue-600">{busy === c.id ? 'Checking…' : 'Compare rosters'}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      {report && (
        <Modal open onClose={() => { setReport(null); loadCourses(); }} title={`${report.course} ↔ ${report.class}`} size="lg">
          <div className="space-y-3 text-sm">
            <p><b>{report.in_both.length}</b> student(s) are in both{report.teachers.length ? ` · Classroom teachers: ${report.teachers.join(', ')}` : ''}.</p>
            <div><h4 className="font-black text-slate-800">Only in Classroom ({report.only_in_classroom.length})</h4>{report.only_in_classroom.length === 0 ? <p className="text-slate-500">None.</p> : <ul className="list-disc pl-5">{report.only_in_classroom.map((r) => <li key={r.name + r.email}>{r.name} <span className="text-slate-400">{r.email}</span> — {r.note}</li>)}</ul>}</div>
            <div><h4 className="font-black text-slate-800">Only in the class here ({report.only_in_class.length})</h4>{report.only_in_class.length === 0 ? <p className="text-slate-500">None.</p> : <ul className="list-disc pl-5">{report.only_in_class.map((r) => <li key={r.name + r.email}>{r.name} <span className="text-slate-400">{r.email}</span> — {r.note}</li>)}</ul>}</div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Office: connect the school to outside services, and see the ones set up elsewhere. */
export default function IntegrationsPage() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [params, setParams] = useSearchParams();
  const load = () => integrations.hub().then(setHub).catch((e) => toast.error(errorText(e, 'Could not load integrations.')));
  useEffect(() => {
    load();
    if (params.get('connected') === 'google_classroom') toast.success('Google Classroom is connected.');
    if (params.get('classroom_error')) toast.error(params.get('classroom_error')!);
    if (params.get('connected') || params.get('classroom_error')) setParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!hub) return <div className="flex items-center gap-2 text-sm text-slate-400 p-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  const row = (p: IntegrationRow['provider']) => hub.integrations.find((i) => i.provider === p)!;
  const e = hub.elsewhere;
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Plug size={20} className="text-blue-600" /> Integrations</h1>
        <p className="text-sm text-slate-500">Connect {hub.school.name || 'your school'} to the services it already uses. Passwords and secrets are stored encrypted and never shown again.</p>
      </div>
      <section className={card}>
        <h2 className="font-black text-slate-900 mb-2">Already available</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <li className="flex items-center gap-2"><Status on={e.google_sign_in.enabled} label="Google sign-in" /> <span className="text-slate-500">for every account</span></li>
          <li className="flex items-center gap-2"><Status on={e.calendar.enabled} label="Calendar feeds" /> <span className="text-slate-500">Google / Apple / Outlook</span> <Link to={e.calendar.where} className="text-blue-600 text-xs font-bold ml-auto">Open</Link></li>
          <li className="flex items-center gap-2"><Status on={e.sms.enabled} label="SMS (Twilio)" /> <Link to={e.sms.where} className="text-blue-600 text-xs font-bold ml-auto">Set up</Link></li>
          <li className="flex items-center gap-2"><Status on={e.payments.gateways.some((g) => g.active)} label="Online payments" /> <span className="text-slate-500 truncate">{e.payments.gateways.filter((g) => g.active).map((g) => g.label).join(', ') || 'Stripe, JazzCash, Easypaisa'}</span> <Link to={e.payments.where} className="text-blue-600 text-xs font-bold ml-auto">Set up</Link></li>
        </ul>
      </section>
      <MicrosoftCard row={row('microsoft')} onSaved={load} />
      <ClassroomCard row={row('google_classroom')} onSaved={load} />
      <EmailCard row={row('email')} onSaved={load} />
    </div>
  );
}
