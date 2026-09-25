import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Boxes, Bus, ClipboardList, Clock, CornerDownLeft, FileText, GraduationCap, Library, Loader2, Receipt, Search,
  User, UserRound, Users, X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { matchPages } from '@/config/searchPages';
import { recentSearches, rememberSearch, search, SearchResponse } from '@/services/search.service';

const ICON: Record<string, typeof User> = {
  student: GraduationCap, guardian: Users, staff: UserRound, class: ClipboardList, invoice: Receipt, application: FileText,
  book: Library, route: Bus, vehicle: Bus, item: Boxes, supplier: Boxes, page: ArrowRight,
};
type Hit = { key: string; type: string; title: string; subtitle?: string; url: string; group: string };

/** Search everything from anywhere: Ctrl/⌘ K or "/" opens it; arrows move, Enter opens, Esc closes. */
export function useSearchShortcut(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); }
      else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [q, setQ] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const recent = useMemo(() => recentSearches(), []);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setData(null); return; }
    setLoading(true);
    const t = setTimeout(() => search(q.trim()).then(setData).catch(() => setData(null)).finally(() => setLoading(false)), 200);
    return () => clearTimeout(t);
  }, [q]);

  const hits: Hit[] = useMemo(() => {
    const pages = matchPages(role, q).map((p) => ({ key: `page:${p.url}`, type: 'page', title: p.label, url: p.url, group: 'Go to' }));
    const found = (data?.groups || []).flatMap((g) => g.results.map((r) => ({ key: `${r.type}:${r.id}`, type: r.type, title: r.title, subtitle: r.subtitle, url: r.url, group: g.label })));
    return [...found, ...pages];
  }, [data, q, role]);
  useEffect(() => { setActive(0); }, [hits.length, q]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const go = (url: string) => { rememberSearch(q); onClose(); navigate(url); };
  const all = () => { rememberSearch(q); onClose(); navigate(`/search?q=${encodeURIComponent(q.trim())}`); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(hits.length - 1, 0))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[active]) go(hits[active].url);
      else if (q.trim().length >= 2) all();
    }
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 pt-[12vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} aria-label="Search the school"
            role="combobox" aria-expanded={hits.length > 0} aria-controls="search-results" aria-activedescendant={hits[active] ? `hit-${active}` : undefined}
            placeholder="Search students, parents, staff, invoices, books, pages…" className="flex-1 py-4 text-base bg-transparent border-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none text-slate-900 dark:text-white" style={{ boxShadow: "none", outline: "none" }} />
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          <button onClick={onClose} aria-label="Close search" className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <div className="p-4 text-sm">
              {recent.length > 0 && (
                <>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Recent</p>
                  <ul className="mb-3">{recent.map((r) => <li key={r}><button onClick={() => setQ(r)} className="w-full text-left py-1.5 inline-flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600"><Clock size={13} /> {r}</button></li>)}</ul>
                </>
              )}
              <p className="text-slate-500">Type at least 2 letters: a name, student or employee number, phone, invoice or application number, book title or barcode, or a page like "collect fees".</p>
            </div>
          ) : hits.length === 0 && !loading ? (
            <p className="p-6 text-sm text-slate-500 text-center">Nothing found for "{q}".</p>
          ) : (
            <ul id="search-results" ref={listRef} role="listbox" className="py-2">
              {hits.map((h, i) => {
                const head = h.group !== lastGroup ? h.group : '';
                lastGroup = h.group;
                const Icon = ICON[h.type] || FileText;
                return (
                  <li key={h.key} role="presentation">
                    {head && <p className="px-4 pt-2 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400">{head}</p>}
                    <button id={`hit-${i}`} data-i={i} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => go(h.url)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-3 ${i === active ? 'bg-blue-50 dark:bg-slate-800' : ''}`}>
                      <Icon size={16} className="text-slate-400 shrink-0" />
                      <span className="min-w-0 mr-auto">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{h.title}</span>
                        {h.subtitle && <span className="block text-xs text-slate-500 truncate">{h.subtitle}</span>}
                      </span>
                      {i === active && <CornerDownLeft size={14} className="text-slate-400" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
          <span><kbd className="font-sans">↑↓</kbd> move</span><span><kbd className="font-sans">Enter</kbd> open</span><span><kbd className="font-sans">Esc</kbd> close</span>
          {q.trim().length >= 2 && data && data.total > 0 && <button onClick={all} className="ml-auto font-bold text-blue-600">See all {data.total} results</button>}
        </div>
      </div>
    </div>
  );
}
