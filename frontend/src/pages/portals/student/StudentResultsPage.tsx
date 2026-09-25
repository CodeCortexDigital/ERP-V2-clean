import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowLeft, Loader2 } from 'lucide-react';
import examService from '@/services/exam.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/contexts/AuthContext';
import GradesPortalCard from '@/components/gradebook/GradesPortalCard';

type Result = {
  id: string;
  exam_name?: string;
  subject_name?: string;
  exam_type?: string;
  obtained_marks?: number;
  total_marks?: number;
  grade?: string;
  remarks?: string;
};

export default function StudentResultsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Result[]>([]);
  const [tests, setTests] = useState<Result[]>([]);
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
        const sid = String(me.id || me.student_id);
        const res = await examService.getResultsByStudent(sid).catch(() => ({ data: [] as any[] }));
        const list: Result[] = Array.isArray(res?.data) ? res.data
          : (res?.data?.results || []);
        const mapped = list.map((r: any) => ({
          id: String(r.id),
          exam_name: r.exam_name || r.exam?.name,
          subject_name: r.subject_name || r.subject?.name,
          exam_type: (r.exam_type || r.exam?.exam_type || '').toLowerCase(),
          obtained_marks: Number(r.obtained_marks ?? 0),
          total_marks: Number(r.total_marks ?? r.max_marks ?? 0),
          grade: r.grade,
          remarks: r.remarks,
        }));
        if (active) {
          setExams(mapped.filter((r) => !['test', 'quiz', 'class_test'].includes(r.exam_type)));
          setTests(mapped.filter((r) => ['test', 'quiz', 'class_test'].includes(r.exam_type)));
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load results.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const renderTable = (title: string, data: Result[]) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
        {title}
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold p-4 text-center">No records found.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
              <th className="text-left font-black p-2">Exam</th>
              <th className="text-left font-black p-2">Subject</th>
              <th className="text-right font-black p-2">Marks</th>
              <th className="text-center font-black p-2">Grade</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="p-2 font-bold text-slate-700">{r.exam_name || '—'}</td>
                <td className="p-2 text-slate-600">{r.subject_name || '—'}</td>
                <td className="p-2 text-right font-black text-slate-700">
                  {r.obtained_marks}{r.total_marks ? `/${r.total_marks}` : ''}
                </td>
                <td className="p-2 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                    {r.grade || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Award size={16} className="text-blue-600" /> My Results
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      <GradesPortalCard />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading results…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
      ) : (
        <div className="space-y-4">
          {renderTable('Examination Results', exams)}
          {renderTable('Class Tests', tests)}
        </div>
      )}
    </div>
  );
}
