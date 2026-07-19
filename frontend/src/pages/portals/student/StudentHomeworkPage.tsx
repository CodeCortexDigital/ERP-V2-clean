import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Loader2, ClipboardList } from 'lucide-react';
import academicService from '@/services/academic.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/hooks/useAuth';

type HW = {
  id: string;
  title: string;
  description?: string;
  subject_name?: string;
  class_name?: string;
  due_date?: string;
  assigned_date?: string;
  status?: string;
};

export default function StudentHomeworkPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HW[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await studentService.resolveMe(user);
        if (!me) {
          if (active) setError('Student profile not found for this account.');
          return;
        }
        const className = me.current_class?.name || me.class_name;
        const res = await academicService.homework.getAll(
          className ? { class_name: className } : {}
        ).catch(() => [] as any[]);
        const list: HW[] = Array.isArray(res) ? res : [];
        if (active) {
          setItems(
            list
              .map((h: any) => ({
                id: String(h.id),
                title: h.title || 'Untitled',
                description: h.description,
                subject_name: h.subject_name,
                class_name: h.class_name,
                due_date: h.due_date,
                assigned_date: h.assigned_date,
                status: (h.status || '').toLowerCase(),
              }))
              .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
          );
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load homework.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const statusStyle = (s: string) =>
    s === 'completed' || s === 'submitted'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'overdue' || s === 'late'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <BookOpen size={16} className="text-blue-600" /> My Homework
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading homework…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No homework assigned yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((h) => (
            <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardList size={15} className="text-blue-500" />
                  <p className="text-sm font-bold text-slate-800">{h.title}</p>
                </div>
                {h.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusStyle(h.status)}`}>
                    {h.status}
                  </span>
                )}
              </div>
              {h.subject_name && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{h.subject_name}</p>
              )}
              {h.description && (
                <p className="text-xs text-slate-500 mt-2 line-clamp-3">{h.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-[10px] font-semibold text-slate-400">
                {h.assigned_date && <span>Given: {h.assigned_date}</span>}
                {h.due_date && <span className="text-rose-500">Due: {h.due_date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
