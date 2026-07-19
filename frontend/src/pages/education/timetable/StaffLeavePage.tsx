import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, UserX, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import teacherService from '@/services/teacher.service';
import { useAuth } from '@/hooks/useAuth';

export default function StaffLeavePage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const canApprove = ['admin', 'manager', 'hr', 'staff', 'superuser'].includes(
    String(role || '').toLowerCase()
  );
  // A leave owner may never approve/reject their own request.
  const isOwner = (l: any) =>
    !!user &&
    ((l.applicant_email && l.applicant_email.toLowerCase() === user.email?.toLowerCase()) ||
      (l.teacher && l.teacher.email && l.teacher.email.toLowerCase() === user.email?.toLowerCase()));
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subsByLeave, setSubsByLeave] = useState<Record<string, any[]>>({});
  const [balances, setBalances] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await teacherService.leaves.getAll();
      const list = Array.isArray(data) ? data : [];
      setLeaves(list);
      await loadBalances(list);
    } catch (err) {
      console.error('Error loading leaves:', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (list: any[]) => {
    const next: Record<string, any> = {};
    await Promise.all(list.map(async (l) => {
      try {
        const bal = l.teacher
          ? await teacherService.leaveBalances.get({ teacher_id: l.teacher })
          : (l.applicant_email ? await teacherService.leaveBalances.get({ applicant_email: l.applicant_email }) : null);
        if (bal) next[l.id] = bal;
      } catch {
        /* ignore */
      }
    }));
    setBalances(prev => ({ ...prev, ...next }));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSubs = async (leaveId: string) => {
    if (expanded === leaveId) {
      setExpanded(null);
      return;
    }
    setExpanded(leaveId);
    if (!subsByLeave[leaveId]) {
      try {
        const subs = await teacherService.substitutions.getAll({ leave_id: leaveId });
        setSubsByLeave(prev => ({ ...prev, [leaveId]: Array.isArray(subs) ? subs : [] }));
      } catch {
        setSubsByLeave(prev => ({ ...prev, [leaveId]: [] }));
      }
    }
  };

  const cancelLeave = async (leaveId: string) => {
    setBusyId(leaveId);
    try {
      await teacherService.leaves.remove(leaveId);
      await load();
      setExpanded(null);
    } catch (err) {
      console.error('Error cancelling leave:', err);
    } finally {
      setBusyId(null);
    }
  };

  const approveLeave = async (leaveId: string) => {
    setBusyId(leaveId);
    try {
      await teacherService.leaves.update(leaveId, { status: 'approved' });
      await load();
    } catch (err) {
      console.error('Error approving leave:', err);
    } finally {
      setBusyId(null);
    }
  };

  const activeLeaves = useMemo(() => leaves.filter(l => l.status === 'approved' || l.status === 'pending'), [leaves]);
  const pastLeaves = useMemo(() => leaves.filter(l => l.status === 'cancelled' || l.status === 'rejected'), [leaves]);

  const statusVariant = (s: string) => {
    if (s === 'approved') return 'success';
    if (s === 'pending') return 'warning';
    return 'secondary';
  };

  const renderLeave = (l: any) => (
    <div key={l.id} className="border border-slate-100 rounded-xl bg-white overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{l.applicant_display || l.teacher_name}</p>
            <p className="text-[10px] text-slate-400 font-semibold capitalize">
              {l.leave_type} leave &middot; {l.start_date} → {l.end_date}
            </p>
          </div>
        </div>
        {balances[l.id] && (
          <div className="flex items-center gap-3 mt-2 sm:mt-0 text-right">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400">Balance</p>
              <p className="text-sm font-black text-purple-650">{balances[l.id].balance_days} <span className="text-[10px] font-semibold text-slate-400">days</span></p>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold">
              {balances[l.id].used_days}/{balances[l.id].annual_entitlement} used
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
          {l.substitute_assigned ? (
            <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" />Covered</Badge>
          ) : (
            <Badge variant="secondary">No coverage</Badge>
          )}
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => toggleSubs(l.id)}>
            {expanded === l.id ? 'Hide' : 'Substitutions'}
          </Button>
          {l.status === 'pending' && canApprove && !isOwner(l) && (
            <Button variant="success" className="h-8 px-3 text-xs" onClick={() => approveLeave(l.id)} disabled={busyId === l.id}>
              {busyId === l.id ? 'Approving...' : 'Approve'}
            </Button>
          )}
          {(l.status === 'approved' || l.status === 'pending') && (isOwner(l) || canApprove) && (
            <Button variant="destructive" className="h-8 px-3 text-xs" onClick={() => cancelLeave(l.id)} disabled={busyId === l.id}>
              {busyId === l.id ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
      {expanded === l.id && (
        <div className="border-t bg-slate-50 p-4">
          {(subsByLeave[l.id] || []).length === 0 ? (
            <p className="text-xs text-slate-500 font-semibold">No periods required coverage or no relief teacher available.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px]">
                  <tr>
                    <th className="p-2.5">Day</th>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Relief Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subsByLeave[l.id].map((s) => (
                    <tr key={s.id}>
                      <td className="p-2.5 font-bold capitalize">{s.day_of_week}</td>
                      <td className="p-2.5">{s.subject_name}</td>
                      <td className="p-2.5">{s.relief_teacher_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {balances[l.id] && (
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-[10px]">Annual entitlement (days)</Label>
              <Input
                type="number"
                min={0}
                defaultValue={balances[l.id].annual_type_entitlement ?? balances[l.id].annual_entitlement ?? 0}
                key={`ent-${l.id}-${balances[l.id].annual_type_entitlement ?? balances[l.id].annual_entitlement ?? 0}`}
                onBlur={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const current = balances[l.id].annual_type_entitlement ?? 0;
                  if (!isNaN(val) && val !== current && balances[l.id].id) {
                    teacherService.leaveBalances.update(balances[l.id].id, { annual_type_entitlement: val })
                      .then(() => loadBalances(leaves))
                      .catch(() => {});
                  }
                }}
                className="h-8 w-20 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Calendar className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/timetable')}>Timetable</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Staff Leave</span>
        </div>
        <button
          onClick={() => navigate('/education/timetable')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UserX className="w-5 h-5 text-purple-650" /> Staff Leave & Substitution
          </h1>
          <p className="text-[10px] text-slate-400 font-bold">
            Track teacher leaves and the relief teachers auto-assigned to cover their periods.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Active Leaves ({activeLeaves.length})
              </h2>
              {activeLeaves.length === 0 ? (
                <Card className="p-6 text-center text-xs text-slate-400 font-semibold">No active staff leaves.</Card>
              ) : (
                activeLeaves.map(renderLeave)
              )}
            </section>

            {pastLeaves.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-slate-600">Past / Cancelled ({pastLeaves.length})</h2>
                {pastLeaves.map(renderLeave)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
