import type { StudentSummary } from './types';

interface NewAdmissionsProps {
  students: StudentSummary[];
}

export default function NewAdmissions({ students }: NewAdmissionsProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="font-bold text-xs text-purple-700">New Admissions</h3>
        <span className="text-slate-400 cursor-pointer hover:text-slate-600">&lt;</span>
      </div>
      <div className="flex items-center gap-4 pt-2">
        {students.slice(0, 4).map((std, idx) => (
          <div
            key={std.id || idx}
            className="flex flex-col items-center text-center p-3 rounded-xl border border-slate-100 bg-slate-50/50"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 mb-2">
              <img
                src={std.profile_picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'}
                alt={std.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400">{std.student_id || '001'}</span>
            <span className="text-xs font-bold text-slate-800">{std.full_name || 'Sundas'}</span>
            <span className="text-[10px] font-semibold text-slate-500">{std.class_name || 'Grade 1-A'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
