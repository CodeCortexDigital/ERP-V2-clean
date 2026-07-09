import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  GraduationCap, ArrowLeft, RotateCcw, Check, Sparkles, FolderSync, 
  Users, Filter, Search, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';

export default function PromoteStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  
  // Selection and promotion states
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetClass, setTargetClass] = useState('');

  // Filter and search states
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Bulk promotion state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSourceClass, setBulkSourceClass] = useState('');
  const [bulkTargetClass, setBulkTargetClass] = useState('');

  // Specific placeholder detection
  const isPlaceholderStudent = (student: any) => {
    if (!student) return true;
    
    const id = String(student.id || '').trim();
    const studentId = String(student.student_id || '').trim();
    const fullName = String(student.full_name || student.name || '').trim().toLowerCase();
    
    if (id === 'std-1' || id === 'std-2' || id === 'std-3') return true;
    if (studentId === '001' || studentId === '002' || studentId === '003') return true;
    
    const placeholderNames = ['urwah', 'urwah azhar', 'sundas', 'sundasg', 'sundas azhar'];
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students with fresh data
      const sRes = await studentService.getAll({ page_size: 1000 }).catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(sRes.data || []);

      // Fetch classes
      let rawClasses: any[] = [];
      
      try {
        const classesRes = await academicService.getClasses();
        console.log('📚 Classes API Response:', classesRes);
        
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
        console.log('📚 academicService.getClasses() failed');
      }

      // Process classes
      const processedClasses = rawClasses
        .filter((c: any) => c && c.name)
        .map((c: any) => ({
          id: c.id || `class-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: c.name || 'Unnamed Class',
          code: c.code || c.class_code || ''
        }));

      const seenNames = new Set<string>();
      const uniqueClasses = processedClasses.filter((c: any) => {
        const nameKey = c.name.trim().toLowerCase();
        if (seenNames.has(nameKey)) return false;
        seenNames.add(nameKey);
        return true;
      });

      const sortedClasses = uniqueClasses.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setClasses(sortedClasses);

      // Process students
      const filteredDbStudents = rawStudents.filter(s => !isPlaceholderStudent(s));
      const uniqueStudents = deduplicateStudents(filteredDbStudents);
      
      console.log('📚 Students after refresh:', uniqueStudents.length);
      console.log('📚 Sample student classes:', uniqueStudents.slice(0, 3).map(s => ({
        name: s.full_name,
        class: s.class_name || s.current_class_name || s.current_class
      })));
      
      setStudents(uniqueStudents);
      setSelectedStudentIds(new Set());

    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load students promotion list');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on selection & search
  const filteredStudents = students.filter(s => {
    if (isPlaceholderStudent(s)) return false;
    
    const sClass = s.class_name || s.current_class_name || s.current_class || s.class || '';
    const classMatch = selectedClass === '' || sClass.toLowerCase().trim() === selectedClass.toLowerCase().trim();
    
    const query = searchTerm.toLowerCase();
    const searchMatch = 
      (s.full_name || '').toLowerCase().includes(query) ||
      (s.name || '').toLowerCase().includes(query) ||
      (s.student_id || '').toLowerCase().includes(query);

    return classMatch && searchMatch;
  });

  // Pagination logic
  const totalEntries = filteredStudents.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;

  // Toggle selection functions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = currentItems.map(s => s.id);
      setSelectedStudentIds(new Set(allIds));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleSelectStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  // Get the target class ID from the class name
  const getTargetClassId = (className: string): string | null => {
    const foundClass = classes.find(c => c.name === className);
    return foundClass?.id || null;
  };

  // Promote Selected Students
  const handlePromoteSelected = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error('Please select at least one student');
      return;
    }
    if (!targetClass) {
      toast.error('Please select a target class to promote to');
      return;
    }

    setPromoting(true);
    try {
      const selectedArray = Array.from(selectedStudentIds);
      let promotedCount = 0;
      const targetClassId = getTargetClassId(targetClass);

      for (const id of selectedArray) {
        if (!id.startsWith('std-')) {
          try {
            // Find the student to get their current data
            const student = students.find(s => s.id === id);
            if (student) {
              // Update with both class name and class ID
              const updateData: any = {
                class_name: targetClass,
                current_class_name: targetClass,
              };
              
              // If we have a class ID, also update the class reference
              if (targetClassId) {
                updateData.current_class = targetClassId;
              }
              
              await studentService.update(id, updateData);
              promotedCount++;
              console.log(`✅ Promoted student ${student.full_name} to ${targetClass}`);
            }
          } catch (e) {
            console.error(`❌ Failed to promote student ${id}:`, e);
          }
        }
      }

      toast.success(`Promoted ${promotedCount} student(s) to ${targetClass} successfully!`);
      
      // Reset selections
      setTargetClass('');
      setSelectedStudentIds(new Set());
      
      // IMPORTANT: Refresh the data to show updated classes
      await fetchData();
      
    } catch (err) {
      console.error('Error promoting students:', err);
      toast.error('Failed to promote selected students');
    } finally {
      setPromoting(false);
    }
  };

  // Bulk Promote All Students from a Class
  const handleBulkPromote = async () => {
    if (!bulkSourceClass) {
      toast.error('Please select a source class');
      return;
    }
    if (!bulkTargetClass) {
      toast.error('Please select a target class');
      return;
    }
    if (bulkSourceClass === bulkTargetClass) {
      toast.error('Source and target class cannot be the same');
      return;
    }

    // Find students in the source class
    const studentsToPromote = students.filter(s => {
      const sClass = s.class_name || s.current_class_name || s.current_class || s.class || '';
      return sClass.toLowerCase().trim() === bulkSourceClass.toLowerCase().trim();
    });

    if (studentsToPromote.length === 0) {
      toast.error(`No students found in class "${bulkSourceClass}"`);
      return;
    }

    if (!confirm(`Are you sure you want to promote all ${studentsToPromote.length} students from "${bulkSourceClass}" to "${bulkTargetClass}"?`)) {
      return;
    }

    setPromoting(true);
    try {
      let promotedCount = 0;
      const targetClassId = getTargetClassId(bulkTargetClass);

      for (const student of studentsToPromote) {
        if (!student.id.startsWith('std-')) {
          try {
            const updateData: any = {
              class_name: bulkTargetClass,
              current_class_name: bulkTargetClass,
            };
            
            if (targetClassId) {
              updateData.current_class = targetClassId;
            }
            
            await studentService.update(student.id, updateData);
            promotedCount++;
          } catch (e) {
            console.error(`Failed to promote student ${student.id}:`, e);
          }
        }
      }

      toast.success(`Bulk promoted ${promotedCount} student(s) from "${bulkSourceClass}" to "${bulkTargetClass}"!`);
      
      // Reset bulk modal and refresh data
      setShowBulkModal(false);
      setBulkSourceClass('');
      setBulkTargetClass('');
      setSelectedStudentIds(new Set());
      
      // IMPORTANT: Refresh the data
      await fetchData();
      
    } catch (err) {
      console.error('Error during bulk promotion:', err);
      toast.error('Failed to complete bulk promotion');
    } finally {
      setPromoting(false);
    }
  };

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
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate('/education/students')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Students
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Promote Students</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reload
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Layers className="w-3.5 h-3.5" /> Bulk Promote
          </button>
        </div>
      </div>

      {/* Overview Stat Badge Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-800 leading-none">{filteredStudents.length}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Displayed Students</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-800 leading-none">{selectedStudentIds.size}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Selected Students</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FolderSync className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-800 leading-none">{classes.length}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Available Classes</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Type name or reg number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Filter By Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            >
              <option value="">-- Select a class --</option>
              {classes.length === 0 ? (
                <option value="" disabled>No classes available</option>
              ) : (
                classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))
              )}
            </select>
            {classes.length === 0 && (
              <p className="text-[10px] text-amber-500 mt-1">No classes found. Please add a class first.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedClass('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="h-11 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex-1"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {students.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-4xl mb-4">👨‍🎓</div>
          <h3 className="text-lg font-bold text-slate-700">No Students Found</h3>
          <p className="text-sm text-slate-500 mt-2">Please add students to promote them to the next class.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Card: All Active Students */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">All Active Students</h3>
              </div>
              <div className="text-xs font-bold text-slate-400">
                Show <span className="text-slate-700">{itemsPerPage}</span> entries
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={currentItems.length > 0 && currentItems.every(s => selectedStudentIds.has(s.id))}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Reg #</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Current Class</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((s) => {
                      const isSelected = selectedStudentIds.has(s.id);
                      const sClass = s.class_name || s.current_class_name || s.current_class || s.class || 'N/A';
                      return (
                        <tr key={s.id || s.student_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectStudent(s.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-500">{s.student_id || s.registration_no || '--'}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">{s.full_name || s.name || '--'}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-600">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px]">
                              {sClass}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                        No active students found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Entry stats */}
            {totalEntries > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-semibold text-slate-500 pt-4 border-t border-slate-50">
                <div>
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold">
                    {currentPage}
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Card: Promote To */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <FolderSync className="w-5 h-5 text-purple-700" />
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Promote To</h3>
            </div>

            <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100/60 text-center space-y-1">
              <h4 className="text-3xl font-black text-purple-800 leading-none">{selectedStudentIds.size}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students Selected</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Target Class *</label>
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                >
                  <option value="">-- Select target class --</option>
                  {classes.length === 0 ? (
                    <option value="" disabled>No classes available</option>
                  ) : (
                    classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  )}
                </select>
                {classes.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1">No classes available. Please add a class first.</p>
                )}
              </div>

              <button
                onClick={handlePromoteSelected}
                disabled={promoting || selectedStudentIds.size === 0 || !targetClass}
                className="w-full flex items-center justify-center gap-1.5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoting ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {promoting ? 'Promoting...' : 'Promote Selected'}
              </button>

              <p className="text-[10px] text-slate-400 font-semibold text-center mt-2">
                This will update the class for selected students across all records.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Bulk Promotion Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full border border-slate-100 animate-scale-up">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-purple-600">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Bulk Promote Students</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Promote all students from one class to another at once.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Source Class *</label>
                <select
                  value={bulkSourceClass}
                  onChange={(e) => setBulkSourceClass(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                >
                  <option value="">-- Select source class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Target Class *</label>
                <select
                  value={bulkTargetClass}
                  onChange={(e) => setBulkTargetClass(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                >
                  <option value="">-- Select target class --</option>
                  {classes
                    .filter(c => c.name !== bulkSourceClass)
                    .map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                </select>
              </div>

              {bulkSourceClass && bulkTargetClass && (
                <div className="bg-purple-50 p-3 rounded-xl text-center">
                  <p className="text-xs font-semibold text-purple-700">
                    {students.filter(s => {
                      const sClass = s.class_name || s.current_class_name || s.current_class || s.class || '';
                      return sClass.toLowerCase().trim() === bulkSourceClass.toLowerCase().trim();
                    }).length} students will be promoted from <strong>{bulkSourceClass}</strong> to <strong>{bulkTargetClass}</strong>
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkPromote}
                  disabled={promoting || !bulkSourceClass || !bulkTargetClass || bulkSourceClass === bulkTargetClass}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {promoting ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {promoting ? 'Promoting...' : 'Promote All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}