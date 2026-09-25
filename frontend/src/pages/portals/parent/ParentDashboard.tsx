import StudentDashboard from '../student/StudentDashboard';
import { Users, ShieldCheck } from 'lucide-react';
import ReenrollmentCard from '@/components/admissions/ReenrollmentCard';
import FamilyBillingCard from '@/components/finance/FamilyBillingCard';
import ReportAbsenceCard from '@/components/attendance/ReportAbsenceCard';

export default function ParentDashboard() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Parent Portal</p>
            <p className="text-xs text-slate-500">Your child's attendance, fees and results in one place.</p>
          </div>
        </div>
        <div className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure parent access
        </div>
      </div>

      <ReenrollmentCard />
      <ReportAbsenceCard />
      <FamilyBillingCard />

      <StudentDashboard />
    </div>
  );
}
