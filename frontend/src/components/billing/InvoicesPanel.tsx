import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building, CreditCard, FileText, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import subscriptions, { BillingDetails, errorText, PaymentOptions, PlatformInvoice } from '@/services/subscription.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
export const INVOICE_TONE: Record<string, string> = { open: 'bg-sky-100 text-sky-800', overdue: 'bg-rose-100 text-rose-700', paid: 'bg-emerald-100 text-emerald-700', void: 'bg-slate-100 text-slate-500' };
export const money = (n: number, cur: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(n);
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' } as any);

/** Plan & billing: the platform's invoices to this school, paying them, and the details printed on them. */
export default function InvoicesPanel({ onPaid }: { onPaid?: () => void }) {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<PlatformInvoice[] | null>(null);
  const [payment, setPayment] = useState<PaymentOptions>({ card: false, bank_details: '' });
  const [busy, setBusy] = useState('');
  const load = () => subscriptions.invoices().then((d) => { setRows(d.results); setPayment(d.payment); }).catch(() => setRows([]));
  useEffect(() => {
    load();
    const paid = params.get('paid');
    if (paid) { toast.success(`Thank you, the payment for ${paid} is being confirmed.`); setTimeout(() => { load(); onPaid?.(); }, 3000); }
    if (params.get('cancelled')) toast.info('The card payment was cancelled; nothing was charged.');
    if (paid || params.get('cancelled')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async (inv: PlatformInvoice) => {
    setBusy(inv.id);
    try { window.location.href = (await subscriptions.pay(inv.id)).url; } catch (e) { toast.error(errorText(e, 'Could not start the payment.')); setBusy(''); }
  };
  const open = (rows || []).filter((r) => r.status === 'open' || r.status === 'overdue');

  return (
    <div className="space-y-5">
      <section className={card} aria-labelledby="invoices-title">
        <h2 id="invoices-title" className="flex items-center gap-2 px-5 pt-4 font-bold text-slate-800"><FileText size={16} /> Invoices</h2>
        {open.length > 0 && !payment.card && payment.bank_details && (
          <div className="mx-5 mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-700">Pay by bank transfer</p>
            <pre className="whitespace-pre-wrap font-sans text-slate-600 mt-1">{payment.bank_details}</pre>
            <p className="text-xs text-slate-500 mt-1">Put the invoice number as the reference. We mark it paid when the money arrives.</p>
          </div>
        )}
        {rows === null ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div> : rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No invoices yet. One appears when you choose a plan, and before each renewal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-5 py-2 font-semibold">Invoice</th><th className="px-3 py-2 font-semibold">For</th><th className="px-3 py-2 font-semibold">Due</th>
                <th className="px-3 py-2 font-semibold text-right">Total</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-5 py-2 font-semibold text-slate-800">{r.number}</td>
                    <td className="px-3 py-2 text-slate-600">{r.plan} · {r.kind === 'proration' ? 'upgrade difference' : `${day(r.period_start)} – ${day(r.period_end)}`}</td>
                    <td className="px-3 py-2 text-slate-600">{day(r.due_date)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money(r.total, r.currency)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${INVOICE_TONE[r.status]}`}>{r.status}</span></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link to={`/settings/billing/invoices/${r.id}`} className="text-xs font-semibold text-blue-600 me-3">View / print</Link>
                      {(r.status === 'open' || r.status === 'overdue') && payment.card && (
                        <button onClick={() => pay(r)} disabled={!!busy} className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">
                          {busy === r.id ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />} Pay by card
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <DetailsForm />
    </div>
  );
}

function DetailsForm() {
  const [d, setD] = useState<BillingDetails | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { subscriptions.details().then(setD).catch(() => undefined); }, []);
  if (!d) return null;
  const f = (k: keyof BillingDetails, label: string, extra: Record<string, string> = {}) => (
    <label className="text-xs font-semibold text-slate-600">{label}
      <input className={`${input} mt-1`} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} {...extra} />
    </label>
  );
  const save = async () => {
    setSaving(true);
    try { setD(await subscriptions.saveDetails(d)); toast.success('Billing details saved. New invoices will use them.'); } catch (e) { toast.error(errorText(e, 'Could not save.')); } finally { setSaving(false); }
  };
  return (
    <section className={`${card} p-5`} aria-labelledby="bill-to">
      <h2 id="bill-to" className="flex items-center gap-2 font-bold text-slate-800"><Building size={16} /> Billing details</h2>
      <p className="text-xs text-slate-500 mt-1">Printed on your invoices. The country and tax ID decide the tax shown (for example VAT).</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        {f('legal_name', 'Legal name')}
        {f('email', 'Billing email (invoices and reminders)', { type: 'email' })}
        {f('address', 'Address')}
        <div className="grid grid-cols-2 gap-3">
          {f('country', 'Country code (e.g. GB)', { maxLength: '2' })}
          {f('tax_id', 'Tax ID (optional)')}
        </div>
      </div>
      <div className="flex justify-end mt-3"><button onClick={save} disabled={saving} className="auth-primary-btn w-auto px-5 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save details</button></div>
    </section>
  );
}
