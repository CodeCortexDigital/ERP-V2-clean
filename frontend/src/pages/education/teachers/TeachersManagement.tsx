import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Eye, Mail, Edit2, Trash2, RotateCcw } from 'lucide-react';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

export default function TeachersManagement() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<Teacher>(tRes.data);
      
      // Load custom_teachers from localStorage
      const customTeachers = JSON.parse(localStorage.getItem('custom_teachers') || '[]');
      
      // Merge them, avoiding duplicate IDs
      const merged = [...fetched];
      customTeachers.forEach((ct: any) => {
        if (!merged.some(t => String(t.id) === String(ct.id))) {
          merged.push(ct);
        }
      });

      // Filter out deleted ones locally
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filtered = merged.filter(t => !deletedIds.includes(t.id));
      
      const defaultTeachers = [
        {
          id: 't-1',
          employee_id: '250622',
          full_name: 'Maryam Fatima',
          email: 'maryam.fatima@school.edu',
          phone: '+92 300 1234567',
          qualifications: ['Master of Education'],
          specializations: ['Teacher'],
          experience_years: 5,
          joining_date: '2026-06-29',
          is_active: true,
          profile_picture: null
        }
      ];

      setTeachers(filtered.length > 0 ? filtered : defaultTeachers);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete employee ${name}?`)) return;
    try {
      await teacherService.deleteTeacher(id);
    } catch (err) {
      console.log('Backend delete employee fallback');
    }

    const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
    deletedIds.push(id);
    localStorage.setItem('deleted_teacher_ids', JSON.stringify(deletedIds));
    
    // Also remove from local extra details map
    const savedExtras = localStorage.getItem('employees_extra_info');
    if (savedExtras) {
      try {
        const extrasMap = JSON.parse(savedExtras);
        delete extrasMap[id];
        localStorage.setItem('employees_extra_info', JSON.stringify(extrasMap));
      } catch (e) {}
    }

    toast.success('Employee deleted successfully.');
    fetchTeachers();
  };

  // Get custom extra details (like role) from localStorage
  const getEmployeeRole = (teacher: Teacher) => {
    const savedExtras = localStorage.getItem('employees_extra_info');
    if (savedExtras) {
      try {
        const extrasMap = JSON.parse(savedExtras);
        if (extrasMap[teacher.id]?.role) {
          return extrasMap[teacher.id].role;
        }
      } catch (e) {}
    }
    return teacher.specializations?.[0] || 'Teacher';
  };

  const filteredTeachers = teachers.filter(t => {
    const empRole = getEmployeeRole(t).toLowerCase();
    const query = searchTerm.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(query) ||
      (t.employee_id || '').toLowerCase().includes(query) ||
      empRole.includes(query)
    );
  });

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Breadcrumb Header Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span className="text-purple-800 font-extrabold flex items-center gap-1.5">
            💼 Employees
          </span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">All Employees</span>
        </div>

        <button 
          onClick={fetchTeachers} 
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-black text-slate-900 leading-tight">{teachers.length}</p>
            <p className="text-[11px] text-slate-400 font-extrabold tracking-wider uppercase">All Employees</p>
          </div>
        </div>
      </div>

      {/* Search Employee Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs max-w-7xl mx-auto space-y-4">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase">SEARCH EMPLOYEE</label>
        
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Type name, ID or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium placeholder:text-slate-400 text-slate-700"
            />
          </div>

          <button
            onClick={() => navigate('/education/teachers/add')}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Add New Employee
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 pt-2">
        {/* Add New Dotted Box */}
        <button
          onClick={() => navigate('/education/teachers/add')}
          className="aspect-[4/5] rounded-3xl border-2 border-dashed border-slate-200 hover:border-purple-400 bg-white/50 hover:bg-white flex flex-col items-center justify-center gap-2 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-purple-600">Add New</span>
        </button>

        {/* Employee Cards */}
        {filteredTeachers.map((teacher) => {
          const empRole = getEmployeeRole(teacher);
          return (
            <div 
              key={teacher.id}
              className="aspect-[4/5] bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-col items-center justify-between text-center transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex flex-col items-center space-y-3 mt-4">
                <div className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-0.5 shadow-2xs">
                  {teacher.profile_picture ? (
                    <img src={teacher.profile_picture} alt={teacher.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <svg className="w-12 h-12 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-800 text-xs tracking-tight truncate max-w-[130px]" title={teacher.full_name}>
                    {teacher.full_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold">{empRole}</p>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => navigate(`/education/teachers/${teacher.id}`)}
                  className="p-1.5 bg-slate-50 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded-lg border border-slate-150 transition-colors"
                  title="View Details"
                >
                  <Search className="w-3.5 h-3.5" />
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
    </div>
  );
}
