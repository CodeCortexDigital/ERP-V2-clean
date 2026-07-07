import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, RotateCcw, Check, Sparkles, FolderSync } from 'lucide-react';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';

export default function PromoteStudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection and promotion states
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [targetClass, setTargetClass] = useState('');

  // Filter and search states
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        studentService.getAll().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] }))
      ]);

      const rawStudents = extractListData<any>(sRes.data || []);
      const rawClasses = extractListData<any>(cRes.data || []);

      const deletedStudentIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const filteredDbStudents = rawStudents.filter(s => !deletedStudentIds.includes(s.id));

      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const allStudents = [...filteredDbStudents, ...customStudents].filter(s => !deletedStudentIds.includes(s.id));

      const defaultClasses = [
        { id: 'cls-1', name: 'Grade 1-A' },
        { id: 'cls-2', name: 'Grade 1-B' },
        { id: 'cls-3', name: 'Grade 2-A' }
      ];
      const customClasses = JSON.parse(localStorage.getItem('custom_classes') || '[]');
      const combinedClasses = [...(rawClasses.length > 0 ? rawClasses : defaultClasses), ...customClasses];
      const deletedClassIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      
      // Unique class list by name
      const uniqueClasses: any[] = [];
      const seenNames = new Set<string>();
      for (const c of combinedClasses.filter(c => !deletedClassIds.includes(c.id))) {
        if (!c.name) continue;
        const normalized = c.name.trim().toLowerCase();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          uniqueClasses.push(c);
        }
      }

      const defaultStudents = [
        { 
          id: 'std-1', 
          student_id: '001', 
          full_name: 'Sundas', 
          class_name: 'Grade 1-A',
          father_name: 'Azhar',
          phone: '+92 300 1234567' 
        }
      ];

      setStudents(allStudents.length > 0 ? allStudents : defaultStudents);
      setClasses(uniqueClasses);
      setSelectedStudentIds(new Set());
    } catch (err) {
      toast.error('Failed to load students promotion list');
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on selection & search
  const filteredStudents = students.filter(s => {
    const sClass = s.class_name || s.current_class_name || s.current_class || '';
    const classMatch = selectedClass === '' || sClass.toLowerCase().trim() === selectedClass.toLowerCase().trim();
    
    const query = searchTerm.toLowerCase();
    const searchMatch = 
      (s.full_name || '').toLowerCase().includes(query) ||
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

    setLoading(true);
    try {
      const selectedArray = Array.from(selectedStudentIds);
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');

      // Update custom students in localStorage
      const updatedCustom = customStudents.map((s: any) => {
        if (selectedArray.includes(s.id)) {
          return { ...s, class_name: targetClass };
        }
        return s;
      });
      localStorage.setItem('custom_students', JSON.stringify(updatedCustom));

      // Attempt DB updates for students
      for (const id of selectedArray) {
        // Skip local-only custom IDs (which start with 'std-')
        if (!id.startsWith('std-')) {
          try {
            await studentService.update(id, { current_class_name: targetClass } as any);
          } catch (e) {
            console.log('Skipping backend sync for local-only student');
          }
        }
      }

      toast.success(`Promoted ${selectedStudentIds.size} student(s) to ${targetClass} successfully!`);
      setTargetClass('');
      fetchData();
    } catch (err) {
      toast.error('Failed to promote selected students');
    } finally {
      setLoading(false);
    }
  };

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

        <button 
          onClick={fetchData} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reload
        </button>
      </div>

      {/* Overview Stat Badge Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
          👥
        </div>
        <div>
          <h4 className="text-2xl font-black text-slate-800 leading-none">{filteredStudents.length}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Displayed Students</p>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Search Student</label>
            <input
              type="text"
              placeholder="Type name or reg number.."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Filter By Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            >
              <option value="">-- Select a class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => {
                setSelectedClass('');
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="h-11 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs w-full md:w-auto"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Students Selection Card & Right Promote To Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Card: All Active Students */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-900 text-white flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">All Active Students</h3>
            </div>
            <div className="text-xs font-bold text-slate-400">
              Show <span className="text-slate-700">25</span> entries
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
                    const sClass = s.class_name || s.current_class_name || s.current_class || 'Grade 1-A';
                    return (
                      <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectStudent(s.id)}
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-500">{s.student_id}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{s.full_name}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-600">{sClass}</td>
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
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Target Class *</label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              >
                <option value="">-- Select target class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePromoteSelected}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Promote Selected
            </button>

            <p className="text-[10px] text-slate-400 font-semibold text-center mt-2">
              This will update the class for selected students across all records.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
