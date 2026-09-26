import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Users, GraduationCap, Search, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import schoolService, { type PlatformSchool } from '@/services/school.service';
import { useAuth } from '@/contexts/AuthContext';
import PlatformBilling from '@/components/platform/PlatformBilling';

/** Platform owner console: every school on this installation. */
export default function PlatformSchoolsPage() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await schoolService.platformSchools();
      setSchools(data.schools);
      setTotals(data.totals);
    } catch {
      toast.error('Could not load schools.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_superuser) load();
    else setLoading(false);
  }, [user?.is_superuser]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? schools.filter((s) => [s.name, s.code, s.city, ...s.admins].some((v) => v?.toLowerCase().includes(q)))
      : schools;
  }, [schools, query]);

  const toggle = async (s: PlatformSchool) => {
    const next = !s.is_active;
    if (!next && !window.confirm(`Suspend ${s.name}? Its staff, students and parents will not be able to sign in.`)) return;
    setBusy(s.id);
    try {
      await schoolService.setSchoolActive(s.id, next);
      setSchools((list) => list.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
      toast.success(next ? `${s.name} is active again.` : `${s.name} has been suspended.`);
    } catch {
      toast.error('Could not update the school.');
    } finally {
      setBusy(null);
    }
  };

  if (!user?.is_superuser) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center rounded-2xl border border-slate-200 bg-white p-8">
        <ShieldAlert className="w-10 h-10 mx-auto text-slate-400" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Platform owners only</h1>
        <p className="mt-1 text-sm text-slate-500">This page lists every school on the platform.</p>
      </div>
    );
  }

  const stat = (icon: React.ReactNode, label: string, value: number | undefined) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center">{icon}</span>
      <div>
        <p className="text-xl font-extrabold text-slate-900 tabular-nums">{(value ?? 0).toLocaleString()}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">All schools</h1>
          <p className="text-sm text-slate-500">Every school on the platform. Each school only ever sees its own data.</p>
        </div>
        <button onClick={load} className="self-start inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stat(<Building2 className="w-5 h-5" />, 'Schools', totals.schools)}
        {stat(<Building2 className="w-5 h-5" />, 'Active', totals.active)}
        {stat(<GraduationCap className="w-5 h-5" />, 'Students', totals.students)}
        {stat(<Users className="w-5 h-5" />, 'Staff', totals.staff)}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by school, code, city or admin email"
              aria-label="Search schools"
              className="auth-input h-10 pl-9 pr-3"
            />
          </div>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No schools match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3 text-right">Students</th>
                  <th className="px-4 py-3 text-right">Staff</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.school_id}{s.city ? ` · ${s.city}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.admins.join(', ') || <span className="text-slate-400">None</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.students.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{s.staff.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {s.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggle(s)}
                        disabled={busy === s.id}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-60 ${
                          s.is_active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {s.is_active ? 'Suspend' : 'Re-activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <PlatformBilling />
    </div>
  );
}
