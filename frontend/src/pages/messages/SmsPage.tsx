import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Send, Smartphone } from 'lucide-react';
import messaging, { TextLogRow, TextRule, TextRulesData } from '@/services/messaging.service';
import api from '@/services/api';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const card = 'bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-sm';
const err = (e: any, f: string) => toast.error(e?.response?.data?.error || f);
const TABS = [['auto', 'Automatic messages'], ['emergency', 'Emergency message'], ['log', 'Delivery log'], ['settings', 'Settings']] as const;
const TONE: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-700', read: 'bg-emerald-100 text-emerald-700', sent: 'bg-sky-100 text-sky-800',
  queued: 'bg-slate-100 text-slate-700', accepted: 'bg-slate-100 text-slate-700', failed: 'bg-rose-100 text-rose-700',
  undelivered: 'bg-rose-100 text-rose-700', retried: 'bg-slate-100 text-slate-500',
};

/** SMS and WhatsApp through the school's Twilio account (Phase 7, P16): automatic alerts in the school's words,
 * emergency messages, the delivery log with retries, and the settings. */
export default function SmsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'auto';
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4 text-slate-800">
      <h1 className="text-xl font-bold inline-flex items-center gap-2"><Smartphone className="w-5 h-5" /> SMS & WhatsApp</h1>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-brand text-brand' : 'border-transparent text-slate-500'}`}>{label}</button>
        ))}
      </div>
      {tab === 'auto' && <AutoTab />}
      {tab === 'emergency' && <EmergencyTab onSent={(batch) => setParams({ tab: 'log', batch })} />}
      {tab === 'log' && <LogTab batch={params.get('batch') || ''} />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function AutoTab() {
  const [data, setData] = useState<TextRulesData | null>(null);
  const [testTo, setTestTo] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { messaging.textRules().then(setData).catch((e) => err(e, 'Could not load.')); }, []);
  if (!data) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  const upd = (event: string, patch: Partial<TextRule>) => setData({ ...data, rules: data.rules.map((r) => (r.event === event ? { ...r, ...patch } : r)) });
  const save = async () => {
    setSaving(true);
    try { setData(await messaging.saveTextRules(data.rules)); toast.success('Saved.'); } catch (e) { err(e, 'Could not save.'); } finally { setSaving(false); }
  };
  const test = async (r: TextRule, channel: string) => {
    if (!testTo.trim()) { toast.error('Enter a phone number to send the test to (at the top).'); return; }
    try { const res = await messaging.testText({ event: r.event, to: testTo.trim(), channel }); toast.success(res.message); } catch (e) { err(e, 'Could not send.'); }
  };
  return (
    <div className="space-y-3">
      {!data.ready.sms && !data.ready.whatsapp && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={15} /> Nothing is sent until the Twilio account is set up in Settings.</p>
      )}
      {!data.delivery_reports && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Delivery reports (delivered / not delivered) need the server's public address (<code>PUBLIC_API_URL</code>). Until then the log shows whether Twilio accepted each text.</p>
      )}
      <div className={card}>
        <p className="text-slate-600">These go to the family automatically, in your words, besides the email and portal notice. Each alert goes to each number once. Words in {'{braces}'} are filled in for each message.</p>
        <label className="block text-xs font-semibold text-slate-600">Send tests to<input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+923001234567" className={`${input} mt-1 max-w-xs`} /></label>
      </div>
      {data.rules.map((r) => (
        <div key={r.event} className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={r.is_active} onChange={(e) => upd(r.event, { is_active: e.target.checked })} /> {r.label}</label>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" checked={r.sms} onChange={(e) => upd(r.event, { sms: e.target.checked })} /> SMS</label>
              <label className={`flex items-center gap-1 ${data.ready.whatsapp ? '' : 'text-slate-400'}`}><input type="checkbox" checked={r.whatsapp} onChange={(e) => upd(r.event, { whatsapp: e.target.checked })} /> WhatsApp</label>
              <button onClick={() => test(r, 'sms')} disabled={!data.ready.sms} className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40">Test SMS</button>
              {data.ready.whatsapp && <button onClick={() => test(r, 'whatsapp')} className="rounded border border-slate-300 px-2 py-0.5">Test WhatsApp</button>}
            </div>
          </div>
          <textarea value={r.template} onChange={(e) => upd(r.event, { template: e.target.value })} rows={2} maxLength={600} aria-label={`${r.label} message`} className={input} />
          <p className="text-xs text-slate-500">{r.template.length}/600 · can use {(r.placeholders || []).map((p) => `{${p}}`).join(' ')}{r.event === 'fee_reminder' ? ' · sent with fee reminders (the button on Fee Defaulters and the monthly reminder run)' : ''}{r.event === 'emergency' ? ' · the wording around emergency messages' : ''}</p>
        </div>
      ))}
      <div className="flex justify-end"><button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-brand text-white font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button></div>
    </div>
  );
}

