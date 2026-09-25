import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import messaging from '@/services/messaging.service';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

/** Real SMS through Twilio: settings (token is write-only) and sending to numbers. */
export default function SmsPage() {
  const [s, setS] = useState<Awaited<ReturnType<typeof messaging.smsSettings>> | null>(null);
  const [token, setToken] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof messaging.sendSms>> | null>(null);
  useEffect(() => { messaging.smsSettings().then(setS).catch((e) => toast.error(e?.response?.data?.error || 'Could not load SMS settings.')); }, []);
  if (!s) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;

  const save = async () => {
    try { setS(await messaging.saveSms({ ...s, auth_token: token })); setToken(''); toast.success('SMS settings saved'); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not save.'); }
  };
  const send = async () => {
    try { const r = await messaging.sendSms(to.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean), msg); setResult(r); toast.success(`${r.sent} sent`); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not send.'); }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 text-slate-800">
      <h1 className="text-xl font-bold inline-flex items-center gap-2"><Smartphone className="w-5 h-5" /> SMS</h1>
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
        <p className="font-bold inline-flex items-center gap-2">Twilio settings {s.ready && <span className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>}</p>
        <p className="text-slate-600">Texts are sent through your school's Twilio account (twilio.com). Announcements can also go out by text once this is set up.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-sid">Account SID</label><input id="sms-sid" className={input} value={s.account_sid} onChange={(e) => setS({ ...s, account_sid: e.target.value })} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-tok">Auth token</label><input id="sms-tok" type="password" autoComplete="off" className={input} placeholder={s.has_auth_token ? 'Saved. Leave empty to keep it' : ''} value={token} onChange={(e) => setToken(e.target.value)} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-from">Send from (Twilio number)</label><input id="sms-from" className={input} placeholder="+15555550000" value={s.from_number} onChange={(e) => setS({ ...s, from_number: e.target.value })} /></div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="sms-cc">Country code for local numbers</label><input id="sms-cc" className={input} placeholder="92 for Pakistan, 44 for the UK, 1 for the US" value={s.default_country_code} onChange={(e) => setS({ ...s, default_country_code: e.target.value })} /></div>
        </div>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold">Save</button>
      </section>
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-sm">
        <p className="font-bold">Send a text</p>
        <textarea className={input} rows={2} placeholder="Numbers, one per line or separated by commas" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Phone numbers" />
        <textarea className={input} rows={3} maxLength={600} placeholder="Message" value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Message" />
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">{msg.length}/600</span><button disabled={!s.ready} onClick={send} className="px-4 py-2 rounded-lg bg-brand text-white font-semibold disabled:opacity-50">Send</button></div>
        {result && <ul className="text-xs space-y-0.5">{result.results.map((r, i) => <li key={i} className={r.sent ? 'text-emerald-700' : 'text-rose-700'}>{r.to}: {r.sent ? 'sent' : r.error}</li>)}</ul>}
        <p className="text-xs text-slate-500">To text families, post an announcement and tick "Also text (SMS)".</p>
      </section>
    </div>
  );
}
