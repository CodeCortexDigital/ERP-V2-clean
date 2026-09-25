import { useEffect, useState } from 'react';
import portal, { PortalStudent } from '@/services/portal.service';

const KEY = 'portal.child';

function remembered(): string {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

/** The students this account can see (a student sees themself; a parent sees each child), and the one picked. */
export function usePortalChild() {
  const [kids, setKids] = useState<PortalStudent[]>([]);
  const [id, setIdState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portal.children()
      .then((k) => {
        setKids(k);
        const keep = remembered();
        setIdState(k.find((x) => x.id === keep)?.id || k[0]?.id || '');
      })
      .catch(() => setKids([]))
      .finally(() => setLoading(false));
  }, []);

  const setId = (v: string) => {
    setIdState(v);
    try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
  };
  return { kids, id, setId, loading, child: kids.find((k) => k.id === id) || null };
}

/** Buttons to switch between children; nothing is shown for a single student. */
export default function ChildPicker({ kids, id, onChange }: { kids: PortalStudent[]; id: string; onChange: (id: string) => void }) {
  if (kids.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a child">
      {kids.map((k) => (
        <button
          key={k.id}
          onClick={() => onChange(k.id)}
          aria-pressed={id === k.id}
          className={`px-3 py-1 rounded-full text-xs font-bold border ${id === k.id ? 'bg-blue-600 text-white border-transparent' : 'bg-white border-slate-200 text-slate-700'}`}
        >
          {k.full_name}{k.class_name ? <span className="font-normal opacity-80"> · {k.class_name}</span> : null}
        </button>
      ))}
    </div>
  );
}
