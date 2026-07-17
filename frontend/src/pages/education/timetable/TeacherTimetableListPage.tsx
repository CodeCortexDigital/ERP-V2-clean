import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Eye, Edit, Calendar, Users, UserX, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import academicService from '@/services/academic.service';
import teacherService from '@/services/teacher.service';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherTimetableListPage() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isAdmin = role === 'admin' || role === 'staff' || !!user?.is_staff || !!user?.is_superuser;

  const [teachers, setTeachers] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'empty' | 'all'>('active');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teachersRes, entriesRes] = await Promise.all([
        teacherService.getAll().catch(() => ({ data: [] })),
        academicService.getAllTimetableEntries().catch(() => ({ data: [] }))
      ]);

      const rawTeachers = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any)?.results || [];
      const rawEntries = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data as any)?.results || [];

      setTeachers(rawTeachers);
      setTimetableEntries(rawEntries);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const teacherSchedules = useMemo(() => {
    const active = teachers.length > 0 ? teachers : [];

    // Deduplicate by name (case-insensitive)
    const unique = [];
    const seen = new Set();
    for (const t of active) {
      const name = t.full_name || t.name || '';
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        unique.push(t);
      }
    }

    // Sort alphabetically naturally
    unique.sort((a, b) => {
      const nameA = a.full_name || a.name || '';
      const nameB = b.full_name || b.name || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    return unique.map(t => {
      // Find entries for this teacher
      const teacherName = t.full_name || t.name || 'Teacher';
      const teacherEntries = timetableEntries.filter(e => String(e.teacher) === String(t.id) || e.teacher_name === teacherName);
      const teacherType = t.teacher_type || 'regular';
      const roleLabel = teacherType === 'relief' ? 'Relief Teacher' : (t.role || 'Regular Teacher');
      return {
        id: t.id,
        name: teacherName,
        code: t.employee_id || t.code || `EMP-${t.id}`,
        teacher_type: teacherType,
        role: roleLabel,
        total_periods: teacherEntries.length,
        last_modified: teacherEntries.length > 0 ? 'Configured' : 'Not Configured'
      };
    });
  }, [teachers, timetableEntries]);

  const filteredSchedules = useMemo(() => {
    let result = teacherSchedules;

    if (statusFilter === 'active') {
      result = result.filter(t => t.total_periods > 0);
    } else if (statusFilter === 'empty') {
      result = result.filter(t => t.total_periods === 0);
    }

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(term) || t.code.toLowerCase().includes(term));
    }

    if (roleFilter !== 'all') {
      result = result.filter(t => t.role === roleFilter);
    }

    return result;
  }, [searchQuery, statusFilter, roleFilter, teacherSchedules]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    teacherSchedules.forEach(t => roles.add(t.role));
    return Array.from(roles).sort((a, b) => a.localeCompare(b));
  }, [teacherSchedules]);

  // ----- Leave & substitution management -----
  const [leaveModal, setLeaveModal] = useState<{ open: boolean; teacher: any | null }>({ open: false, teacher: null });
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [activeLeave, setActiveLeave] = useState<any | null>(null);
  const [leaveSubstitutions, setLeaveSubstitutions] = useState<any[]>([]);
  const [leaveError, setLeaveError] = useState('');

  const openLeaveModal = async (teacher: any) => {
    setLeaveModal({ open: true, teacher });
    setLeaveError('');
    setLeaveSubstitutions([]);
    setLeaveForm({ leave_type: 'sick', start_date: '', end_date: '', reason: '' });
    try {
      const leaves = await teacherService.leaves.getAll({ teacher_id: teacher.id });
      const active = (leaves || []).find((l: any) => l.status === 'approved' || l.status === 'pending');
      if (active) {
        setActiveLeave(active);
        const subs = await teacherService.substitutions.getAll({ leave_id: active.id });
        setLeaveSubstitutions(subs || []);
      } else {
        setActiveLeave(null);
      }
    } catch {
      setActiveLeave(null);
    }
  };

  const submitLeave = async () => {
    if (!leaveModal.teacher) return;
    if (!leaveForm.start_date || !leaveForm.end_date) {
      setLeaveError('Start and end dates are required.');
      return;
    }
    setLeaveSubmitting(true);
    setLeaveError('');
    try {
      const created = await teacherService.leaves.create({
        teacher: leaveModal.teacher.id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason,
        status: 'approved'
      });
      setActiveLeave(created);
      const subs = await teacherService.substitutions.getAll({ leave_id: created.id });
      setLeaveSubstitutions(subs || []);
    } catch (err: any) {
      setLeaveError(err?.response?.data?.error || 'Failed to create leave.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const cancelLeave = async () => {
    if (!activeLeave) return;
    setLeaveSubmitting(true);
    try {
      await teacherService.leaves.remove(activeLeave.id);
      setActiveLeave(null);
      setLeaveSubstitutions([]);
    } catch {
      setLeaveError('Failed to cancel leave.');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Calendar className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/timetable')}>Timetable</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Teacher Timetables</span>
        </div>

        <button
          onClick={() => navigate('/education/timetable')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-650" /> Teacher Timetables Directory
            </h1>
            <p className="text-[10px] text-slate-400 font-bold">View, export or configure weekly timetable schedules teacher-wise.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <div className="relative flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teachers..."
                className="pl-10 text-xs h-9 rounded-xl border-slate-200"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'empty' | 'all')}
              className="h-9 text-xs rounded-xl border border-slate-200 bg-white px-3 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="active">Active</option>
              <option value="empty">Empty</option>
              <option value="all">All</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 text-xs rounded-xl border border-slate-200 bg-white px-3 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="all">All Roles</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider text-[9px]">
                    <th className="p-3.5 text-center">S.No</th>
                    <th className="p-3.5">Teacher Name</th>
                    <th className="p-3.5">Employee ID</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5 text-center">Periods Scheduled</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Configured State</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-semibold">
                  {filteredSchedules.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 text-center font-black text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-800">{t.name}</td>
                      <td className="p-3.5">
                        <span className="font-mono text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {t.code}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <Badge variant={t.teacher_type === 'relief' ? 'warning' : 'secondary'}>{t.role}</Badge>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-850">{t.total_periods} periods</td>
                      <td className="p-3.5 text-center">
                        <Badge variant={t.total_periods > 0 ? 'success' : 'secondary'}>
                          {t.total_periods > 0 ? 'Active' : 'Empty'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-[10px] text-slate-400 font-normal">{t.last_modified}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="outline" 
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-600 font-bold"
                            onClick={() => navigate(`/education/timetable/view?teacher_id=${t.id}`)}
                            title="View Timetable"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="outline" 
                              className="h-8 px-2.5 rounded-lg border-slate-200 text-slate-650 hover:text-purple-650 font-bold"
                              onClick={() => navigate(`/education/timetable/editor?teacher_id=${t.id}`)}
                              title="Edit Timetable"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            className="h-8 px-2.5 rounded-lg border-slate-200 text-orange-600 hover:text-orange-700 font-bold"
                            onClick={() => openLeaveModal(t)}
                            title="Mark Leave / Substitution"
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Modal
          open={leaveModal.open}
          onClose={() => setLeaveModal({ open: false, teacher: null })}
          title={leaveModal.teacher ? `Leave & Substitution — ${leaveModal.teacher.name}` : 'Leave & Substitution'}
          description="Marking leave automatically assigns relief teachers (matched by subject) to the teacher's periods."
        >
          {activeLeave ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-green-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Active leave ({activeLeave.leave_type}) from {activeLeave.start_date} to {activeLeave.end_date}.
                {activeLeave.substitute_assigned ? ' Periods covered by relief teachers below.' : ' No periods required coverage.'}
              </div>

              {leaveSubstitutions.length > 0 && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[9px]">
                      <tr>
                        <th className="p-2.5">Day</th>
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5">Relief Teacher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {leaveSubstitutions.map((s) => (
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

              {leaveError && <p className="text-xs text-red-600 font-semibold">{leaveError}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLeaveModal({ open: false, teacher: null })}>Close</Button>
                <Button variant="destructive" onClick={cancelLeave} disabled={leaveSubmitting}>
                  {leaveSubmitting ? 'Cancelling...' : 'Cancel Leave'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Leave Type</Label>
                <Select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                >
                  <option value="sick">Sick</option>
                  <option value="casual">Casual</option>
                  <option value="annual">Annual</option>
                  <option value="maternity">Maternity</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Optional" />
              </div>

              {leaveError && <p className="text-xs text-red-600 font-semibold">{leaveError}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setLeaveModal({ open: false, teacher: null })}>Cancel</Button>
                <Button onClick={submitLeave} disabled={leaveSubmitting}>
                  {leaveSubmitting ? 'Assigning...' : 'Save & Auto-Assign Relief'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
