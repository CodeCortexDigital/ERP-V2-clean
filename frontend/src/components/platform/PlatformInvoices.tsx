import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Play, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import subscriptions, { errorText, PlatformInvoice, TaxRuleRow } from '@/services/subscription.service';
import { INVOICE_TONE, money } from '@/components/billing/InvoicesPanel';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

/** Platform owner: every school's invoices (mark paid, cancel), running billing now, and tax by country. */
export default function PlatformInvoices() {
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState<PlatformInvoice[] | null>(null);
  const [busy, setBusy] = useState('');
  const load = () => subscriptions.platformInvoices(filter).then(setRows).catch((e) => toast.error(errorText(e, 'Could not load invoices.')));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const paid = async (r: PlatformInvoice) => {
    const reference = window.prompt(`Mark ${r.number} (${money(r.total, r.currency)}) as paid. Bank reference (optional):`, '');
    if (reference === null) return;
    setBusy(r.id);
    try { await subscriptions.invoiceAction(r.id, 'mark_paid', { via: 'bank_transfer', reference }); toast.success(`${r.number} marked paid.`); load(); }
    catch (e) { toast.error(errorText(e, 'Could not update.')); } finally { setBusy(''); }
  };
  const cancel = async (r: PlatformInvoice) => {
    if (!window.confirm(`Cancel ${r.number}? The school will no longer owe it.`)) return;
    try { await subscriptions.invoiceAction(r.id, 'void'); toast.success(`${r.number} cancelled.`); load(); } catch (e) { toast.error(errorText(e, 'Could not cancel.')); }
  };
  const run = async () => {
    setBusy('run');
    try { const r = await subscriptions.runBilling(); toast.success(`${r.issued} invoices issued, ${r.reminded} reminders sent.`); load(); }
    catch (e) { toast.error(errorText(e, 'Could not run billing.')); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="pinv-title">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <h2 id="pinv-title" className="flex items-center gap-2 font-bold text-slate-800"><Receipt size={16} /> Invoices</h2>
          <div className="flex gap-2">
            <select className={input} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
              <option value="">All</option><option value="open">Open</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="void">Cancelled</option>
            </select>
            <button onClick={run} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700" title="Issue invoices coming due and send reminders (also runs daily)">
              {busy === 'run' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run billing now
            </button>
          </div>
        </div>
        {rows === null ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2">Invoice</th><th className="px-4 py-2">School</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Due</th>
                <th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 font-semibold"><Link to={`/settings/billing/invoices/${r.id}`} className="text-blue-700">{r.number}</Link></td>
                    <td className="px-4 py-2">{r.school}</td>
                    <td className="px-4 py-2 text-slate-600">{r.plan}{r.kind === 'proration' ? ' (upgrade)' : ''}</td>
                    <td className="px-4 py-2 text-slate-600">{new Date(r.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">{money(r.total, r.currency)}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${INVOICE_TONE[r.status]}`}>{r.status}</span>
                      {r.payment_reference && <p className="text-[11px] text-slate-500">{r.paid_via.replace('_', ' ')} · {r.payment_reference}</p>}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {(r.status === 'open' || r.status === 'overdue') && <>
                        <button onClick={() => paid(r)} disabled={!!busy} className="text-xs font-semibold text-emerald-700 me-3">Mark paid</button>
                        <button onClick={() => cancel(r)} className="text-xs font-semibold text-rose-600">Cancel</button>
                      </>}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No invoices.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <TaxRules />
    </div>
  );
}

function TaxRules() {
  const [rules, setRules] = useState<TaxRuleRow[]>([]);
  const [draft, setDraft] = useState({ country: '', label: 'VAT', rate: '', exempt_with_tax_id: false });
  useEffect(() => { subscriptions.taxRules().then(setRules).catch(() => undefined); }, []);
  const add = async () => {
    try { setRules(await subscriptions.saveTax({ ...draft, rate: Number(draft.rate) })); setDraft({ country: '', label: 'VAT', rate: '', exempt_with_tax_id: false }); toast.success('Tax rule saved.'); }
    catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <section className={`${card} p-4`} aria-labelledby="tax-title">
      <h2 id="tax-title" className="font-bold text-slate-800">Tax on invoices</h2>
      <p className="text-xs text-slate-500">Added for schools whose billing country matches. With "reverse charge", a school that gives a tax ID pays no tax.</p>
      <table className="w-full text-sm mt-2">
        <tbody>
          {rules.map((t) => (
            <tr key={t.country} className="border-b border-slate-50">
              <td className="py-1.5 font-semibold w-16">{t.country}</td><td className="py-1.5">{t.label} {t.rate}%</td>
              <td className="py-1.5 text-xs text-slate-500">{t.exempt_with_tax_id ? 'Reverse charge with a tax ID' : ''}</td>
              <td className="py-1.5 text-right"><button onClick={async () => setRules(await subscriptions.deleteTax(t.country))} aria-label={`Remove ${t.country}`} className="text-rose-600"><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <input className={`${input} w-16`} placeholder="GB" maxLength={2} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value.toUpperCase() })} aria-label="Country" />
        <input className={`${input} w-24`} placeholder="VAT" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} aria-label="Tax name" />
        <input className={`${input} w-20`} placeholder="20" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.target.value })} aria-label="Rate %" />
        <label className="text-xs text-slate-600 flex items-center gap-1"><input type="checkbox" checked={draft.exempt_with_tax_id} onChange={(e) => setDraft({ ...draft, exempt_with_tax_id: e.target.checked })} /> Reverse charge</label>
        <button onClick={add} disabled={!draft.country || !draft.rate} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"><Plus size={12} /> Add</button>
      </div>
    </section>
  );
}
