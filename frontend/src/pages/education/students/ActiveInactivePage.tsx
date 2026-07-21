import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, RefreshCw, CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  Grid3X3, List, ArrowUpDown
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list';
type SortOrder = 'asc' | 'desc';

export default function ActiveInactivePage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Specific placeholder detection - only filter out known test/placeholder students
  const isPlaceholderStudent = (student: any) => {
    if (!student) return true;
    
    const id = String(student.id || '').trim();
    const studentId = String(student.student_id || '').trim();
    const fullName = String(student.full_name || student.name || '').trim().toLowerCase();
    
    // Only filter out very specific known placeholders
    if (id === 'std-1' || id === 'std-2' || id === 'std-3') return true;
    if (studentId === '001' || studentId === '002' || studentId === '003') return true;
    
    // Only filter out exact placeholder names (not substrings)
    const placeholderNames = ['urwah', 'urwah azhar', 'sundas', 'sundasg', 'sundas azhar'];
    if (placeholderNames.includes(fullName)) return true;
    
    return false;
  };

  // Deduplicate students by ID
  const deduplicateStudents = (studentsList: any[]) => {
    const seen = new Map();
    const result: any[] = [];
    
    for (const student of studentsList) {
      // Skip placeholder students
      if (isPlaceholderStudent(student)) continue;
      
      // Use both id and student_id for deduplication
      const idKey = student.id || student.student_id;
      
      if (!seen.has(idKey)) {
        seen.set(idKey, true);
        result.push(student);
      }
    }
    
    return result;
  };

  useEffect(() => {
    fetchStudentsAndClasses();
  }, []);

  const fetchStudentsAndClasses = async () => {
    setLoading(true);
    try {
      // Fetch students
      const studentsRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(studentsRes.data || []);

      // Fetch classes - with multiple approaches
      let rawClasses: any[] = [];
      
      // Approach 1: Try academicService.getClasses()
      try {
        const classesRes = await academicService.getClasses();
        console.log('📚 Classes API Response (getClasses):', classesRes);
        
        const cr = classesRes as any;
        if (cr) {
          if (Array.isArray(cr)) {
            rawClasses = cr;
          } else if (cr.data && Array.isArray(cr.data)) {
            rawClasses = cr.data;
          } else if (cr.results && Array.isArray(cr.results)) {
            rawClasses = cr.results;
          } else if (cr.data?.results && Array.isArray(cr.data.results)) {
            rawClasses = cr.data.results;
          }
        }
      } catch (err) {
        console.log('📚 academicService.getClasses() failed, trying alternative...');
      }

      // Approach 2: Try academicService.classes.getAll()
      if (rawClasses.length === 0) {
        try {
          const classesRes2 = await academicService.classes?.getAll?.();
          console.log('📚 Classes API Response (classes.getAll):', classesRes2);
          
          const cr2 = classesRes2 as any;
          if (cr2) {
            if (Array.isArray(cr2)) {
              rawClasses = cr2;
            } else if (cr2.data && Array.isArray(cr2.data)) {
              rawClasses = cr2.data;
            } else if (cr2.results && Array.isArray(cr2.results)) {
              rawClasses = cr2.results;
            }
          }
        } catch (err) {
          console.log('📚 academicService.classes.getAll() failed too');
        }
      }

      // Approach 3: Extract classes from students data
      if (rawClasses.length === 0 && rawStudents.length > 0) {
        console.log('📚 Extracting classes from students data...');
        const uniqueClassNames = new Set<string>();
        rawStudents.forEach((s: any) => {
          const className = s.class_name || s.current_class_name || s.current_class || s.class || '';
          if (className) {
            uniqueClassNames.add(className.trim());
          }
        });
        rawClasses = Array.from(uniqueClassNames).map(name => ({
          id: `class-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name: name,
          code: name.substring(0, 4).toUpperCase()
        }));
        console.log('📚 Classes extracted from students:', rawClasses);
      }

      // Process classes - filter and deduplicate
      const processedClasses = rawClasses
        .filter((c: any) => c && c.name)
        .map((c: any) => ({
          id: c.id || `class-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: c.name || 'Unnamed Class',
          code: c.code || c.class_code || ''
        }));

      // Deduplicate by name
      const seenNames = new Set<string>();
      const uniqueClasses = processedClasses.filter((c: any) => {
        const nameKey = c.name.trim().toLowerCase();
        if (seenNames.has(nameKey)) return false;
        seenNames.add(nameKey);
        return true;
      });

      // Sort by name
      const sortedClasses = uniqueClasses.sort((a: any, b: any) => a.name.localeCompare(b.name));
      
      console.log('📚 Final classes list:', sortedClasses);
      setClasses(sortedClasses);

      // Process students
      const filteredDbStudents = rawStudents.filter((s: any) => !isPlaceholderStudent(s));
      const uniqueStudents = deduplicateStudents(filteredDbStudents);
      
      // Sort students in ascending order by name
      const sortedStudents = uniqueStudents.sort((a: any, b: any) => {
        const nameA = (a.full_name || a.name || '').toLowerCase();
        const nameB = (b.full_name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setStudents(sortedStudents);

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load students list');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: boolean, name: string) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_active: newStatus } : s));
    
    try {
      await studentService.update(studentId, { is_active: newStatus });
      toast.success(`Status for "${name}" updated to ${newStatus ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      // Revert if failed
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, is_active: currentStatus } : s));
      toast.error('Failed to update student status');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Global stats counts across all loaded students
  const totalStudentsCount = students.filter(s => !isPlaceholderStudent(s)).length;
  const activeStudentsCount = students.filter(s => !isPlaceholderStudent(s) && s.is_active !== false && s.status !== 'inactive').length;
  const inactiveStudentsCount = students.filter(s => !isPlaceholderStudent(s) && (s.is_active === false || s.status === 'inactive')).length;

  // Filter and sort students
  const filteredAndSortedStudents = students
    .filter((std) => {
      // Skip placeholder students
      if (isPlaceholderStudent(std)) return false;

      const isActive = std.is_active !== false && std.status !== 'inactive';
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;

      const matchesSearch = 
        (std.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (std.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (std.student_id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const stdClass = (std as any).class_name || (std as any).current_class_name || (std as any).current_class || (std as any).class || '';
      const matchesClass = selectedClass === '' || stdClass.toLowerCase().trim() === selectedClass.toLowerCase().trim();

      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      const nameA = (a.full_name || a.name || '').toLowerCase();
      const nameB = (b.full_name || b.name || '').toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-500">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/students')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">Active / Inactive Status</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchStudentsAndClasses} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
          <button 
            onClick={() => navigate('/education/students')} 
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>

      {/* Stats Overview - Clickable Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Students Card */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-left bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs hover:-translate-y-0.5 ${
            statusFilter === 'all'
              ? 'border-purple-300 ring-2 ring-purple-600 shadow-md bg-purple-50/20 scale-[1.02]'
              : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              statusFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{totalStudentsCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
            </div>
          </div>
        </button>

        {/* Active Students Card */}
        <button
          onClick={() => setStatusFilter('active')}
          className={`text-left bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs hover:-translate-y-0.5 ${
            statusFilter === 'active'
              ? 'border-emerald-300 ring-2 ring-emerald-600 shadow-md bg-emerald-50/20 scale-[1.02]'
              : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{activeStudentsCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Students</p>
            </div>
          </div>
        </button>

        {/* Inactive Students Card */}
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`text-left bg-white p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs hover:-translate-y-0.5 ${
            statusFilter === 'inactive'
              ? 'border-rose-300 ring-2 ring-rose-600 shadow-md bg-rose-50/20 scale-[1.02]'
              : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              statusFilter === 'inactive' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
            }`}>
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{inactiveStudentsCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inactive Students</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SEARCH STUDENT</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <Input 
                placeholder="Search by name or reg..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="text-xs h-11 pl-9 rounded-xl border-slate-200 bg-white" 
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FILTER BY CLASS</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            >
              <option value="">-- All Classes --</option>
              {classes.length === 0 ? (
                <option value="" disabled>No classes available</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
            {classes.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">No classes found. Please add a class first.</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SORT ORDER</label>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSortOrder}
                className="flex items-center gap-2 px-3 py-2 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors w-full"
              >
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">
                  {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Display */}
      {students.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">👨‍🎓</div>
          <h3 className="text-lg font-bold text-slate-700">No Students Found</h3>
          <p className="text-xs text-slate-400 mt-2">Please add students to manage their active/inactive status.</p>
        </div>
      ) : filteredAndSortedStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400">No students found matching filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // GRID VIEW
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSortedStudents.map((std) => {
            const isActive = std.is_active !== false && std.status !== 'inactive';
            
            return (
              <div 
                key={std.id || std.student_id} 
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col items-center text-center space-y-4 relative hover:shadow-md transition-all"
              >
                {/* Circular Profile Pic */}
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-2xs">
                  <img 
                    src={std.profile_picture || std.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                    alt={std.full_name || std.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{std.full_name || std.name}</h3>
                  <p className="text-[11px] font-bold text-purple-600/80 mt-0.5">{(std as any).class_name || (std as any).current_class_name || (std as any).class || 'No Class'}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">{std.student_id || std.registration_no || '--'}</p>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>

                {/* Toggle Action */}
                <div className="w-full pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Portal Status</span>
                  <button 
                    onClick={() => handleToggleStatus(std.id, isActive, std.full_name || std.name)}
                    className="text-slate-400 hover:text-purple-600 transition-colors focus:outline-none"
                    title={isActive ? 'Deactivate Student' : 'Activate Student'}
                  >
                    {isActive ? (
                      <ToggleRight className="w-10 h-6 text-purple-600" />
                    ) : (
                      <ToggleLeft className="w-10 h-6 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // LIST VIEW
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Registration No</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Portal Access</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStudents.map((std) => {
                  const isActive = std.is_active !== false && std.status !== 'inactive';
                  
                  return (
                    <tr key={std.id || std.student_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                            <img 
                              src={std.profile_picture || std.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} 
                              alt={std.full_name || std.name} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{std.full_name || std.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {std.student_id || std.registration_no || '--'}
                      </td>
                      <td className="py-3 px-4">
                        {std.class_name || std.current_class_name || std.class ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold">
                            {std.class_name || std.current_class_name || std.class}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No class</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => handleToggleStatus(std.id, isActive, std.full_name || std.name)}
                          className="text-slate-400 hover:text-purple-600 transition-colors focus:outline-none"
                          title={isActive ? 'Deactivate Student' : 'Activate Student'}
                        >
                          {isActive ? (
                            <ToggleRight className="w-10 h-6 text-purple-600" />
                          ) : (
                            <ToggleLeft className="w-10 h-6 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* List View Footer */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              Showing {filteredAndSortedStudents.length} of {students.length} students
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium">
                Sorted: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}