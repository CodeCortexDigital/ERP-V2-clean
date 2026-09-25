import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Gift, Loader2, Mail, Printer, RefreshCw, Search, Undo2, Users, Wallet } from 'lucide-react';
import billingService, {
  PAYMENT_METHODS, REFUND_METHODS, type AccountKind, type FamilyAccount, type Statement, type StatementLine,
} from '@/services/billing.service';
import { formatMoney } from '@/utils/currency';
import { Modal } from '@/components/ui/Modal';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';
const errorOf = (err: any, fallback: string) => err?.response?.data?.error || fallback;

/** Family accounts: balances, statements, family payments, credit and refunds. */
export default function FamilyBillingPage() {
  const [rows, setRows] = useState<FamilyAccount[]>([]);
  const [totals, setTotals] = useState({ total_outstanding: 0, total_credit: 0 });
  const [search, setSearch] = useState('');
  const [owing, setOwing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ kind: AccountKind; id: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await billingService.accounts({ search: search.trim(), owing });
      setRows(data.results);
      setTotals({ total_outstanding: data.total_outstanding, total_credit: data.total_credit });
    } catch {
      toast.error('Could not load family accounts.');
    } finally {
      setLoading(false);
    }
  }, [search, owing]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4 p-4 max-w-7xl mx-auto text-slate-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Family accounts</h1>
          <p className="text-sm text-slate-500">One account per household: all children's invoices, payments, credit and refunds together.</p>
        </div>
        <div className="flex gap-3">
          <div className={`${card} px-4 py-2`}><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold">{formatMoney(totals.total_outstanding)}</p></div>
          <div className={`${card} px-4 py-2`}><p className="text-xs text-slate-500">Credit held</p><p className="font-bold text-emerald-700">{formatMoney(totals.total_credit)}</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${input} pl-9`} placeholder="Search family or student" aria-label="Search families" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={owing} onChange={(e) => setOwing(e.target.checked)} className="w-4 h-4" /> Only families who owe</label>
        <button onClick={load} className="p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200" aria-label="Reload"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className={`${card} overflow-hidden`}>
        {loading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
          : rows.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">{owing ? 'No family owes anything right now.' : 'No families found.'}</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="text-left px-4 py-2">Family</th><th className="text-left px-4 py-2">Students</th><th className="text-right px-4 py-2">Outstanding</th><th className="text-right px-4 py-2">Credit</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={`${r.type}-${r.id}`} onClick={() => setOpen({ kind: r.type, id: r.id })} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold"><span className="inline-flex items-center gap-2">{r.type === 'household' ? <Users className="w-4 h-4 text-slate-400" /> : null}{r.name}</span></td>
                    <td className="px-4 py-2.5 text-slate-600">{r.students.join(', ')}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${r.outstanding > 0 ? 'text-rose-700' : ''}`}>{formatMoney(r.outstanding)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{r.credit ? formatMoney(r.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {open && <StatementDrawer kind={open.kind} id={open.id} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

export function StatementView({ st, onRefund }: { st: Statement; onRefund?: (line: StatementLine) => void }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Due now</p><p className="text-lg font-bold">{formatMoney(st.outstanding)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Credit available</p><p className="text-lg font-bold text-emerald-700">{formatMoney(st.credit_available)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Account balance</p><p className="text-lg font-bold">{formatMoney(st.closing_balance)}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Billed to</p><p className="font-semibold truncate">{st.billing_contacts.map((c) => c.name).join(', ') || '—'}</p></div>
      </div>
      <p className="text-xs text-slate-500">Students: {st.students.map((s) => `${s.full_name}${s.class_name ? ` (${s.class_name})` : ''}`).join(', ')}</p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Details</th><th className="text-right px-3 py-2">Charges</th><th className="text-right px-3 py-2">Payments / credit</th><th className="text-right px-3 py-2">Balance</th>{onRefund && <th />}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {st.opening_balance !== 0 && (
              <tr><td className="px-3 py-2" /><td className="px-3 py-2 italic">Balance brought forward</td><td /><td /><td className="px-3 py-2 text-right">{formatMoney(st.opening_balance)}</td>{onRefund && <td />}</tr>
            )}
            {st.lines.map((l) => (
              <tr key={`${l.type}-${l.id}`}>
                <td className="px-3 py-2 whitespace-nowrap">{l.date ? new Date(l.date).toLocaleDateString() : ''}</td>
                <td className="px-3 py-2">
                  {l.description}
                  <span className="block text-xs text-slate-500">{[l.student, l.ref, l.type === 'invoice' && l.status ? l.status : ''].filter(Boolean).join(' · ')}</span>
                </td>
                <td className="px-3 py-2 text-right">{l.amount > 0 ? formatMoney(l.amount) : ''}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{l.amount < 0 ? formatMoney(-l.amount) : ''}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(l.balance)}</td>
                {onRefund && (
                  <td className="px-2 py-2 text-right">
                    {l.type === 'payment' && (l.refundable || 0) > 0 && (
                      <button onClick={() => onRefund(l)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-rose-700" aria-label={`Refund ${l.ref}`}>
                        <Undo2 className="w-3.5 h-3.5" /> Refund
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {st.lines.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Nothing on this account yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementDrawer({ kind, id, onClose }: { kind: AccountKind; id: string; onClose: () => void }) {
  const [st, setSt] = useState<Statement | null>(null);
  const [range, setRange] = useState({ from: '', to: '' });
  const [pay, setPay] = useState<{ amount: string; method: string; reference: string; note: string } | null>(null);
  const [credit, setCredit] = useState<{ amount: string; note: string } | null>(null);
  const [refund, setRefund] = useState<{ line: StatementLine; amount: string; method: string; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setSt(await billingService.statement(kind, id, range.from, range.to)), [kind, id, range]);
  useEffect(() => { load().catch(() => toast.error('Could not load the statement.')); }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
      return true;
    } catch (err: any) {
      toast.error(errorOf(err, 'That did not work.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    if (!st) return;
    const w = window.open('', '_blank');
    if (!w) return toast.error('Allow pop-ups to print the statement.');
    const rows = st.lines.map((l) => `<tr><td>${l.date ? new Date(l.date).toLocaleDateString() : ''}</td><td>${l.description}<br><small>${[l.student, l.ref].filter(Boolean).join(' · ')}</small></td><td align="right">${l.amount > 0 ? formatMoney(l.amount) : ''}</td><td align="right">${l.amount < 0 ? formatMoney(-l.amount) : ''}</td><td align="right"><b>${formatMoney(l.balance)}</b></td></tr>`).join('');
    w.document.write(`<html><head><title>Statement ${st.account.name}</title><style>body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left}h1{margin:0}</style></head><body>
      <h1>Account statement</h1><p><b>${st.account.name}</b><br>${st.account.address || ''}<br>Billed to: ${st.billing_contacts.map((c) => c.name).join(', ') || '—'}<br>Students: ${st.students.map((s) => s.full_name).join(', ')}</p>
      <p>Due now: <b>${formatMoney(st.outstanding)}</b> · Credit available: ${formatMoney(st.credit_available)} · Generated ${new Date(st.generated_at).toLocaleString()}</p>
      <table><thead><tr><th>Date</th><th>Details</th><th>Charges</th><th>Payments / credit</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:16px"><b>Balance: ${formatMoney(st.closing_balance)}</b></p><script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <Modal open onClose={onClose} title={st ? `Statement: ${st.account.name}` : 'Statement'} size="xl">
      {!st ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : (
        <div className="space-y-4 max-h-[74vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2 items-end">
            <button onClick={() => setPay({ amount: st.outstanding ? String(st.outstanding) : '', method: 'cash', reference: '', note: '' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white text-sm font-semibold"><Banknote className="w-4 h-4" /> Record payment</button>
            <button disabled={busy || st.credit_available <= 0 || st.outstanding <= 0} onClick={() => run(() => billingService.applyCredit(kind, id), 'Credit applied to open invoices')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40"><Wallet className="w-4 h-4" /> Apply credit</button>
            <button onClick={() => setCredit({ amount: '', note: '' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Gift className="w-4 h-4" /> Give credit</button>
            <button disabled={busy} onClick={() => run(async () => { const r = await billingService.emailStatement(kind, id); toast.message(`Sent to ${r.sent_to.join(', ')}`); }, 'Statement emailed')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Mail className="w-4 h-4" /> Email statement</button>
            <button onClick={print} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"><Printer className="w-4 h-4" /> Print</button>
            <div className="ml-auto flex gap-2 items-end text-xs">
              <div><label className={lbl} htmlFor="st-from">From</label><input id="st-from" type="date" className={input} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
              <div><label className={lbl} htmlFor="st-to">To</label><input id="st-to" type="date" className={input} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
            </div>
          </div>

          {pay && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              <p className="font-bold text-sm">Record a family payment</p>
              <p className="text-xs text-slate-500">It pays the oldest invoices first, across all the children. Anything extra is kept as credit.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div><label className={lbl} htmlFor="fp-amt">Amount</label><input id="fp-amt" type="number" min="0" step="0.01" className={input} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
                <div><label className={lbl} htmlFor="fp-m">Method</label><select id="fp-m" className={input} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                <div><label className={lbl} htmlFor="fp-ref">Reference</label><input id="fp-ref" className={input} placeholder="Cheque or transfer no." value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></div>
                <div><label className={lbl} htmlFor="fp-note">Note</label><input id="fp-note" className={input} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await billingService.recordPayment(kind, id, pay);
                    toast.success(`Paid ${r.allocated.length} invoice(s)${r.credit_added ? `; ${formatMoney(r.credit_added)} kept as credit` : ''}`);
                    setSt(r.statement);
                    setPay(null);
                  } catch (err: any) { toast.error(errorOf(err, 'Could not record the payment.')); } finally { setBusy(false); }
                }} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Save payment</button>
                <button onClick={() => setPay(null)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}

          {credit && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
              <p className="font-bold text-sm">Give account credit</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div><label className={lbl} htmlFor="gc-amt">Amount</label><input id="gc-amt" type="number" min="0" step="0.01" className={input} value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className={lbl} htmlFor="gc-note">Reason</label><input id="gc-note" className={input} placeholder="For example: sibling discount, fee waiver" value={credit.note} onChange={(e) => setCredit({ ...credit, note: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <button disabled={busy} onClick={async () => { if (await run(() => billingService.giveCredit(kind, id, credit.amount, credit.note), 'Credit added')) setCredit(null); }} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">Add credit</button>
                <button onClick={() => setCredit(null)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}

          {refund && (
            <div className="rounded-xl border border-rose-200 p-4 space-y-3 bg-rose-50/50">
              <p className="font-bold text-sm">Refund {refund.line.description.toLowerCase()} ({refund.line.ref})</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div><label className={lbl} htmlFor="rf-amt">Amount (up to {formatMoney(refund.line.refundable || 0)})</label><input id="rf-amt" type="number" min="0" step="0.01" className={input} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} /></div>
                <div><label className={lbl} htmlFor="rf-m">How</label><select id="rf-m" className={input} value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })}>{REFUND_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                <div><label className={lbl} htmlFor="rf-r">Reason</label><input id="rf-r" className={input} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} /></div>
              </div>
              <p className="text-xs text-slate-600">The invoice is reopened by the refunded amount. Card payments are refunded through Stripe automatically.</p>
              <div className="flex gap-2">
                <button disabled={busy} onClick={async () => { if (await run(() => billingService.refund(refund.line.id, { amount: refund.amount, method: refund.method, reason: refund.reason }), 'Refund recorded')) setRefund(null); }} className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold">Refund</button>
                <button onClick={() => setRefund(null)} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          )}

          <StatementView st={st} onRefund={(line) => setRefund({ line, amount: String(line.refundable || ''), method: 'original', reason: '' })} />
        </div>
      )}
    </Modal>
  );
}
