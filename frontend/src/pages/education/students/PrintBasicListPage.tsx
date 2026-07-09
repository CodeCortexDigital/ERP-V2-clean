import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, RotateCcw, Copy, FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';

export default function PrintBasicListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter and search states
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Specific placeholder detection - only filter out known test/placeholder students
  const isPlaceholderStudent = (student: any) => {
    if (!student) return true;
    
    const id = String(student.id || '').trim();
    const studentId = String(student.student_id || '').trim();
    const fullName = String(student.full_name || student.name || '').trim().toLowerCase();
    
    // Only filter out very specific known placeholders
    // These are the ones that were explicitly added as defaults
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
      // Skip placeholder students (but be careful not to skip real ones)
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

      console.log('Raw students from API:', rawStudents);
      const filteredStudents = rawStudents.filter((s: any) => !isPlaceholderStudent(s));
      const uniqueStudents = deduplicateStudents(filteredStudents);
      
      console.log('Unique students after deduplication:', uniqueStudents);
      console.log('Number of unique students:', uniqueStudents.length);
      
      setStudents(uniqueStudents);

      // Process classes with deduplication
      const filteredClasses = rawClasses.filter((c: any) => c && c.name);

      // Deduplicate classes by name
      const uniqueClasses: any[] = [];
      const seenNames = new Set<string>();
      for (const c of filteredClasses) {
        if (!c.name) continue;
        const normalized = c.name.trim().toLowerCase();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          uniqueClasses.push(c);
        }
      }

      setClasses(uniqueClasses);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load students list');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (type: string) => {
    toast.success(`${type} export started!`);
  };

  // Filter students based on selection & search
  const filteredStudents = students.filter(s => {
    // Skip placeholder students
    if (isPlaceholderStudent(s)) return false;
    
    const sClass = s.class_name || s.current_class_name || s.current_class || '';
    const classMatch = selectedClass === '' || sClass.toLowerCase().trim() === selectedClass.toLowerCase().trim();
    
    const query = searchTerm.toLowerCase();
    const searchMatch = 
      (s.full_name || '').toLowerCase().includes(query) ||
      (s.name || '').toLowerCase().includes(query) ||
      (s.student_id || '').toLowerCase().includes(query) ||
      (s.father_name || '').toLowerCase().includes(query);

    return classMatch && searchMatch;
  });

  // Pagination logic
  const totalEntries = filteredStudents.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;

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
      {/* interactive elements hidden on print */}
      <div className="print:hidden space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <button onClick={() => navigate('/education/students')} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Students
            </button>
            <span>&gt;</span>
            <span className="text-slate-500 font-bold">Print Basic List</span>
          </div>

          <button 
            onClick={fetchData} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>

        {/* 1. FILTER BY CLASS CARD */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter By Class</p>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            <div className="w-full md:max-w-md">
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <option value="">-- Select a class --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Badges indicators on the right */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100">
                👥 {totalEntries} Students
              </div>
              <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100">
                🏫 {classes.length} All Classes
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 2. STUDENT LIST TABLE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        
        {/* Header toolbar hidden on print */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
          <div className="flex items-center gap-2 pb-2">
            <GraduationCap className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Student List</h2>
          </div>

          {/* Table Actions & Search */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 gap-1 text-[11px] font-bold">
              <button onClick={() => handleExport('Copy')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">Copy</button>
              <button onClick={() => handleExport('CSV')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">CSV</button>
              <button onClick={() => handleExport('Excel')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">Excel</button>
              <button onClick={() => handleExport('PDF')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">PDF</button>
              <button onClick={handlePrint} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all flex items-center gap-1"><Printer className="w-3 h-3" /> Print</button>
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
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-44 font-semibold text-slate-600 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Dynamic HTML Table */}
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👨‍🎓</div>
              <h3 className="text-lg font-bold text-slate-700">No Students Found</h3>
              <p className="text-sm text-slate-500 mt-2">Please add students to generate the list.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse print:text-black">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider print:bg-transparent">
                  <th className="py-3 px-4">S#</th>
                  <th className="py-3 px-4">Reg. #</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Father Name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Fee Remaining</th>
                  <th className="py-3 px-4">Phone</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((s, idx) => {
                    const serial = indexOfFirstItem + idx + 1;
                    const sClass = s.class_name || s.current_class_name || s.current_class || 'Grade 1-A';
                    return (
                      <tr key={s.id || s.student_id || `student-${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors print:border-slate-300">
                        <td className="py-3.5 px-4 font-bold text-slate-500">{serial}</td>
                        <td className="py-3.5 px-4 font-extrabold text-[#4C469D]">{s.student_id || s.registration_no || '--'}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{s.full_name || s.name || '--'}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-500">{s.father_name || '--'}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-600">{sClass}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-400">-</td>
                        <td className="py-3.5 px-4 font-bold text-slate-500">{s.phone || s.mobile || '--'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      No matching student records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer pagination info bar hidden on print */}
        {students.length > 0 && (
          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pt-4 border-t border-slate-50 print:hidden">
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
        )}

      </div>
    </div>
  );
}