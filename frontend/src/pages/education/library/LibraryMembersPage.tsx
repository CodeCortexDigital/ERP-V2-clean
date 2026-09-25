import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Loader2, Printer, Search } from 'lucide-react';
import { toast } from 'sonner';
import library, { errorText, MemberBrief, MemberDetail } from '@/services/library.service';
import { Modal } from '@/components/ui/Modal';
import { formatMoney } from '@/utils/currency';

const fmt = (d?: string | null) => (d ? new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function MemberRecord({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [m, setM] = useState<MemberDetail | null>(null);
  const [reason, setReason] = useState('');
  useEffect(() => { library.member(id).then((x) => { setM(x); setReason(x.blocked_reason || ''); }).catch(() => toast.error('Could not load the member.')); }, [id]);
  if (!m) return <Loader2 className="animate-spin text-slate-400" />;
  const block = async (is_blocked: boolean) => {
    try { setM(await library.updateMember(id, { is_blocked, blocked_reason: reason })); toast.success(is_blocked ? 'Borrowing blocked.' : 'Borrowing allowed again.'); onChanged(); }
    catch (e) { toast.error(errorText(e, 'Could not save.')); }
  };
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="inline-flex items-center gap-1 text-slate-600"><CreditCard size={14} /> {m.card_number}</span>
        <span className="text-slate-500">· {m.detail}</span>
        <span className="ml-auto" />
        <Link to={`/education/library/labels?members=${m.id}`} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Printer size={12} /> Print card</Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['On loan', m.loans_out], ['Overdue', m.overdue], ['Fines to pay', formatMoney(m.fines_due)]].map(([k, v]) => (
          <div key={String(k)} className="rounded-lg bg-slate-50 py-2"><p className="text-[10px] font-black uppercase text-slate-400">{k}</p><p className="font-bold">{v}</p></div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-100 p-3">
        <p className="font-semibold mb-2">{m.is_blocked ? 'Borrowing is blocked' : 'Can borrow'}</p>
        <div className="flex gap-2">
          <input aria-label="Reason" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" placeholder="Reason (shown at the desk)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {m.is_blocked
            ? <button onClick={() => block(false)} className="px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold">Allow borrowing</button>
            : <button onClick={() => block(true)} className="px-3 rounded-lg bg-rose-600 text-white text-xs font-bold">Block borrowing</button>}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">On loan</h4>
        {m.current.length === 0 ? <p className="text-slate-500">Nothing.</p> : m.current.map((l) => (
          <p key={l.id}>{l.title} <span className={l.overdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>· due {fmt(l.due_date)}</span></p>
        ))}
      </div>
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">History</h4>
        {m.history.length === 0 ? <p className="text-slate-500">No past loans.</p> : (
          <table className="w-full"><tbody className="divide-y divide-slate-100">
            {m.history.map((l) => <tr key={l.id}><td className="py-1">{l.title}</td><td className="text-slate-500">{fmt(l.issued_at)} → {fmt(l.returned_at)}</td><td>{l.fine_amount ? `${formatMoney(l.fine_amount)} (${l.fine_status})` : ''}</td></tr>)}
          </tbody></table>
        )}
      </div>
    </div>
  );
}

/** Office: library members (students and staff). Borrowers with books out are listed; search finds anyone. */
export default function LibraryMembersPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<MemberBrief[] | null>(null);
  const [open, setOpen] = useState<MemberBrief | null>(null);
  const load = () => library.members(q).then((r) => setRows(r.results)).catch(() => setRows([]));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRow = async (m: MemberBrief) => {
    if (m.id) return setOpen(m);
    try { const card = await library.makeCard(m.kind, m.ref_id!); toast.success(`Card ${card.card_number} made for ${card.name}.`); setOpen(card); load(); }
    catch (e) { toast.error(errorText(e, 'Could not make a card.')); }
  };
  const cardIds = (rows || []).filter((r) => r.id).map((r) => r.id).join(',');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input aria-label="Search members" className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm" placeholder="Name, student number or card number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {cardIds && <Link to={`/education/library/labels?members=${cardIds}`} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"><Printer size={14} /> Print these cards</Link>}
      </div>
      <p className="text-xs text-slate-500">{q ? 'Students and staff who match.' : 'Members with books on loan. Search to find anyone else.'}</p>
      {!rows ? <Loader2 className="animate-spin text-slate-400" /> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 px-3">Name</th><th>Class / role</th><th>Card</th><th>On loan</th><th>Overdue</th><th>Fines</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={`${m.kind}-${m.id || m.ref_id}`} className="hover:bg-slate-50 cursor-pointer" onClick={() => openRow(m)}>
                  <td className="py-2 px-3 font-semibold">{m.name}{m.is_blocked && <span className="ml-2 rounded-full bg-rose-100 text-rose-700 px-1.5 text-[10px] font-black uppercase">Blocked</span>}</td>
                  <td>{m.detail}</td><td className="text-xs">{m.card_number || <span className="text-blue-600 font-bold">Make a card</span>}</td>
                  <td>{m.loans_out}</td><td className={m.overdue ? 'text-rose-600 font-bold' : ''}>{m.overdue}</td><td>{m.fines_due ? formatMoney(m.fines_due) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">{q ? 'Nobody matches.' : 'No books are on loan right now.'}</p>}
        </div>
      )}
      {open?.id && <Modal open onClose={() => setOpen(null)} title={open.name} size="lg"><MemberRecord id={open.id} onChanged={load} /></Modal>}
    </div>
  );
}
