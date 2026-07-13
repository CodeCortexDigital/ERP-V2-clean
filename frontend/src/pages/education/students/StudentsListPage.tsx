import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Plus, Trash2, Edit3, RefreshCw, Eye, Hexagon, FileText,
  Grid3X3, List, ArrowUpDown, User, Users, UserCheck, UserX
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';
import { toast } from 'sonner';
import AddStudentPage from './AddStudentPage';

interface StudentItem {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  profile_picture?: string;
}

type ViewMode = 'grid' | 'list';
type SortOrder = 'asc' | 'desc';

// Helper function to get avatar with initials fallback
const getStudentAvatar = (student: any): string => {
  // If profile picture exists and is valid, use it
  if (student.profile_picture && student.profile_picture.startsWith('http')) {
    return student.profile_picture;
  }
  
  // Generate initials-based avatar
  const name = student.full_name || student.name || 'Student';
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Colors for avatar backgrounds
  const colors = [
    '#4C469D', '#E74C3C', '#2ECC71', '#F39C12', '#3498DB', 
    '#9B59B6', '#1ABC9C', '#E67E22', '#E84393', '#00B894',
    '#6C5CE7', '#FD79A8', '#0984E3', '#00CEC9', '#6C5CE7'
  ];
  
  // Use the name to pick a consistent color
  const colorIndex = name.length % colors.length;
  const backgroundColor = colors[colorIndex];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor.replace('#', '')}&color=fff&size=128&bold=true&font-size=0.5`;
};

export default function StudentsListPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isNewStudentAction = location.search.includes('action=new');

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Specific placeholder detection
  const isPlaceholderStudent = (student: any) => {
    if (!student) return true;
    
    const id = String(student.id || '').trim();
    const studentId = String(student.student_id || '').trim();
    const fullName = String(student.full_name || student.name || '').trim().toLowerCase();
    
    if (id === 'std-1' || id === 'std-2' || id === 'std-3') return true;
    if (studentId === '001' || studentId === '002' || studentId === '003') return true;
    
    const placeholderNames: string[] = [];
    if (placeholderNames.includes(fullName)) return true;
    
    return false;
  };

  // Deduplicate students by ID
  const deduplicateStudents = (studentsList: any[]) => {
    const seen = new Map();
    const result: any[] = [];
    
    for (const student of studentsList) {
      if (isPlaceholderStudent(student)) continue;
      
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
  }, [location.search]);

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
        
        if (classesRes) {
          if (Array.isArray(classesRes)) {
            rawClasses = classesRes;
          } else if (classesRes.data && Array.isArray(classesRes.data)) {
            rawClasses = classesRes.data;
          } else if (classesRes.results && Array.isArray(classesRes.results)) {
            rawClasses = classesRes.results;
          } else if (classesRes.data?.results && Array.isArray(classesRes.data.results)) {
            rawClasses = classesRes.data.results;
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
          
          if (classesRes2) {
            if (Array.isArray(classesRes2)) {
              rawClasses = classesRes2;
            } else if (classesRes2.data && Array.isArray(classesRes2.data)) {
              rawClasses = classesRes2.data;
            } else if (classesRes2.results && Array.isArray(classesRes2.results)) {
              rawClasses = classesRes2.results;
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
      const processedStudents = rawStudents.map((s: any) => ({
        id: s.id || `std-${Math.random()}`,
        student_id: s.student_id || s.registration_no || '',
        full_name: s.full_name || s.name || 'Student',
        class_name: s.class_name || s.current_class_name || s.current_class || s.class || '',
        profile_picture: s.profile_picture || s.avatar || '',
        is_active: s.is_active ?? true,
        status: s.status
      }));

      const uniqueStudents = deduplicateStudents(processedStudents);
      
      // Sort students in ascending order by name
      const sortedStudents = uniqueStudents.sort((a, b) => {
        const nameA = (a.full_name || '').toLowerCase();
        const nameB = (b.full_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setStudents(sortedStudents);

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await studentService.delete(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.success(`${name} deleted permanently`);
    } catch (err) {
      toast.error('Failed to delete student');
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (isNewStudentAction) {
    return <AddStudentPage />;
  }

  // Filter and sort students
  const filteredAndSortedStudents = students
    .filter(s => {
      const matchesSearch = (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.student_id || '').includes(searchTerm);
      const matchesClass = !selectedClass || (s.class_name || '') === selectedClass;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      const nameA = (a.full_name || '').toLowerCase();
      const nameB = (b.full_name || '').toLowerCase();
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
    <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <GraduationCap className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/dashboard')}>Students</span>
          <span>&gt;</span>
          <span className="text-slate-500">All Students</span>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchStudentsAndClasses} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
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
              <p className="text-2xl font-black text-slate-800">{students.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {students.filter(s => (s as any).is_active === true).length}
              </p>
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
              <p className="text-2xl font-black text-slate-800">
                {students.filter(s => (s as any).is_active !== true).length}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Inactive</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{classes.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Classes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">SEARCH STUDENT</label>
            <Input 
              placeholder="Type student name or reg number..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="text-xs h-11 rounded-xl border-slate-200 bg-white" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FILTER BY CLASS</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
            >
              <option value="">-- Select a class --</option>
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

            <button 
              onClick={() => navigate('/education/students/add')} 
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>
      </div>

      {/* Student Display */}
      {students.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">👨‍🎓</div>
          <h3 className="text-lg font-bold text-slate-700">No Students Found</h3>
          <p className="text-sm text-slate-500 mt-2">Please add students to get started.</p>
          <button 
            onClick={() => navigate('/education/students/add')} 
            className="mt-4 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4 inline mr-2" /> Add First Student
          </button>
        </div>
      ) : filteredAndSortedStudents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400">No students found matching filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // GRID VIEW
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 pt-2">
          {filteredAndSortedStudents.map((std) => {
            const avatarUrl = getStudentAvatar(std);
            
            return (
              <div key={std.id || std.student_id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs flex flex-col items-center text-center space-y-3 relative hover:shadow-md transition-all">
                {/* Circular Avatar Image */}
                <div 
                  onClick={() => navigate(`/education/students/${std.id}`)}
                  className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-100 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={std.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                {/* Name & Reg No */}
                <div onClick={() => navigate(`/education/students/${std.id}`)} className="cursor-pointer group">
                  <h3 className="font-bold text-sm text-slate-800 group-hover:text-purple-600 transition-colors">{std.full_name}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{std.student_id}</p>
                </div>

                {/* Class Tag */}
                {std.class_name && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold">
                    {std.class_name}
                  </span>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <button 
                    onClick={() => navigate(`/education/students/${std.id}`)}
                    className="w-8 h-8 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors"
                    title="View Student Report"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => navigate(`/education/students/admission-letter?id=${std.id}`)}
                    className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                    title="View Admission Letter"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => navigate(`/education/students/${std.id}/edit`)}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                    title="Edit Student"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteStudent(std.id, std.full_name)}
                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors"
                    title="Delete Student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Student Card */}
          <div 
            onClick={() => navigate('/education/students/add')} 
            className="bg-white rounded-2xl p-6 border-2 border-dashed border-slate-200 hover:border-purple-400 flex flex-col items-center justify-center text-center cursor-pointer min-h-[180px] transition-all group shadow-2xs"
          >
            <div className="w-12 h-12 rounded-full bg-purple-600 group-hover:bg-purple-700 text-white flex items-center justify-center shadow-md mb-2 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-xs">Add New</h3>
            <p className="text-[11px] text-slate-400">Student</p>
          </div>
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
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedStudents.map((std) => {
                  const avatarUrl = getStudentAvatar(std);
                  
                  return (
                    <tr key={std.id || std.student_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => navigate(`/education/students/${std.id}`)}
                            className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 flex items-center justify-center"
                          >
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={std.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p 
                              onClick={() => navigate(`/education/students/${std.id}`)}
                              className="font-bold text-slate-800 text-sm cursor-pointer hover:text-purple-600 transition-colors"
                            >
                              {std.full_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {std.student_id}
                      </td>
                      <td className="py-3 px-4">
                        {std.class_name ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-semibold">
                            {std.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No class</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/education/students/${std.id}`)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/education/students/admission-letter?id=${std.id}`)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Admission Letter"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/education/students/${std.id}/edit`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(std.id, std.full_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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