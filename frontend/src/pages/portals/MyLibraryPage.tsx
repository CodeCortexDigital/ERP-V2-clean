import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookMarked, BookOpen, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import library, { Book, errorText, MemberDetail } from '@/services/library.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const fmt = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Portal library (students, parents for each child, staff): search the catalogue, reserve, see and renew loans. */
export default function MyLibraryPage() {
  const [cards, setCards] = useState<MemberDetail[] | null>(null);
  const [who, setWho] = useState('');
  const [params] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') || '');
  const [available, setAvailable] = useState(false);
  const [books, setBooks] = useState<Book[] | null>(null);

  const loadMine = () => library.mine().then((r) => { setCards(r.members); setWho((w) => w || r.members[0]?.id || ''); }).catch(() => setCards([]));
  useEffect(() => { loadMine(); }, []);
  useEffect(() => {
    const t = setTimeout(() => library.books({ q, available }).then((r) => setBooks(r.results)).catch(() => setBooks([])), 250);
    return () => clearTimeout(t);
  }, [q, available]);

  const me = cards?.find((c) => c.id === who) || null;
  const reserve = async (b: Book) => {
    if (!me) return;
    try {
      const r = await library.reserve({ book_id: b.id, ...(me.student_id ? { student_id: me.student_id } : {}) });
      toast.success(r.status === 'ready' ? `Ready to collect from the library (kept until ${fmt(r.hold_until)}).` : `Reserved. ${me.name} is number ${r.position} in the queue.`);
      loadMine();
    } catch (e) { toast.error(errorText(e, 'Could not reserve this book.')); }
  };
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.success(ok); loadMine(); } catch (e) { toast.error(errorText(e, 'That did not work.')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 mr-auto"><BookOpen size={18} className="text-blue-600" /> Library</h1>
        {cards && cards.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a child">
            {cards.map((c) => (
              <button key={c.id} onClick={() => setWho(c.id!)} aria-pressed={who === c.id}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${who === c.id ? 'bg-blue-600 text-white border-transparent' : 'bg-white border-slate-200 text-slate-700'}`}>{c.name}</button>
            ))}
          </div>
        )}
      </div>

      {!cards ? <Loader2 className="animate-spin text-slate-400" /> : !me ? <p className="text-sm text-slate-500">No library card is linked to this account yet.</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <section className={card}>
            <h2 className="font-black text-slate-900 flex items-center gap-2 mb-2"><BookMarked size={15} /> {me.name}'s books <span className="text-xs font-semibold text-slate-400">card {me.card_number}</span></h2>
            {me.is_blocked && <p className="text-sm font-semibold text-rose-700 mb-2">Borrowing is paused{me.blocked_reason ? `: ${me.blocked_reason}` : ''}. Please see the librarian.</p>}
            {me.current.length === 0 ? <p className="text-sm text-slate-500">No books on loan.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {me.current.map((l) => (
                  <li key={l.id} className="py-2 flex flex-wrap items-center gap-2">
                    <span className="mr-auto"><b>{l.title}</b>{l.authors ? <span className="text-slate-400"> · {l.authors}</span> : null}</span>
                    <span className={`text-xs font-bold ${l.overdue ? 'text-rose-600' : 'text-slate-500'}`}>{l.overdue ? `Overdue since ${fmt(l.due_date)}` : `Due ${fmt(l.due_date)}`}</span>
                    {!l.overdue && <button onClick={() => act(() => library.renew(l.id), 'Renewed.')} className="text-xs font-bold text-blue-600">Renew</button>}
                  </li>
                ))}
              </ul>
            )}
            {me.fines_due > 0 && <p className="text-xs font-semibold text-amber-800 mt-2">A library fine is waiting to be paid at the library.</p>}
          </section>
          <section className={card}>
            <h2 className="font-black text-slate-900 mb-2">Reservations</h2>
            {me.reservations.length === 0 ? <p className="text-sm text-slate-500">None. Reserve a book below and you'll be told when it's ready.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {me.reservations.map((r) => (
                  <li key={r.id} className="py-2 flex flex-wrap items-center gap-2">
                    <span className="mr-auto font-semibold">{r.title}</span>
                    <span className={`text-xs font-bold ${r.status === 'ready' ? 'text-emerald-700' : 'text-slate-500'}`}>{r.status === 'ready' ? `Ready to collect until ${fmt(r.hold_until)}` : `Number ${r.position} in the queue`}</span>
                    <button onClick={() => act(() => library.cancelReservation(r.id), 'Reservation cancelled.')} className="text-xs font-bold text-rose-600">Cancel</button>
                  </li>
                ))}
              </ul>
            )}
            {me.history.length > 0 && <p className="text-xs text-slate-500 mt-3">Read before: {me.history.slice(0, 8).map((l) => l.title).join(', ')}</p>}
          </section>
        </div>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="font-black text-slate-900 mr-auto">Find a book</h2>
          <label className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> On the shelf now</label>
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input aria-label="Search books" className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-sm" placeholder="Title, author or subject" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {!books ? <Loader2 className="animate-spin text-slate-400" /> : books.length === 0 ? <p className="text-sm text-slate-500">No books found.</p> : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {books.map((b) => (
              <li key={b.id} className="rounded-lg border border-slate-100 p-3 text-sm flex items-start gap-2">
                <div className="min-w-0 mr-auto">
                  <p className="font-semibold text-slate-800">{b.title}</p>
                  <p className="text-xs text-slate-500">{[b.authors, b.subject, b.reading_level].filter(Boolean).join(' · ')}</p>
                  <p className={`text-xs font-bold mt-1 ${b.available ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {b.available ? `${b.available} on the shelf` : `All ${b.copies} out${b.waiting ? ` · ${b.waiting} waiting` : ''}`}
                  </p>
                </div>
                {me && b.copies > 0 && <button onClick={() => reserve(b)} className="shrink-0 px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 text-xs font-bold">Reserve</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
