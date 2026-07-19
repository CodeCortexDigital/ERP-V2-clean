import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowLeft, Loader2 } from 'lucide-react';
import behaviourService, { Skill, BehaviourRating } from '@/services/behaviour.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/hooks/useAuth';

export default function StudentBehaviourPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<BehaviourRating[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
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
        const [skRes, rtRes] = await Promise.all([
          behaviourService.getSkills().catch(() => ({ data: [] as Skill[] })),
          behaviourService.getRatings({ student: String(me.id) }).catch(() => ({ data: [] as BehaviourRating[] })),
        ]);
        if (active) {
          setSkills(Array.isArray(skRes?.data) ? skRes.data : []);
          setRatings(Array.isArray(rtRes?.data) ? rtRes.data : []);
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load behaviour records.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const skillName = (id: string) => skills.find((s) => String(s.id) === String(id))?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Star size={16} className="text-blue-600" /> My Behaviour & Skills
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
      ) : ratings.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No behaviour records found.
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map((r) => {
            const entries = Object.entries(r.ratings || {}).filter(([, v]) => v);
            const avg = entries.length
              ? (entries.reduce((s, [, v]) => s + Number(v), 0) / entries.length).toFixed(1)
              : '—';
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800 capitalize">
                      {r.domain} · {r.term} {r.month}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">{r.class_name}</p>
                  </div>
                  <span className="text-lg font-black text-blue-600">{avg}</span>
                </div>
                {entries.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {entries.map(([sid, val]) => (
                      <div key={sid} className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-600 w-32 truncate">{skillName(sid)}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (Number(val) / 5) * 100)}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 w-6 text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                )}
                {r.comments && (
                  <p className="text-xs text-slate-500 mt-3 italic">“{r.comments}”</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
