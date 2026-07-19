import React, { useState, useEffect } from 'react';
import { useEmployeePortal } from '@/contexts/EmployeePortalContext';
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  DollarSign,
  Calendar,
  FileText,
  Megaphone,
  User,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import payrollService, { Payslip } from '@/services/payroll.service';
import leaveService, { TeacherLeave } from '@/services/leave.service';
import notificationService from '@/services/notificationApi.service';
import teacherService from '@/services/teacher.service';
import employeeService, {
  employeeTaskService,
  timesheetService,
  employeeDocumentService,
  employeeSummaryService,
  EmployeeTask,
  TimesheetEntry,
  EmployeeDocument,
} from '@/services/employee.service';

const ViewComponents: Record<string, React.ComponentType> = {
  dashboard: DashboardView,
  tasks: TasksView,
  timesheet: TimesheetView,
  payroll: PayrollView,
  leave: LeaveView,
  documents: DocumentsView,
  announcements: AnnouncementsView,
  profile: ProfileView,
  reports: ReportsView,
};

const portalNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, roles: ['all'] },
  { id: 'timesheet', label: 'Timesheet', icon: Clock, roles: ['all'] },
  { id: 'payroll', label: 'Payroll', icon: DollarSign, roles: ['all'] },
  { id: 'leave', label: 'Leave', icon: Calendar, roles: ['all'] },
  { id: 'documents', label: 'Documents', icon: FileText, roles: ['all'] },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['all'] },
  { id: 'profile', label: 'Profile', icon: User, roles: ['all'] },
  { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['manager', 'admin', 'hr'] },
];

