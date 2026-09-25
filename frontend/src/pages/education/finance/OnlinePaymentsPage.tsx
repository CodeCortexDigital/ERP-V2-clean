import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Copy, CreditCard, Loader2, Trash2 } from 'lucide-react';
import billingService, { type GatewayConfig } from '@/services/billing.service';
import { API_BASE_URL } from '@/services/api';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';

const PROVIDERS = [
  { code: 'stripe', name: 'Stripe', blurb: 'Cards (Visa, Mastercard, Amex), Apple Pay and Google Pay in 135+ currencies. Best for international schools.' },
  { code: 'jazzcash', name: 'JazzCash', blurb: 'Mobile wallet and cards in Pakistan.' },
  { code: 'easypaisa', name: 'Easypaisa', blurb: 'Mobile wallet and cards in Pakistan.' },
] as const;

type Draft = { id?: string; provider: string; name: string; merchant_id: string; api_key: string; api_secret: string; webhook_secret: string; api_url: string; is_active: boolean };

/** Settings for online fee payment providers. Secrets are write-only: they are never shown again. */
export default function OnlinePaymentsPage() {
  const [configs, setConfigs] = useState<GatewayConfig[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => billingService.gateways().then(setConfigs).catch(() => toast.error('Could not load payment settings.'));
  useEffect(() => { load(); }, []);

  const webhookUrl = (code: string) => `${API_BASE_URL.replace(/\/$/, '')}/auth/finance/payments/webhook/${code}/`;

  const edit = (code: string) => {
    const c = configs?.find((x) => x.provider === code);
    setDraft({ id: c?.id, provider: code, name: c?.name || PROVIDERS.find((p) => p.code === code)!.name, merchant_id: c?.merchant_id || '',
      api_key: '', api_secret: '', webhook_secret: '', api_url: c?.api_url || '', is_active: c ? c.is_active : true });
  };

  const save = async () => {
    if (!draft) return;
    if (draft.provider === 'stripe' && !draft.id && !draft.api_secret.startsWith('sk_')) return toast.error('Paste the Stripe secret key (starts with sk_).');
    setSaving(true);
    try {
      await billingService.saveGateway(draft as Parameters<typeof billingService.saveGateway>[0]);
      toast.success('Payment settings saved');
      setDraft(null);
      load();
    } catch (err: any) {
      const body = err?.response?.data;
      toast.error(body?.error || (body ? Object.values(body).flat().join(' ') : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  if (!configs) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>;

  return (
    <div className="space-y-4 p-4 max-w-5xl mx-auto text-slate-800">
      <div>
        <h1 className="text-xl font-bold">Online payments</h1>
        <p className="text-sm text-slate-500">Let parents pay invoices online from the parent portal. Payments are recorded on the invoice automatically.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map((p) => {
          const c = configs.find((x) => x.provider === p.code);
          const ready = c && c.is_active && (p.code === 'stripe' ? c.has_api_secret : c.merchant_id);
          return (
            <div key={p.code} className={`${card} p-5 flex flex-col`}>
              <div className="flex items-center justify-between">
                <p className="font-bold inline-flex items-center gap-2"><CreditCard className="w-4 h-4" /> {p.name}</p>
                {ready ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> On</span>
                  : <span className="text-xs font-semibold text-slate-400">Off</span>}
              </div>
              <p className="text-sm text-slate-600 mt-2 flex-1">{p.blurb}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => edit(p.code)} className="px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold">{c ? 'Edit' : 'Set up'}</button>
                {c && <button onClick={async () => { if (window.confirm(`Remove ${p.name}?`)) { await billingService.deleteGateway(c.id); load(); } }} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50" aria-label={`Remove ${p.name}`}><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className={`${card} p-5 space-y-4`}>
          <p className="font-bold">{PROVIDERS.find((p) => p.code === draft.provider)?.name} settings</p>
          {draft.provider === 'stripe' ? (
            <>
              <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
                <li>In your Stripe dashboard, open Developers → API keys and copy the <strong>Secret key</strong>.</li>
                <li>Open Developers → Webhooks → Add endpoint, paste the address below, and choose the events <code>checkout.session.completed</code> and <code>checkout.session.expired</code>.</li>
                <li>Copy the endpoint's <strong>Signing secret</strong> (starts with whsec_) here.</li>
              </ol>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex items-center gap-2">
                <span className="break-all flex-1">{webhookUrl('stripe')}</span>
                <button onClick={() => { navigator.clipboard?.writeText(webhookUrl('stripe')); toast.success('Copied'); }} className="p-1.5 rounded hover:bg-slate-200" aria-label="Copy webhook address"><Copy className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={lbl} htmlFor="gw-sk">Secret key</label><input id="gw-sk" type="password" autoComplete="off" className={input} placeholder={draft.id ? 'Saved. Leave empty to keep it' : 'sk_live_…'} value={draft.api_secret} onChange={(e) => setDraft({ ...draft, api_secret: e.target.value })} /></div>
                <div><label className={lbl} htmlFor="gw-wh">Webhook signing secret</label><input id="gw-wh" type="password" autoComplete="off" className={input} placeholder={draft.id ? 'Saved. Leave empty to keep it' : 'whsec_…'} value={draft.webhook_secret} onChange={(e) => setDraft({ ...draft, webhook_secret: e.target.value })} /></div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={lbl} htmlFor="gw-mid">Merchant ID</label><input id="gw-mid" className={input} value={draft.merchant_id} onChange={(e) => setDraft({ ...draft, merchant_id: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="gw-url">Gateway URL</label><input id="gw-url" className={input} value={draft.api_url} onChange={(e) => setDraft({ ...draft, api_url: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="gw-key">API key / password</label><input id="gw-key" type="password" className={input} placeholder={draft.id ? 'Saved. Leave empty to keep it' : ''} value={draft.api_secret} onChange={(e) => setDraft({ ...draft, api_secret: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="gw-hash">Integrity salt / webhook secret</label><input id="gw-hash" type="password" className={input} placeholder={draft.id ? 'Saved. Leave empty to keep it' : ''} value={draft.webhook_secret} onChange={(e) => setDraft({ ...draft, webhook_secret: e.target.value })} /></div>
              <p className="sm:col-span-2 text-xs text-slate-500">Callback address: {webhookUrl(draft.provider)}</p>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Show this payment option to parents</label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setDraft(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold">Cancel</button>
          </div>
          <p className="text-xs text-slate-500">Keys are stored securely and never shown again after saving.</p>
        </div>
      )}
    </div>
  );
}
