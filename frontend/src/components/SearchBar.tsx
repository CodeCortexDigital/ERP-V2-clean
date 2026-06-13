import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { search, type SearchResult } from '@/services/search.service';

const RECENT_KEY = 'recent_searches_v1';

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  if (!term) return;
  const items = loadRecent().filter((t) => t !== term);
  items.unshift(term);
  const trimmed = items.slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await search(query, 1, 8);
        setSuggestions(res.results || []);
        setOpen(true);
        setFocused(-1);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = focused >= 0 ? suggestions[focused] : undefined;
      if (sel) selectItem(sel);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const selectItem = (item: SearchResult) => {
    saveRecent(query || item.label.replace(/<[^>]+>/g, ''));
    setRecent(loadRecent());
    setOpen(false);
    // Navigate to appropriate detail page
    if (item.type === 'student') {
      navigate(`/education/students/${item.id}`);
    } else if (item.type === 'teacher') {
      navigate(`/education/teachers/${item.id}`);
    } else if (item.type === 'class') {
      navigate(`/education/classes/${item.id}`);
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    setRecent(loadRecent());
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center bg-white border rounded px-2 py-1 shadow-sm">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query) setOpen(true); else setOpen(true); }}
          placeholder="Search students, teachers, classes..."
          className="w-full outline-none px-2 py-1 text-sm"
          aria-label="Global search"
        />
        {loading && <div className="text-xs text-gray-400 pr-2">Searching…</div>}
      </div>

      {open && (suggestions.length > 0 || recent.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((s, idx) => (
                <li
                  key={`${s.type}-${s.id}-${idx}`}
                  onMouseEnter={() => setFocused(idx)}
                  onClick={() => selectItem(s)}
                  className={`cursor-pointer px-3 py-2 hover:bg-gray-100 ${focused === idx ? 'bg-gray-100' : ''}`}
                >
                  <div className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: s.label }} />
                  {s.subLabel && <div className="text-xs text-gray-500" dangerouslySetInnerHTML={{ __html: s.subLabel }} />}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3">
              <div className="text-sm text-gray-600">Recent searches</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {recent.map((r) => (
                  <button key={r} onClick={() => handleRecentClick(r)} className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
