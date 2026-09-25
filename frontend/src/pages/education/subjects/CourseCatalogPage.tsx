import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookMarked, Loader2, Search } from 'lucide-react';
import api from '@/services/api';

const input = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const LEVELS = [['standard', 'Standard'], ['honors', 'Honors'], ['advanced', 'Advanced'], ['ap', 'AP'], ['ib', 'IB'], ['remedial', 'Support / remedial']];

interface Course { id: string; name: string; code: string; department: string; level: string; credit_value: string; is_elective: boolean; is_active: boolean }

/** Course catalog: department, level (Honors / AP / IB), credits and electives for every subject. */
export default function CourseCatalogPage() {
  const [rows, setRows] = useState<Course[] | null>(null);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');

  useEffect(() => {
    api.get('/auth/academics/subjects/', { params: { page_size: 500 } })
      .then((r) => setRows(Array.isArray(r.data) ? r.data : r.data?.results || []))
      .catch(() => { setRows([]); toast.error('Could not load subjects.'); });
  }, []);

  const departments = useMemo(() => [...new Set((rows || []).map((r) => r.department).filter(Boolean))].sort(), [rows]);
  const shown = (rows || []).filter((r) => (!dept || r.department === dept)
    && (!search || `${r.name} ${r.code}`.toLowerCase().includes(search.toLowerCase())));

  const save = async (c: Course, patch: Partial<Course>) => {
    setRows((rs) => (rs || []).map((r) => (r.id === c.id ? { ...r, ...patch } : r)));
    try {
      await api.patch(`/auth/academics/subjects/${c.id}/`, patch);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Could not update ${c.name}.`);
      setRows((rs) => (rs || []).map((r) => (r.id === c.id ? c : r)));
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-6xl mx-auto text-slate-800">
      <div>
        <h1 className="text-xl font-bold inline-flex items-center gap-2"><BookMarked className="w-5 h-5" /> Course catalog</h1>
        <p className="text-sm text-slate-500">Department, level and credits for each subject. Transcripts and GPA use these. Changes save as you go.</p>
      </div>
      <datalist id="departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} w-full pl-9 py-2`} placeholder="Search subjects" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search subjects" />
        </div>
        <select className={input} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
          <option value="">All departments</option>{departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {!rows ? <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="text-left px-3 py-2">Course</th><th className="text-left px-3 py-2">Department</th><th className="text-left px-3 py-2">Level</th><th className="text-left px-3 py-2">Credits</th><th className="px-3 py-2">Elective</th><th className="px-3 py-2">Offered</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((c) => (
                <tr key={c.id} className={c.is_active === false ? 'opacity-60' : ''}>
                  <td className="px-3 py-2"><span className="font-semibold">{c.name}</span> <span className="text-xs text-slate-500">{c.code}</span></td>
                  <td className="px-3 py-2"><input list="departments" className={`${input} w-40`} defaultValue={c.department} aria-label={`Department for ${c.name}`} onBlur={(e) => e.target.value !== c.department && save(c, { department: e.target.value })} /></td>
                  <td className="px-3 py-2"><select className={input} value={c.level || 'standard'} aria-label={`Level for ${c.name}`} onChange={(e) => save(c, { level: e.target.value })}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                  <td className="px-3 py-2"><input type="number" min={0} max={10} step={0.25} className={`${input} w-20`} defaultValue={c.credit_value} aria-label={`Credits for ${c.name}`} onBlur={(e) => e.target.value !== String(c.credit_value) && save(c, { credit_value: e.target.value })} /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" className="w-4 h-4" checked={Boolean(c.is_elective)} aria-label={`${c.name} is an elective`} onChange={(e) => save(c, { is_elective: e.target.checked })} /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" className="w-4 h-4" checked={c.is_active !== false} aria-label={`${c.name} is offered`} onChange={(e) => save(c, { is_active: e.target.checked })} /></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No subjects match.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