function EmergencyTab({ onSent }: { onSent: (batch: string) => void }) {
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('everyone');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>(['sms']);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/auth/academics/classes/', { params: { page_size: 200 } }).then((r) => setClasses((r.data?.results || r.data || []).map((c: any) => ({ id: String(c.id), name: c.name })))).catch(() => undefined); }, []);
  const send = async () => {
    if (!window.confirm('Send this urgent message now? It goes out immediately by portal, email and the channels you ticked.')) return;
    setBusy(true);
    try { const r = await messaging.emergency({ message, audience, class_ids: classIds, channels }); toast.success(r.message); onSent(r.batch); }
    catch (e) { err(e, 'Could not send.'); } finally { setBusy(false); }
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className={`${card} border-rose-200`}>
      <p className="flex items-center gap-2 font-bold text-rose-700"><AlertTriangle size={16} /> Emergency message</p>
      <p className="text-slate-600">For closures, weather, safety and other urgent news. It is sent straight away as a pinned announcement (portal and email) and as a text to every phone number, and you can follow its delivery in the log.</p>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500} placeholder="e.g. School is closed today because of flooding. Please keep children at home." aria-label="Message" className={input} />
      <div className="flex flex-wrap gap-4 text-sm">
        <label>Who: <select value={audience} onChange={(e) => setAudience(e.target.value)} className="rounded border border-slate-300 px-2 py-1">
          <option value="everyone">Everyone (families and staff)</option><option value="parents">All families</option><option value="staff">All staff</option><option value="class">Chosen classes</option></select></label>
        <span>Texts: <label className="ms-1"><input type="checkbox" checked={channels.includes('sms')} onChange={() => setChannels(toggle(channels, 'sms'))} /> SMS</label>
          <label className="ms-2"><input type="checkbox" checked={channels.includes('whatsapp')} onChange={() => setChannels(toggle(channels, 'whatsapp'))} /> WhatsApp</label></span>
      </div>
      {audience === 'class' && (
        <div className="flex flex-wrap gap-2">{classes.map((c) => (
          <label key={c.id} className="rounded border border-slate-200 px-2 py-1 text-xs"><input type="checkbox" checked={classIds.includes(c.id)} onChange={() => setClassIds(toggle(classIds, c.id))} /> {c.name}</label>
        ))}</div>
      )}
      <button disabled={busy || !message.trim() || (audience === 'class' && !classIds.length)} onClick={send}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send now</button>
    </div>
  );
}

