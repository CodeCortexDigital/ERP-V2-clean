import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, RotateCcw, Copy, Printer, ChevronDown, User, Lock, Eye, EyeOff } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import credentialsService, { passwordLabel, type StaffLogins } from '@/services/credentials.service';

export default function StaffLoginsPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Credentials store
  // Real portal logins from the server, keyed by teacher record id.
  const [credentials, setCredentials] = useState<Record<string, StaffLogins>>({});
  const [issuing, setIssuing] = useState(false);
  const [progress, setProgress] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Filter and search states
  const [selectedRole, setSelectedRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await teacherService.getAll().catch(() => ({ data: [] }));
      const rawTeachers = extractListData<any>(res.data || []);

      setTeachers(rawTeachers);
      setCredentials(await credentialsService.listStaff());
    } catch (err) {
      toast.error('Failed to load staff login list');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (teacherId: string) => {
    if (!window.confirm('Issue a new password for this staff member? The current one will stop working.')) return;
    try {
      const fresh = await credentialsService.resetStaff(teacherId);
      setCredentials((prev) => ({ ...prev, [teacherId]: fresh }));
      setVisiblePasswords((prev) => ({ ...prev, [teacherId]: true }));
      toast.success('New password issued. Print the job offer letter to hand it over.');
    } catch {
      toast.error('Could not reset the password.');
    }
  };

  const missingCount = Object.values(credentials).filter((c) => c.staff.status === 'not_issued').length;

  const handleIssueMissing = async () => {
    setIssuing(true);
    try {
      const issued = await credentialsService.issueMissing('teachers', (done, remaining) =>
        setProgress(`${done} of ${done + remaining}`));
      setCredentials(await credentialsService.listStaff());
      toast.success(`Generated ${issued} staff login${issued === 1 ? '' : 's'}.`);
    } catch {
      toast.error('Could not generate logins.');
    } finally {
      setIssuing(false);
      setProgress('');
    }
  };

  const handleExport = (type: string) => {
    toast.success(`${type} export started!`);
  };

  // Filter staff based on selection & search
  const filteredTeachers = teachers.filter(t => {
    const extraRole = t.designation || t.specializations?.[0] || 'Teacher';

    const roleMatch = selectedRole === '' || extraRole.toLowerCase().trim() === selectedRole.toLowerCase().trim();
    
    const query = searchTerm.toLowerCase();
    const searchMatch = 
      (t.full_name || '').toLowerCase().includes(query) ||
      (t.employee_id || '').toLowerCase().includes(query) ||
      (t.phone || '').toLowerCase().includes(query);

    return roleMatch && searchMatch;
  });

  // Unique roles list for dropdown filter
  const rolesList = ['Principal', 'Management Staff', 'Teacher', 'Accountant', 'Store Manager', 'Other'];

  // Pagination logic
  const totalEntries = filteredTeachers.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate('/education/teachers')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Employees
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Staff Login</span>
        </div>

        <button 
          onClick={fetchData} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {/* 1. FILTER & SEARCH CONTROL CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Search Employee</label>
            <input
              type="text"
              placeholder="Type employee name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Filter By Role</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            >
              <option value="">-- Select role --</option>
              {rolesList.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Badges indicators on the right */}
          <div className="flex items-center gap-2 lg:justify-end">
            <div className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 shrink-0">
              👥 {totalEntries} Employees
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100 shrink-0">
              🏫 All Roles
            </div>
            <button 
              onClick={() => {
                setSelectedRole('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold border border-purple-100 shrink-0 transition-colors"
            >
              🔄 Show All
            </button>
          </div>

        </div>
      </div>

      {/* 2. STAFF LOGIN CREDENTIALS TABLE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Table Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 pb-2">
            <GraduationCap className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Staff Login Credentials</h2>
            {missingCount > 0 && (
              <button
                onClick={handleIssueMissing}
                disabled={issuing}
                className="ml-2 px-3 py-1.5 rounded-lg bg-brand text-[11px] font-bold disabled:opacity-60"
              >
                {issuing ? `Generating… ${progress}` : `Generate ${missingCount} missing login${missingCount === 1 ? '' : 's'}`}
              </button>
            )}
          </div>

          {/* Actions & Table Search */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 gap-1 text-[11px] font-bold">
              <button onClick={() => handleExport('Copy')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">Copy</button>
              <button onClick={() => handleExport('CSV')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">CSV</button>
              <button onClick={() => handleExport('Excel')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">Excel</button>
              <button onClick={() => handleExport('PDF')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">PDF</button>
              <button onClick={() => window.print()} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all flex items-center gap-1"><Printer className="w-3 h-3" /> Print</button>
              <button className="px-2.5 py-1 text-slate-600 flex items-center gap-1">Column visibility <ChevronDown className="w-3 h-3" /></button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-44 font-semibold text-slate-600 transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Dynamic HTML Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((t, idx) => {
                  const extraRole = t.designation || t.specializations?.[0] || 'Teacher';

                  const login = credentials[t.id]?.staff;
                  const hasPassword = Boolean(login?.password);
                  const isVisible = visiblePasswords[t.id] || false;

                  return (
                    <tr key={t.id || t.employee_id || `login-${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-500">{t.employee_id || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{t.full_name}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-600">{extraRole}</td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-2 font-mono font-semibold text-slate-700">
                          <User className="w-4 h-4 text-slate-400" />
                          {login?.username || t.employee_id || '--'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span className={hasPassword ? 'font-mono font-semibold text-slate-700' : 'text-slate-400 italic'}>
                            {hasPassword && !isVisible ? '••••••••' : passwordLabel(login)}
                          </span>
                          {hasPassword && (
                            <button
                              type="button"
                              onClick={() => setVisiblePasswords((prev) => ({ ...prev, [t.id]: !isVisible }))}
                              className="text-slate-400 hover:text-slate-600"
                              aria-label={isVisible ? 'Hide password' : 'Show password'}
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleReset(t.id)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Issue a new password"
                            aria-label="Issue a new password"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/education/teachers/job-letter?teacher_id=${t.id}`)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Open job offer letter (print to hand over the login)"
                            aria-label="Open job offer letter"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No matching staff login records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination info bar */}
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pt-4 border-t border-slate-5">
          <div>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              Previous
            </button>
            <button className="px-3 py-1.5 bg-[#4C469D] text-white rounded-lg font-bold">
              {currentPage}
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
