import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import subscriptions, { PaymentOptions, PlatformInvoice } from '@/services/subscription.service';
import { INVOICE_TONE, money } from '@/components/billing/InvoicesPanel';

const day = (d: string) => new Date(d).toLocaleDateString(undefined, { dateStyle: 'long' } as any);

/** A platform invoice laid out for printing or saving as PDF (the browser's Print → Save as PDF). */
export default function InvoicePrintPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ invoice: PlatformInvoice; payment: PaymentOptions; seller: { name: string; address: string; tax_id: string } } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (id) subscriptions.invoice(id).then(setData).catch(() => setError('Invoice not found.')); }, [id]);
  if (error) return <p className="p-6 text-slate-600">{error}</p>;
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  const { invoice: inv, seller, payment } = data;
  return (
    <div className="max-w-3xl mx-auto">
      <style>{`@media print { aside, header, .no-print, [data-sonner-toaster] { display: none !important; } main { padding: 0 !important; } .print-sheet { box-shadow: none !important; border: none !important; } }`}</style>
      <div className="no-print flex items-center justify-between mb-3">
        <Link to="/settings/billing" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft size={15} /> Plan & billing</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"><Printer size={15} /> Print or save as PDF</button>
      </div>
      <article className="print-sheet bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-sm text-slate-800" aria-label={`Invoice ${inv.number}`}>
        <div className="flex justify-between gap-6">
          <div>
            <p className="text-2xl font-bold">Invoice</p>
            <p className="text-slate-500">{inv.number}</p>
            <span className={`inline-block mt-2 rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${INVOICE_TONE[inv.status]}`}>{inv.status}</span>
          </div>
          <div className="text-right">
            <p className="font-bold">{seller.name}</p>
            {seller.address && <p className="whitespace-pre-line text-slate-600">{seller.address}</p>}
            {seller.tax_id && <p className="text-slate-600">Tax ID {seller.tax_id}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-8">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Bill to</p>
            <p className="font-semibold">{inv.bill_to.legal_name || inv.school}</p>
            {inv.bill_to.address && <p className="whitespace-pre-line text-slate-600">{inv.bill_to.address}</p>}
            {inv.bill_to.country && <p className="text-slate-600">{inv.bill_to.country}</p>}
            {inv.bill_to.tax_id && <p className="text-slate-600">Tax ID {inv.bill_to.tax_id}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-y-1 text-right">
            <dt className="text-slate-500">Issued</dt><dd>{day(inv.issue_date)}</dd>
            <dt className="text-slate-500">Due</dt><dd>{day(inv.due_date)}</dd>
            {inv.paid_at && <><dt className="text-slate-500">Paid</dt><dd>{day(inv.paid_at)}</dd></>}
          </dl>
        </div>
        <table className="w-full mt-8">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3">{inv.plan} plan, {inv.billing_cycle}{inv.kind === 'proration' ? ' (difference for upgrading)' : ''}<br />
                <span className="text-slate-500">{day(inv.period_start)} – {day(inv.period_end)}</span></td>
              <td className="py-3 text-right">{money(inv.subtotal, inv.currency)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td className="pt-3 text-right text-slate-500">Subtotal</td><td className="pt-3 text-right">{money(inv.subtotal, inv.currency)}</td></tr>
            {(inv.tax_label || inv.tax_amount > 0) && <tr><td className="text-right text-slate-500">{inv.tax_label} {inv.tax_rate}%</td><td className="text-right">{money(inv.tax_amount, inv.currency)}</td></tr>}
            <tr><td className="pt-2 text-right font-bold">Total</td><td className="pt-2 text-right text-lg font-bold">{money(inv.total, inv.currency)}</td></tr>
          </tfoot>
        </table>
        {inv.tax_note && <p className="mt-4 text-xs text-slate-600">{inv.tax_note}</p>}
        {inv.status !== 'paid' && payment.bank_details && (
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs">
            <p className="font-semibold">Bank transfer</p>
            <pre className="whitespace-pre-wrap font-sans text-slate-600">{payment.bank_details}</pre>
            <p className="text-slate-500 mt-1">Reference: {inv.number}</p>
          </div>
        )}
        {inv.status === 'paid' && <p className="mt-6 text-xs text-slate-600">Paid by {inv.paid_via.replace('_', ' ')}{inv.payment_reference ? ` (ref. ${inv.payment_reference})` : ''}. Thank you.</p>}
      </article>
    </div>
  );
}
