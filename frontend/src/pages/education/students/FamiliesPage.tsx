import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  IdCard,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import studentService, { Family } from '../../../services/student.service';

export default function FamiliesPage() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadFamilies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.getFamilies();
      setFamilies(data);
    } catch (e) {
      console.error('Error loading families:', e);
      setError('Unable to load families. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) => {
      if (f.name.toLowerCase().includes(q)) return true;
      if ((f.father_national_id || '').toLowerCase().includes(q)) return true;
      if ((f.mother_national_id || '').toLowerCase().includes(q)) return true;
      return f.members.some(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          (m.student_id || '').toLowerCase().includes(q),
      );
    });
  }, [families, search]);

  const totalStudents = useMemo(
    () => families.reduce((sum, f) => sum + f.sibling_count, 0),
    [families],
  );

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => navigate('/education/students')}
          >
            Students
          </span>
          <span>&gt;</span>
          <span className="text-slate-500">Manage Families</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadFamilies}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => navigate('/education/students')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      {/* Stats + Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1 bg-white rounded-xl border border-slate-100 shadow-xs p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-800 leading-none">
              {families.length}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">Families</div>
          </div>
        </div>
        <div className="md:col-span-1 bg-white rounded-xl border border-slate-100 shadow-xs p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-slate-800 leading-none">
              {totalStudents}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">
              Linked Students
            </div>
          </div>
        </div>
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs p-2 flex items-center">
          <div className="flex items-center gap-2 w-full px-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search family, student, or NIC..."
              className="w-full py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-12 text-center text-xs text-slate-400">
          Loading families...
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-100 shadow-xs p-12 text-center text-xs text-red-500">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-12 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">No families found</p>
          <p className="text-[11px] text-slate-400">
            Families are detected automatically when students share a parent NIC.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((family) => {
            const isOpen = !!expanded[family.key];
            return (
              <div
                key={family.key}
                className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden"
              >
                <button
                  onClick={() => toggle(family.key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">
                      {family.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{family.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {family.father_national_id && (
                          <span className="inline-flex items-center gap-1">
                            <IdCard className="w-3 h-3" /> {family.father_national_id}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {family.sibling_count} sibling
                          {family.sibling_count === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-semibold">
                      {family.active_count} active
                    </span>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {family.members.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => navigate(`/education/students/${m.id}`)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-purple-50/40 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                            {m.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-700">
                              {m.full_name}
                            </div>
                            <div className="text-[11px] text-slate-400">{m.student_id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-500 font-medium">
                            {m.current_class_name || '—'}
                            {m.current_section_name ? ` - ${m.current_section_name}` : ''}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold ${
                              m.is_active
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
