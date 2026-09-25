import { useRef, useState } from 'react';
import { AlertTriangle, BookDown, BookUp, CreditCard, Loader2, RotateCcw, ScanLine, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import library, { errorText, Loan, MemberBrief, MemberDetail } from '@/services/library.service';
import { formatMoney } from '@/utils/currency';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const fmt = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });
type Returned = Awaited<ReturnType<typeof library.returnBook>> & { at: string };

/** The library desk: find the borrower (scan a card or type a name), scan books out, scan books back in. */
export default function LibraryDeskPage() {
  const [who, setWho] = useState('');
  const [matches, setMatches] = useState<MemberBrief[]>([]);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [outCode, setOutCode] = useState('');
  const [inCode, setInCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [returns, setReturns] = useState<Returned[]>([]);
  const outRef = useRef<HTMLInputElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  const open = async (m: MemberBrief) => {
    try {
      const id = m.id || (await library.makeCard(m.kind, m.ref_id!)).id!;
      setMember(await library.member(id));
      setMatches([]);
      setWho('');
      setTimeout(() => outRef.current?.focus(), 50);
    } catch (e) { toast.error(errorText(e, 'Could not open this member.')); }
  };
  const find = async () => {
    if (!who.trim()) return;
    try {
      const r = await library.members(who.trim());
      if (r.exact || r.results.length === 1) return open(r.results[0]);
      setMatches(r.results);
      if (!r.results.length) toast.message('Nobody matches. Try a student number, card number or part of the name.');
    } catch (e) { toast.error(errorText(e, 'Search failed.')); }
  };
  const reload = async () => { if (member?.id) setMember(await library.member(member.id)); };

  const issue = async () => {
    if (!member?.id || !outCode.trim()) return;
    setBusy(true);
    try {
      const r = await library.issue(outCode.trim(), member.id);
      toast.success(`"${r.loan.title}" issued to ${member.name}, due ${fmt(r.loan.due_date)}.`);
      setOutCode('');
      await reload();
    } catch (e) { toast.error(errorText(e, 'Could not issue this book.')); }
    finally { setBusy(false); outRef.current?.focus(); }
  };
  const giveBack = async (code: string) => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await library.returnBook(code.trim());
      setReturns((list) => [{ ...r, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...list].slice(0, 12));
      if (r.hold_for) toast.message(`Put this book aside for ${r.hold_for.name}.`);
      else toast.success(`"${r.loan.title}" is back.`);
      setInCode('');
      if (member?.id === r.loan.member.id) await reload();
    } catch (e) { toast.error(errorText(e, 'Could not return this book.')); }
    finally { setBusy(false); inRef.current?.focus(); }
  };
  const renew = async (l: Loan) => {
    try { const r = await library.renew(l.id); toast.success(`Renewed until ${fmt(r.due_date)}.`); await reload(); }
    catch (e) { toast.error(errorText(e, 'Could not renew.')); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        <section className={card}>
          <h2 className="font-black text-slate-900 flex items-center gap-2 mb-3"><UserRound size={16} /> Borrower</h2>
          <div className="flex gap-2">
            <input className={input} autoFocus aria-label="Borrower" placeholder="Scan a library card, or type a name or student number"
              value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} />
            <button onClick={find} className="px-4 rounded-lg bg-slate-900 text-white text-sm font-bold">Find</button>
          </div>
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {matches.map((m) => (
                <li key={`${m.kind}-${m.id || m.ref_id}`}>
                  <button onClick={() => open(m)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-sm">
                    <span className="font-semibold mr-auto">{m.name} <span className="text-slate-400 font-normal">· {m.detail}{m.student_number ? ` · ${m.student_number}` : ''}</span></span>
                    {m.card_number ? <span className="text-xs text-slate-500">{m.card_number}</span> : <span className="text-xs text-blue-600 font-bold">Make a card</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {member && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="mr-auto">
                  <p className="text-lg font-black text-slate-900">{member.name}</p>
                  <p className="text-xs text-slate-500 inline-flex items-center gap-1"><CreditCard size={12} /> {member.card_number} · {member.detail}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5">{member.loans_out} out</span>
                  {member.overdue > 0 && <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5">{member.overdue} overdue</span>}
                  {member.fines_due > 0 && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">Fines {formatMoney(member.fines_due)}</span>}
                  {member.is_blocked && <span className="rounded-full bg-rose-600 text-white px-2 py-0.5">Blocked{member.blocked_reason ? `: ${member.blocked_reason}` : ''}</span>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <ScanLine size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input ref={outRef} className={`${input} pl-9`} aria-label="Book barcode to issue" placeholder="Scan the book's barcode to lend it"
                    value={outCode} onChange={(e) => setOutCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && issue()} />
                </div>
                <button onClick={issue} disabled={busy || !outCode.trim()} className="px-4 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
                  <BookUp size={15} /> Issue
                </button>
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mt-4 mb-1">On loan</h3>
              {member.current.length === 0 ? <p className="text-sm text-slate-500">Nothing on loan.</p> : (
                <ul className="divide-y divide-slate-200 text-sm">
                  {member.current.map((l) => (
                    <li key={l.id} className="py-2 flex flex-wrap items-center gap-2">
                      <span className="mr-auto"><b>{l.title}</b> <span className="text-slate-400">· {l.barcode}</span></span>
                      <span className={`text-xs font-bold ${l.overdue ? 'text-rose-600' : 'text-slate-500'}`}>{l.overdue ? `${l.days_overdue} day(s) overdue` : `due ${fmt(l.due_date)}`}</span>
                      <button onClick={() => renew(l)} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><RotateCcw size={12} /> Renew</button>
                      <button onClick={() => giveBack(l.barcode)} className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1"><BookDown size={12} /> Return</button>
                    </li>
                  ))}
                </ul>
              )}
              {member.reservations.length > 0 && (
                <p className="text-xs text-slate-600 mt-3">Reserved: {member.reservations.map((r) => `${r.title} (${r.status === 'ready' ? `ready, copy ${r.barcode}` : `#${r.position} in the queue`})`).join(' · ')}</p>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="xl:col-span-2 space-y-4">
        <section className={card}>
          <h2 className="font-black text-slate-900 flex items-center gap-2 mb-3"><BookDown size={16} /> Returns</h2>
          <div className="flex gap-2">
            <input ref={inRef} className={input} aria-label="Book barcode to return" placeholder="Scan a returned book"
              value={inCode} onChange={(e) => setInCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && giveBack(inCode)} />
            <button onClick={() => giveBack(inCode)} disabled={busy || !inCode.trim()} className="px-4 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : 'Return'}
            </button>
          </div>
          {returns.length === 0 ? <p className="text-xs text-slate-400 mt-3">Books returned at this desk show here.</p> : (
            <ul className="mt-3 space-y-2">
              {returns.map((r, i) => (
                <li key={i} className={`rounded-lg border p-3 text-sm ${r.hold_for ? 'border-amber-300 bg-amber-50' : 'border-slate-100'}`}>
                  <p className="font-semibold">{r.loan.title} <span className="text-slate-400 font-normal">· {r.loan.barcode} · {r.at}</span></p>
                  <p className="text-xs text-slate-600">From {r.loan.member.name}{r.days_late ? ` · ${r.days_late} day(s) late` : ''}{r.fine ? ` · fine ${formatMoney(r.fine)}` : ''}</p>
                  {r.hold_for && <p className="text-xs font-bold text-amber-800 mt-1 inline-flex items-center gap-1"><AlertTriangle size={12} /> Put aside for {r.hold_for.name} until {fmt(r.hold_for.until)}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