function LogTab({ batch }: { batch: string }) {
  const [status, setStatus] = useState('');
  const [event, setEvent] = useState('');
  const [data, setData] = useState<{ messages: TextLogRow[]; week: { total: number; delivered: number; failed: number } } | null>(null);
  const load = useCallback(() => messaging.textLog({ status, event, batch }).then(setData).catch((e) => err(e, 'Could not load.')), [status, event, batch]);
  useEffect(() => { load(); }, [load]);
  const retry = async (body: { ids?: string[]; batch?: string }) => {
    try { toast.success((await messaging.retryTexts(body)).message); load(); } catch (e) { err(e, 'Could not retry.'); }
  };
  if (!data) return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  const failedHere = data.messages.filter((m) => m.status === 'failed' || m.status === 'undelivered');
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-slate-600">Last 7 days: <b>{data.week.total}</b> texts, <b className="text-emerald-700">{data.week.delivered}</b> delivered, <b className="text-rose-700">{data.week.failed}</b> not delivered.
          {batch && <span className="ms-2 rounded bg-rose-50 px-2 text-xs text-rose-700">Showing one emergency message</span>}</p>
        <div className="flex flex-wrap gap-2">
          <select value={event} onChange={(e) => setEvent(e.target.value)} aria-label="Kind" className="rounded border border-slate-300 px-2 py-1">
            <option value="">All kinds</option><option value="absent">Absence</option><option value="late">Late arrival</option><option value="chronic">Frequent absence</option>
            <option value="fee_reminder">Fee reminder</option><option value="emergency">Emergency</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Result" className="rounded border border-slate-300 px-2 py-1">
            <option value="">Any result</option><option value="delivered">Delivered</option><option value="failed">Not delivered</option></select>
          {failedHere.length > 0 && <button onClick={() => retry(batch ? { batch } : { ids: failedHere.map((m) => m.id) })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 font-semibold"><RotateCcw size={13} /> Send failed ones again ({failedHere.length})</button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="py-1">When</th><th>Kind</th><th>To</th><th>Message</th><th>Result</th></tr></thead>
          <tbody>{data.messages.map((m) => (
            <tr key={m.id} className="border-b border-slate-50 align-top">
              <td className="py-1.5 text-xs whitespace-nowrap">{new Date(m.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any)}</td>
              <td className="text-xs">{m.event_label}{m.student ? <><br /><span className="text-slate-500">{m.student}</span></> : null}</td>
              <td className="text-xs whitespace-nowrap">{m.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}<br /><span className="text-slate-500">{m.to}</span></td>
              <td className="text-xs text-slate-700 max-w-md">{m.body}</td>
              <td className="text-xs"><span className={`rounded-full px-2 py-0.5 font-bold ${TONE[m.status] || 'bg-slate-100 text-slate-700'}`}>{m.status}</span>
                {m.error && <p className="mt-1 text-rose-700">{m.error}</p>}</td>
            </tr>
          ))}{!data.messages.length && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No texts yet.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<Awaited<ReturnType<typeof messaging.smsSettings>> | null>(null);
  const [token, setToken] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof messaging.sendSms>> | null>(null);
  useEffect(() => { messaging.smsSettings().then(setS).catch((e) => err(e, 'Could not load SMS settings.')); }, []);
  if (!s) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;
  const save = async () => {
    try { setS(await messaging.saveSms({ ...s, auth_token: token })); setToken(''); toast.success('Settings saved'); } catch (e) { err(e, 'Could not save.'); }
  };
  const send = async () => {
    try { const r = await messaging.sendSms(to.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean), msg); setResult(r); toast.success(`${r.sent} sent`); } catch (e) { err(e, 'Could not send.'); }
  };
  return (
    <>
      <section className={card}>
        <p className="font-bold inline-flex items-center gap-2">Twilio settings {s.ready && <span className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>}</p>
        <p className="text-slate-600">Texts are sent through your school's Twilio account (twilio.com). For WhatsApp, add a WhatsApp-enabled Twilio number; messages that start a conversation must match a template approved for that number in Twilio.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-sid">Account SID</label><input id="sms-sid" className={input} value={s.account_sid} onChange={(e) => setS({ ...s, account_sid: e.target.value })} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-tok">Auth token</label><input id="sms-tok" type="password" autoComplete="off" className={input} placeholder={s.has_auth_token ? 'Saved. Leave empty to keep it' : ''} value={token} onChange={(e) => setToken(e.target.value)} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-from">SMS from (Twilio number)</label><input id="sms-from" className={input} placeholder="+15555550000" value={s.from_number} onChange={(e) => setS({ ...s, from_number: e.target.value })} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-wa">WhatsApp from (optional)</label><input id="sms-wa" className={input} placeholder="+15555550001" value={s.whatsapp_from || ''} onChange={(e) => setS({ ...s, whatsapp_from: e.target.value })} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-cc">Country code for local numbers</label><input id="sms-cc" className={input} placeholder="92 for Pakistan, 44 for the UK, 1 for the US" value={s.default_country_code} onChange={(e) => setS({ ...s, default_country_code: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.is_active} onChange={(e) => setS({ ...s, is_active: e.target.checked })} /> Texts switched on (untick to pause every text without losing the settings)</label>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Save</button>
      </section>
      <section className={card}>
        <p className="font-bold">Send a text</p>
        <textarea className={input} rows={2} placeholder="Numbers, one per line or separated by commas" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Phone numbers" />
        <textarea className={input} rows={3} maxLength={600} placeholder="Message" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Text message" />
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{msg.length}/600</span><button disabled={!s.ready} onClick={send} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold disabled:opacity-50">Send</button></div>
        {result && <ul className="text-xs space-y-0.5">{result.results.map((r, i) => <li key={i} className={r.sent ? 'text-emerald-700' : 'text-rose-700'}>{r.to}: {r.sent ? 'sent' : r.error}</li>)}</ul>}
      </section>
    </>
  );
}
