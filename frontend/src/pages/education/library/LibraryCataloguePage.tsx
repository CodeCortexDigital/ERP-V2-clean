import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookPlus, Loader2, Printer, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import library, { Book, errorText } from '@/services/library.service';
import { Modal } from '@/components/ui/Modal';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const FIELDS: Array<[keyof Book, string]> = [
  ['title', 'Title'], ['authors', 'Author(s)'], ['isbn', 'ISBN'], ['subject', 'Subject'], ['call_number', 'Shelf mark'],
  ['publisher', 'Publisher'], ['year', 'Year'], ['edition', 'Edition'], ['language', 'Language'], ['reading_level', 'Reading level'],
];
const STATUS_TONE: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700', on_loan: 'bg-blue-100 text-blue-700', on_hold: 'bg-amber-100 text-amber-800',
  lost: 'bg-rose-100 text-rose-700', damaged: 'bg-rose-100 text-rose-700', withdrawn: 'bg-slate-100 text-slate-500',
};

function BookForm({ book, onSaved }: { book?: Book; onSaved: (b: Book) => void }) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(([f]) => [f, String(book?.[f] ?? '')])));
  const [copies, setCopies] = useState('1');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...v, year: v.year ? Number(v.year) : null } as Partial<Book>;
      onSaved(book ? await library.updateBook(book.id, body) : await library.addBook({ ...body, copies: Number(copies) || 0, location }));
      toast.success(book ? 'Book updated.' : 'Book added.');
    } catch (e) { toast.error(errorText(e, 'Could not save the book.')); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map(([f, label]) => (
          <label key={f} className={`text-xs font-semibold text-slate-600 ${f === 'title' ? 'sm:col-span-2' : ''}`}>{label}
            <input className={`${input} mt-1`} value={v[f]} onChange={(e) => setV({ ...v, [f]: e.target.value })} />
          </label>
        ))}
        {!book && (
          <>
            <label className="text-xs font-semibold text-slate-600">Number of copies
              <input type="number" min={0} max={200} className={`${input} mt-1`} value={copies} onChange={(e) => setCopies(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Shelf / location
              <input className={`${input} mt-1`} value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
          </>
        )}
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={busy || !v.title.trim()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}

function BookDetail({ id, onChanged, onRemoved }: { id: string; onChanged: () => void; onRemoved: () => void }) {
  const [b, setB] = useState<Book | null>(null);
  const [more, setMore] = useState('1');
  const [editing, setEditing] = useState(false);
  const load = () => library.book(id).then(setB).catch(() => toast.error('Could not load the book.'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!b) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  if (editing) return <BookForm book={b} onSaved={() => { setEditing(false); load(); onChanged(); }} />;

  const addCopies = async () => {
    try { const r = await library.addCopies(b.id, { count: Number(more) || 1 }); toast.success(`Added ${r.barcodes.join(', ')}.`); load(); onChanged(); }
    catch (e) { toast.error(errorText(e, 'Could not add copies.')); }
  };
  const setStatus = async (copyId: string, status: string) => {
    try { await library.updateCopy(copyId, { status }); load(); onChanged(); }
    catch (e) { toast.error(errorText(e, 'Could not change the copy.')); }
  };
  const remove = async () => {
    if (!window.confirm(`Remove "${b.title}" from the catalogue?`)) return;
    try { await library.removeBook(b.id); toast.success('Book removed.'); onRemoved(); }
    catch (e) { toast.error(errorText(e, 'Could not remove the book.')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="mr-auto">
          <p className="text-sm text-slate-600">{[b.authors, b.publisher, b.year, b.edition].filter(Boolean).join(' · ')}</p>
          <p className="text-xs text-slate-500">{[b.isbn && `ISBN ${b.isbn}`, b.subject, b.call_number && `Shelf ${b.call_number}`, b.reading_level].filter(Boolean).join(' · ')}</p>
          <p className="text-xs text-slate-500 mt-1">Borrowed {b.times_borrowed ?? 0} time(s) · {b.waiting} waiting</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs font-bold text-blue-600">Edit</button>
        <Link to={`/education/library/labels?book=${b.id}`} className="text-xs font-bold text-blue-600 inline-flex items-center gap-1"><Printer size={12} /> Print labels</Link>
        <button onClick={remove} aria-label="Remove book" className="text-rose-600"><Trash2 size={14} /></button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1">Barcode</th><th>Status</th><th>Borrower</th><th>Location</th><th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {(b.copy_list || []).map((c) => (
            <tr key={c.id}>
              <td className="py-2 font-mono text-xs">{c.barcode}</td>
              <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[c.status] || ''}`}>{c.status_label}</span></td>
              <td className="text-xs">{c.borrower ? <>{c.borrower} <span className={c.overdue ? 'text-rose-600 font-bold' : 'text-slate-400'}>· due {c.due_date}</span></> : '—'}</td>
              <td className="text-xs text-slate-500">{c.location || '—'}</td>
              <td className="text-right">
                {c.status !== 'on_loan' && (
                  <select aria-label={`Status of ${c.barcode}`} value="" onChange={(e) => e.target.value && setStatus(c.id, e.target.value)} className="rounded border border-slate-200 text-xs px-1 py-0.5">
                    <option value="">Change…</option>
                    {c.status !== 'available' && <option value="available">Back on the shelf</option>}
                    <option value="damaged">Damaged</option><option value="lost">Lost</option><option value="withdrawn">Withdraw</option>
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2">
        <input type="number" min={1} max={200} aria-label="Copies to add" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={more} onChange={(e) => setMore(e.target.value)} />
        <button onClick={addCopies} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold">Add copies</button>
      </div>
      {b.queue && b.queue.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Reservations</h4>
          <ol className="text-sm list-decimal pl-5">{b.queue.map((r) => <li key={r.id}>{r.member.name} — {r.status_label}{r.hold_until ? ` until ${r.hold_until}` : ''}</li>)}</ol>
        </div>
      )}
    </div>
  );
}

/** Office: the catalogue. Search, add books with numbered copies, change copies and print their labels. */
export default function LibraryCataloguePage() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(() => params.get('q') || '');
  const [subject, setSubject] = useState('');
  const [data, setData] = useState<{ results: Book[]; subjects: string[] } | null>(null);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => library.books({ q, subject }).then(setData).catch(() => setData({ results: [], subjects: [] }));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input className={`${input} pl-9`} aria-label="Search the catalogue" placeholder="Title, author, ISBN, shelf mark or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Subject" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>{data?.subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"><BookPlus size={15} /> Add book</button>
      </div>
      {!data ? <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading…</div> : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 px-3">Title</th><th>Author</th><th>Subject</th><th>Shelf</th><th>Copies</th><th>On shelf</th><th>Waiting</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(b.id)}>
                  <td className="py-2 px-3 font-semibold text-slate-800">{b.title}</td><td>{b.authors}</td><td>{b.subject}</td>
                  <td className="text-xs">{b.call_number}</td><td>{b.copies}</td>
                  <td className={b.available ? 'text-emerald-700 font-bold' : 'text-slate-400'}>{b.available}</td><td>{b.waiting || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.results.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No books found{q ? ` for "${q}"` : ''}. Use "Add book" to start the catalogue.</p>}
        </div>
      )}
      {adding && <Modal open onClose={() => setAdding(false)} title="Add a book" size="lg"><BookForm onSaved={() => { setAdding(false); load(); }} /></Modal>}
      {openId && (
        <Modal open onClose={() => setOpenId(null)} title={data?.results.find((b) => b.id === openId)?.title || 'Book'} size="xl">
          <BookDetail id={openId} onChanged={load} onRemoved={() => { setOpenId(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}