export const EmployeePortal: React.FC = () => {
  const { currentView, setCurrentView, getAllowedViews, isManager, isAdmin, isHR, canAccessModule, hasFeature } =
    useEmployeePortal();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const allowedViews = getAllowedViews();
  const navigationItems = portalNavigation.filter((item) => allowedViews.includes(item.id));

  const renderView = () => {
    const ViewComponent = ViewComponents[currentView] || DashboardView;
    return <ViewComponent />;
  };

  const fullName = [user?.full_name, user?.email].filter(Boolean).join(' · ') || 'Employee';
  const roleLabel = isAdmin ? 'Admin' : isManager ? 'Manager' : 'Employee';

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-slate-200 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-xl font-bold text-slate-800">Employee Portal</h2>
              <p className="text-sm text-slate-500">Welcome back</p>
            </div>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-lg hover:bg-slate-100">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigationItems
            .filter(
              (item) =>
                item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.id.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
        </nav>

        {!isCollapsed && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{fullName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-800">
              {portalNavigation.find((item) => item.id === currentView)?.label || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-3">
              {isManager && (
                <div className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full">Manager View</div>
              )}
              {isHR && !isAdmin && (
                <div className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full">HR View</div>
              )}
              {isAdmin && (
                <div className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full">Admin View</div>
              )}
            </div>
          </div>

          {renderView()}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Placeholder views — replace with real feature pages as they are built.
// ---------------------------------------------------------------------------

function ViewShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
      {children || <p className="text-sm text-slate-500">This section is under construction.</p>}
    </div>
  );
}

function DashboardView() {
  const { isManager, isAdmin, hasFeature, canAccessModule, setCurrentView } = useEmployeePortal();
  const [summary, setSummary] = useState({ pending_tasks: 0, done_tasks: 0, total_hours: 0, documents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employeeSummaryService
      .get()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const widgets = [
    { id: 'tasks', label: 'Pending Tasks', value: summary.pending_tasks, visible: canAccessModule('tasks', 'view'), onClick: () => setCurrentView('tasks') },
    { id: 'timesheet', label: 'Hours Logged', value: `${summary.total_hours}h`, visible: canAccessModule('timesheet', 'view'), onClick: () => setCurrentView('timesheet') },
    { id: 'documents', label: 'My Documents', value: summary.documents, visible: canAccessModule('documents', 'view'), onClick: () => setCurrentView('documents') },
    { id: 'announcements', label: 'Announcements', visible: canAccessModule('announcements', 'view'), onClick: () => setCurrentView('announcements') },
    { id: 'leave', label: 'Leave', visible: canAccessModule('leave', 'view'), onClick: () => setCurrentView('leave') },
    { id: 'team-activity', label: 'Team Activity', visible: isManager || isAdmin },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {widgets
        .filter((w) => w.visible)
        .map((widget) => (
          <button
            key={widget.id}
            onClick={widget.onClick}
            className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 text-left hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-slate-700 mb-2">{widget.label}</h3>
            {loading ? (
              <p className="text-xs text-slate-400">…</p>
            ) : (
              <p className="text-2xl font-bold text-slate-800">{widget.value}</p>
            )}
          </button>
        ))}
      {hasFeature('messaging') && (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-700 mb-3">Messages</h3>
          <p className="text-xs text-slate-400">Messaging enabled</p>
        </div>
      )}
    </div>
  );
}

function TasksView() {
  const { canAccessModule } = useEmployeePortal();
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');

  const load = () => {
    employeeTaskService
      .list()
      .then(setTasks)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const canCreate = canAccessModule('tasks', 'create');

  const add = async () => {
    if (!title.trim()) return;
    const created = await employeeTaskService.create({ title: title.trim(), priority });
    setTasks((prev) => [created, ...prev]);
    setTitle('');
  };

  const toggle = async (t: EmployeeTask) => {
    const next = t.status === 'done' ? 'todo' : 'done';
    const updated = await employeeTaskService.update(t.id, { status: next });
    setTasks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  };

  const remove = async (id: string) => {
    await employeeTaskService.remove(id);
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">My Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {canCreate && (
          <div className="flex gap-2 mb-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New task…"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button onClick={add} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">Add</button>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && tasks.length === 0 && <p className="text-sm text-slate-400">No tasks yet.</p>}

        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 border border-slate-100 rounded-lg p-3">
              <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t)} className="h-4 w-4" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {t.title}
                </p>
                <p className="text-[11px] text-slate-500 capitalize">{t.priority} · {t.status.replace('_', ' ')}</p>
              </div>
              {canAccessModule('tasks', 'delete') && (
                <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-rose-600 text-xs">Delete</button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TimesheetView() {
  const { canAccessModule } = useEmployeePortal();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const load = () => {
    timesheetService
      .list()
      .then(setEntries)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const canAdd = canAccessModule('timesheet', 'add');
  const total = entries.reduce((s, e) => s + Number(e.hours_worked || 0), 0);

  const add = async () => {
    if (!date || !hours) return;
    const created = await timesheetService.create({ date, hours_worked: Number(hours), note });
    setEntries((prev) => [created, ...prev]);
    setDate('');
    setHours('');
    setNote('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">My Timesheet</CardTitle>
        <Badge variant="outline">Total: {total}h</Badge>
      </CardHeader>
      <CardContent>
        {canAdd && (
          <div className="flex flex-wrap gap-2 mb-4">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Hours" className="w-24 px-3 py-2 border border-slate-300 rounded-lg" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg" />
            <button onClick={add} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">Log</button>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && entries.length === 0 && <p className="text-sm text-slate-400">No timesheet entries.</p>}

        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{e.date}</p>
                <p className="text-[11px] text-slate-500">{e.note || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{Number(e.hours_worked || 0)}h</span>
                <Badge variant={e.approved ? 'success' : 'secondary'}>{e.approved ? 'Approved' : 'Pending'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function PayrollView() {
  const { canAccessModule } = useEmployeePortal();
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollService
      .getPayslips()
      .then(setSlips)
      .finally(() => setLoading(false));
  }, []);

  const canExport = canAccessModule('payroll', 'export');
  const totalNet = slips.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);
  const totalPaid = slips.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">My Payslips</CardTitle>
        {canExport && slips.length > 0 && (
          <Badge variant="outline">Export</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500">Total Net</p>
            <p className="text-lg font-bold text-slate-800">{totalNet.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500">Total Paid</p>
            <p className="text-lg font-bold text-emerald-600">{totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[11px] text-slate-500">Slips</p>
            <p className="text-lg font-bold text-slate-800">{slips.length}</p>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && slips.length === 0 && (
          <p className="text-sm text-slate-400">No payslips found.</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400 border-b">
                <th className="py-2 pr-3">Month</th>
                <th className="py-2 pr-3">Basic</th>
                <th className="py-2 pr-3">Net</th>
                <th className="py-2 pr-3">Paid</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {slips.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-700">
                    {s.month ? new Date(s.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-slate-600">{Number(s.basic_salary || 0).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-slate-700 font-semibold">{Number(s.net_salary || 0).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-slate-600">{Number(s.paid_amount || 0).toLocaleString()}</td>
                  <td className="py-2 pr-3">
                    <Badge variant={s.status === 'paid' ? 'success' : s.status === 'partial' ? 'warning' : 'secondary'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <button
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                      title="Download"
                      onClick={() => { /* TODO: wire PDF download endpoint */ }}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
function LeaveView() {
  const { canAccessModule } = useEmployeePortal();
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    leaveService
      .getLeaves()
      .then(setLeaves)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const canApply = canAccessModule('leave', 'apply');

  const submit = async () => {
    if (!form.start_date || !form.end_date) return;
    setSubmitting(true);
    try {
      await leaveService.applyLeave(form);
      setShowForm(false);
      setForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      load();
    } catch {
      /* ignore for now */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">My Leave</CardTitle>
        {canApply && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
          >
            Apply Leave
          </button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={form.leave_type}
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="annual">Annual</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <div />
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
            <textarea placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg md:col-span-2" />
            <button onClick={submit} disabled={submitting} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 md:col-span-2">
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && leaves.length === 0 && <p className="text-sm text-slate-400">No leave records.</p>}

        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
              <div>
                <p className="text-sm font-semibold text-slate-700 capitalize">{l.leave_type} Leave</p>
                <p className="text-[11px] text-slate-500">
                  {l.start_date} → {l.end_date}
                </p>
              </div>
              <Badge variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}>
                {l.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function DocumentsView() {
  const { canAccessModule } = useEmployeePortal();
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = () => {
    employeeDocumentService
      .list()
      .then(setDocs)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const canUpload = canAccessModule('documents', 'upload');

  const upload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title || file.name);
    const created = await employeeDocumentService.upload(fd);
    setDocs((prev) => [created, ...prev]);
    setTitle('');
    setFile(null);
  };

  const remove = async (id: string) => {
    await employeeDocumentService.remove(id);
    setDocs((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">My Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {canUpload && (
          <div className="flex flex-wrap gap-2 mb-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="px-3 py-2 border border-slate-300 rounded-lg" />
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            <button onClick={upload} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold">Upload</button>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && docs.length === 0 && <p className="text-sm text-slate-400">No documents.</p>}

        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{d.title}</p>
                <p className="text-[11px] text-slate-500">{d.document_type || d.file_name || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Open</a>
                )}
                {canAccessModule('documents', 'delete') && (
                  <button onClick={() => remove(d.id)} className="text-slate-400 hover:text-rose-600 text-xs">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function AnnouncementsView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Announcements & Notices</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-400">No announcements.</p>}
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{n.title || 'Notice'}</p>
                {!n.is_read && <Badge variant="info">New</Badge>}
              </div>
              {n.body && <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-line">{n.body}</p>}
              {n.created_at && (
                <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function ProfileView() {
  const { canAccessModule } = useEmployeePortal();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = () => {
    teacherService
      .getMyProfile()
      .then((res) => {
        const p = res.data || res;
        setProfile(p);
        setForm({
          phone: p.phone || '',
          home_address: p.home_address || p.address || '',
          education: p.education || '',
          father_husband_name: p.father_husband_name || p.fatherName || '',
          religion: p.religion || '',
          blood_group: p.blood_group || p.bloodGroup || '',
          national_id: p.national_id || p.cnic || '',
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const canEdit = canAccessModule('profile', 'edit');

  const save = async () => {
    setSaving(true);
    try {
      const updated = await teacherService.updateMyProfile(form);
      setProfile(updated);
      setEditing(false);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  const fields: [string, string, string][] = [
    ['Full Name', profile?.full_name || profile?.name || '—', 'full_name'],
    ['Employee ID', profile?.employee_id || '—', 'employee_id'],
    ['Email', profile?.email || '—', 'email'],
    ['Phone', profile?.phone || '—', 'phone'],
    ['Address', profile?.home_address || profile?.address || '—', 'home_address'],
    ['Education', profile?.education || '—', 'education'],
    ['Religion', profile?.religion || '—', 'religion'],
    ['Blood Group', profile?.blood_group || '—', 'blood_group'],
    ['National ID', profile?.national_id || profile?.cnic || '—', 'national_id'],
  ];
  const editableKeys = ['phone', 'home_address', 'education', 'father_husband_name', 'religion', 'blood_group', 'national_id'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">My Profile</CardTitle>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">
            Edit
          </button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.filter(([, , k]) => editableKeys.includes(k)).map(([label, , k]) => (
              <div key={k}>
                <label className="text-[11px] text-slate-500">{label}</label>
                <input
                  value={form[k] ?? ''}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            ))}
            <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 md:col-span-2">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
            {fields.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="text-sm font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function ReportsView() {
  return <ViewShell title="Reports" />;
}

export default EmployeePortal;
