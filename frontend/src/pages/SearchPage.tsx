import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { matchPages } from '@/config/searchPages';
import { rememberSearch, search, SearchResponse } from '@/services/search.service';

/** Every search result, grouped, with a filter per kind of record. */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { role } = useAuth();
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const [text, setText] = useState(q);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [kinds, setKinds] = useState<Array<{ type: string; label: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setText(q); }, [q]);
  useEffect(() => {
    if (q.trim().length < 2) { setData(null); setKinds([]); return; }
    setLoading(true);
    rememberSearch(q);
    Promise.all([search(q, type ? { type, limit: 50 } : { limit: 10 }), type ? search(q) : Promise.resolve(null)])
      .then(([d, all]) => { setData(d); setKinds((all || d).groups.map((g) => ({ type: g.type, label: g.label, count: g.count }))); })
      .catch(() => setData(null)).finally(() => setLoading(false));
  }, [q, type]);

  const pages = type ? [] : matchPages(role, q, 10);
  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); setParams({ q: text.trim() }); }} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input aria-label="Search the school" value={text} onChange={(e) => setText(e.target.value)} autoFocus
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-900" placeholder="Search students, parents, staff, invoices, books…" />
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Search</button>
      </form>
      {kinds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setParams({ q })} aria-pressed={!type} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${!type ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>All</button>
          {kinds.map((k) => (
            <button key={k.type} onClick={() => setParams({ q, type: k.type })} aria-pressed={type === k.type}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${type === k.type ? 'bg-slate-900 text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}>{k.label} {k.count}</button>
          ))}
        </div>
      )}
      {loading && !data ? <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="animate-spin" size={16} /> Searching…</div>
        : q.trim().length < 2 ? <p className="text-sm text-slate-500">Type at least 2 letters.</p>
        : (!data || data.groups.length === 0) && pages.length === 0 ? <p className="text-sm text-slate-500">Nothing found for "{q}".</p> : (
          <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
            {data?.groups.map((g) => (
              <section key={g.type} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">{g.label} <span className="text-slate-400 font-semibold">{g.count}</span></h2>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.results.map((r) => (
                    <li key={`${r.type}:${r.id}`}><Link to={r.url} className="block py-2 hover:bg-slate-50 dark:hover:bg-slate-800 -mx-2 px-2 rounded-lg">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</span>
                      {r.subtitle && <span className="block text-xs text-slate-500">{r.subtitle}</span>}
                    </Link></li>
                  ))}
                </ul>
                {g.more && !type && <button onClick={() => setParams({ q, type: g.type })} className="mt-2 text-xs font-bold text-blue-600">Show all {g.count}</button>}
              </section>
            ))}
            {pages.length > 0 && (
              <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">Pages</h2>
                <ul className="flex flex-wrap gap-2">{pages.map((p) => <li key={p.url}><Link to={p.url} className="inline-block px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold hover:border-blue-300">{p.label}</Link></li>)}</ul>
              </section>
            )}
          </div>
        )}
    </div>
  );
}
