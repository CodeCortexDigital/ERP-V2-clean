import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditCard, FileText, Loader2, Wallet } from 'lucide-react';
import billingService, { type FamilyAccount, type Statement } from '@/services/billing.service';
import { StatementView } from '@/pages/education/finance/FamilyBillingPage';
import { formatMoney } from '@/utils/currency';
import { Modal } from '@/components/ui/Modal';

/** Parent / student portal: family balance, statement and "Pay online" for open invoices. */
export default function FamilyBillingCard() {
  const [accounts, setAccounts] = useState<FamilyAccount[] | null>(null);
  const [providers, setProviders] = useState<Array<{ code: string; label: string }>>([]);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [paying, setPaying] = useState('');
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    billingService.myAccounts().then(setAccounts).catch(() => setAccounts([]));
    billingService.providers().then(setProviders).catch(() => setProviders([]));
  }, []);

  // Coming back from the payment page.
  useEffect(() => {
    const result = params.get('payment');
    if (!result) return;
    if (result === 'success') toast.success('Thank you. Your payment was received and will show here in a moment.');
    else toast.message('The payment was cancelled. Nothing was charged.');
    params.delete('payment');
    setParams(params, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!accounts || accounts.length === 0) return null;

  const open = async (a: FamilyAccount) => {
    try {
      setStatement(await billingService.statement(a.type, a.id));
    } catch {
      toast.error('Could not load the statement.');
    }
  };

  const pay = async (invoiceId: string, provider: string) => {
    setPaying(invoiceId);
    try {
      const { checkout_url } = await billingService.startOnlinePayment(invoiceId, provider);
      window.location.assign(checkout_url);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Online payment is not available right now.');
      setPaying('');
    }
  };

  const openInvoices = statement?.lines.filter((l) => l.type === 'invoice' && (l.open_amount || 0) > 0) || [];

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <h2 className="font-bold inline-flex items-center gap-2"><Wallet className="w-4 h-4 text-brand" /> Family account</h2>
      {accounts.map((a) => (
        <div key={`${a.type}-${a.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <div>
            <p className="font-semibold">{a.name}</p>
            <p className="text-sm text-slate-600">
              Due now: <strong className={a.outstanding > 0 ? 'text-rose-700' : ''}>{formatMoney(a.outstanding)}</strong>
              {a.credit > 0 && <> · Credit: <strong className="text-emerald-700">{formatMoney(a.credit)}</strong></>}
            </p>
          </div>
          <button onClick={() => open(a)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold">
            <FileText className="w-4 h-4" /> Statement{providers.length && a.outstanding > 0 ? ' & pay' : ''}
          </button>
        </div>
      ))}

      {statement && (
        <Modal open onClose={() => setStatement(null)} title={`Statement: ${statement.account.name}`} size="xl">
          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {openInvoices.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="font-bold text-sm mb-2">Open invoices</p>
                <ul className="divide-y divide-slate-100 text-sm">
                  {openInvoices.map((l) => (
                    <li key={l.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <span>{l.student} · {l.description}<span className="block text-xs text-slate-500">{l.ref}{l.due_date ? ` · due ${new Date(l.due_date).toLocaleDateString()}` : ''}</span></span>
                      <span className="flex items-center gap-2">
                        <strong>{formatMoney(l.open_amount || 0)}</strong>
                        {providers.map((p) => (
                          <button key={p.code} disabled={paying === l.id} onClick={() => pay(l.id, p.code)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-60">
                            {paying === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                            Pay{providers.length > 1 ? ` with ${p.label.split(' ')[0]}` : ' online'}
                          </button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                {providers.length === 0 && <p className="text-xs text-slate-500 mt-2">Online payment is not switched on at this school. Please pay at the school office.</p>}
              </div>
            )}
            <StatementView st={statement} />
          </div>
        </Modal>
      )}
    </section>
  );
}
