import StudentDashboard from '../student/StudentDashboard';
import { Users, ShieldCheck } from 'lucide-react';

export default function ParentDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-slate-900 px-6 py-3 text-white shadow">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-sm font-semibold">Parent & Guardian Monitoring Hub</p>
            <p className="text-xs text-slate-400">Linked to Student Records — Synchronized Real-Time Overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-indigo-950/80 border border-indigo-800 px-3 py-1 rounded-full text-indigo-200">
          <ShieldCheck className="h-3.5 w-3.5 text-green-400" /> Authorized Parent Access
        </div>
      </div>

      <StudentDashboard />
    </div>
  );
}
