import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, Search, Eye, Mail, Edit2, Trash2, RotateCcw, 
  Users, UserCheck, UserX, Award, Grid3X3, List, 
  Clock, GraduationCap, Filter, ChevronDown
} from 'lucide-react';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function TeachersManagement() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Debug effect to monitor teachers state
  useEffect(() => {
    if (teachers.length > 0) {
      console.log('=== TEACHERS STATE UPDATED ===');
      console.log('Total teachers:', teachers.length);
      teachers.forEach(t => {
        console.log(`${t.full_name}: is_active = ${t.is_active} (type: ${typeof t.is_active})`);
      });
      console.log('Active count (=== true):', teachers.filter(t => t.is_active === true).length);
      console.log('Inactive count (!== true):', teachers.filter(t => t.is_active !== true).length);
    }
  }, [teachers]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const tRes = await teacherService.getAll({ include_inactive: true }).catch(() => ({ data: [] }));
      
      // DEBUG: Log raw response
      console.log('RAW API Response:', JSON.stringify(tRes.data, null, 2));
      
      const fetched = extractListData<Teacher>(tRes.data);
      
      // DEBUG: Log extracted data
      console.log('EXTRACTED Data:', JSON.stringify(fetched, null, 2));
      
      setTeachers(fetched);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete employee ${name}?`)) return;
    try {
      await teacherService.deleteTeacher(id);
      toast.success('Employee deleted successfully.');
      fetchTeachers();
    } catch (err) {
      toast.error('Failed to delete employee');
    }
  };

  const getEmployeeRole = (teacher: Teacher) => {
    return teacher.specializations?.[0] || 'Teacher';
  };

  const getStatus = (teacher: Teacher): 'active' | 'inactive' => {
    return teacher.is_active === true ? 'active' : 'inactive';
  };

  // Filter teachers
  const filteredTeachers = teachers.filter(t => {
    // Status filter
    const status = getStatus(t);
    if (statusFilter === 'active' && status !== 'active') return false;
    if (statusFilter === 'inactive' && status !== 'inactive') return false;
    
    // Search filter
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    const empRole = getEmployeeRole(t).toLowerCase();
    return (
      t.full_name.toLowerCase().includes(query) ||
      (t.employee_id || '').toLowerCase().includes(query) ||
      empRole.includes(query) ||
      (t.email || '').toLowerCase().includes(query) ||
      (t.phone || '').includes(query)
    );
  });

  // Pagination
  const totalEntries = filteredTeachers.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;

  // Stats
  const totalEmployees = teachers.length;
  const activeEmployees = teachers.filter(t => t.is_active === true).length;
  const inactiveEmployees = teachers.filter(t => t.is_active !== true).length;

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-500">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800">
      {/* Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Users className="w-4 h-4" />
          <span>Employees</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">All Employees</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTeachers} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={() => navigate('/education/teachers/add')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Employee
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalEmployees}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Employees</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{activeEmployees}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{inactiveEmployees}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {teachers.reduce((sum, t) => sum + (t.experience_years || 0), 0)}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Experience</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, phone or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-slate-400 text-slate-700"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'active' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'inactive' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredTeachers.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* Add New Dotted Box */}
              <button
                onClick={() => navigate('/education/teachers/add')}
                className="aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-200 hover:border-purple-400 bg-white/50 hover:bg-white flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-purple-600">Add New</span>
              </button>

              {/* Employee Cards */}
              {currentItems.map((teacher) => {
                const empRole = getEmployeeRole(teacher);
                const status = getStatus(teacher);
                return (
                  <div 
                    key={teacher.id}
                    className="aspect-[4/5] bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center justify-between text-center transition-all hover:shadow-md hover:-translate-y-0.5 relative"
                  >
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${
                        status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center space-y-2 mt-2">
                      <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-0.5 shadow-2xs">
                        {teacher.profile_picture ? (
                          <img src={teacher.profile_picture} alt={teacher.full_name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-2xl font-bold text-purple-600">
                            {teacher.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-slate-800 text-xs tracking-tight truncate max-w-[110px]" title={teacher.full_name}>
                          {teacher.full_name}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold">{empRole}</p>
                        <p className="text-[8px] text-slate-300">ID: {teacher.employee_id || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        onClick={() => navigate(`/education/teachers/${teacher.id}`)}
                        className="p-1.5 bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded-lg border border-slate-150 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/education/teachers/${teacher.id}/edit`)}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-150 transition-colors"
                        title="Edit Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.full_name)}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-150 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Qualification</th>
                      <th className="py-3 px-4">Experience</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((teacher) => {
                      const empRole = getEmployeeRole(teacher);
                      const status = getStatus(teacher);
                      return (
                        <tr key={teacher.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
                                {teacher.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{teacher.full_name}</p>
                                <p className="text-[10px] text-slate-400">{teacher.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{teacher.employee_id || '--'}</td>
                          <td className="py-3 px-4">{empRole}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {teacher.qualifications?.slice(0, 2).map((q, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-semibold rounded-full">
                                  {q}
                                </span>
                              ))}
                              {teacher.qualifications && teacher.qualifications.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[9px] font-semibold rounded-full">
                                  +{teacher.qualifications.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">{teacher.experience_years || 0} years</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => navigate(`/education/teachers/${teacher.id}`)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                title="View"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => navigate(`/education/teachers/${teacher.id}/edit`)}
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id, teacher.full_name)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalEntries > itemsPerPage && (
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
              <div>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
                >
                  Previous
                </button>
                <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold">
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
          )}
        </>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">👨‍🏫</div>
          <h3 className="text-lg font-bold text-slate-700">No Employees Found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {searchTerm ? 'No employees match your search.' : 'Click "Add New Employee" to add your first employee.'}
          </p>
        </div>
      )}
    </div>
  );
}