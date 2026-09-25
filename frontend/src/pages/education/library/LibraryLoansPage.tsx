import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import library, { errorText, Loan, Reservation } from '@/services/library.service';
import { formatMoney } from '@/utils/currency';

const TABS: Array<[string, string]> = [['active', 'On loan'], ['overdue', 'Overdue'], ['fines', 'Fines to settle'], ['returned', 'Returned'], ['reservations', 'Reservations']];
const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Office: every loan (on loan, overdue, fines, returned) and the reservation queue. */
export default function LibraryLoansPage() {
  const [tab, setTab] = useState('overdue');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Loan[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [res, setRes] = useState<Reservation[] | null>(null);

  const load = () => {
    if (tab === 'reservations') { library.reservations().then(setRes).catch(() => setRes([])); return; }
    library.loans(tab, q).then((r) => { setRows(r.results); setCounts(r.counts); }).catch(() => setRows([]));
  };
  useEffect(() => { setRows(null); const t = setTimeout(load, 200); return () => clearTimeout(t); }, [tab, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(errorText(e, 'That did not work.')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tab === k ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>
            {label}{counts[k] != null ? ` ${counts[k]}` : ''}
          </button>
        ))}
        {tab !== 'reservations' && (
          <div className="relative ml-auto w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input aria-label="Search loans" className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-sm" placeholder="Title, barcode or borrower" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </div>

      {tab === 'reservations' ? (
        !res ? <Loader2 className="animate-spin text-slate-400" /> : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 px-3">Book</th><th>For</th><th>Status</th><th>Held until</th><th>Reserved</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {res.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3 font-semibold">{r.title}</td><td>{r.member.name}</td>
                    <td>{r.status === 'ready' ? <span className="font-bold text-amber-700">Ready · copy {r.barcode}</span> : `#${r.position} in the queue`}</td>
                    <td>{fmt(r.hold_until)}</td><td>{fmt(r.created_at)}</td>
                    <td className="text-right pr-3"><button onClick={() => act(() => library.cancelReservation(r.id), 'Reservation cancelled.')} className="text-xs font-bold text-rose-600">Cancel</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {res.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No reservations.</p>}
          </div>
        )
      ) : !rows ? <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-2 px-3">Book</th><th>Borrower</th><th>Issued</th><th>Due</th><th>{tab === 'returned' ? 'Returned' : 'Status'}</th><th>Fine</th><th />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 px-3"><span className="font-semibold">{l.title}</span> <span className="text-xs text-slate-400 font-mono">{l.barcode}</span></td>
                  <td>{l.member.name} <span className="text-xs text-slate-400">{l.member.card_number}</span></td>
                  <td>{fmt(l.issued_at)}</td><td>{fmt(l.due_date)}</td>
                  <td>{l.returned_at ? fmt(l.returned_at) : l.overdue ? <span className="text-rose-600 font-bold">{l.days_overdue} day(s) overdue</span> : `renewed ${l.renewals}×`}</td>
                  <td>{l.fine_amount ? `${formatMoney(l.fine_amount)} · ${l.fine_status}` : '—'}</td>
                  <td className="text-right pr-3 whitespace-nowrap space-x-2">
                    {!l.returned_at && <button onClick={() => act(() => library.renew(l.id), 'Renewed.')} className="text-xs font-bold text-blue-600">Renew</button>}
                    {!l.returned_at && <button onClick={() => act(() => library.returnBook(l.barcode), 'Returned.')} className="text-xs font-bold text-emerald-700">Return</button>}
                    {!l.returned_at && <button onClick={() => window.confirm(`Mark "${l.title}" as lost?`) && act(() => library.markLost(l.id), 'Marked lost.')} className="text-xs font-bold text-rose-600">Lost</button>}
                    {l.fine_status === 'due' && <button onClick={() => act(() => library.settleFine(l.id, 'paid'), 'Fine paid.')} className="text-xs font-bold text-emerald-700">Paid</button>}
                    {l.fine_status === 'due' && <button onClick={() => act(() => library.settleFine(l.id, 'waived'), 'Fine waived.')} className="text-xs font-bold text-slate-600">Waive</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Nothing here.</p>}
        </div>
      )}
    </div>
  );
}
