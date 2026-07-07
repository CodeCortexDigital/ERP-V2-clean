import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, RotateCcw, Copy, Printer, ChevronDown, User, Lock, Eye, EyeOff, Save, Mail } from 'lucide-react';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import { extractListData } from '@/services/api';

export default function StudentLoginsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Credentials store
  const [credentials, setCredentials] = useState<Record<string, { username: string; password?: string }>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Filter and search states
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        { id: 'cls-2', name: 'Grade 1-B' }
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
          full_name: 'Sundasg', 
          class_name: 'Grade 1-A',
          father_name: 'azhar',
          phone: '+92 300 1234567' 
        }
      ];

      const finalStudentsList = allStudents.length > 0 ? allStudents : defaultStudents;
      setStudents(finalStudentsList);
      setClasses(uniqueClasses);

      // Load saved credentials from localStorage
      const savedCreds = localStorage.getItem('student_login_credentials');
      let loadedCreds: Record<string, { username: string; password?: string }> = {};
      if (savedCreds) {
        try {
          loadedCreds = JSON.parse(savedCreds);
        } catch (e) {}
      }

      // Initialize default logins matching Admission Letter credentials format
      const getLoginCredentials = (studentIdCode: string) => {
        const code = studentIdCode || '001';
        const padded = code.replace(/[^0-9]/g, '').padStart(4, '0');
        return `169081w71${padded}`;
      };

      const updatedCreds = { ...loadedCreds };
      finalStudentsList.forEach(s => {
        const codeVal = getLoginCredentials(s.student_id);
        const existing = updatedCreds[s.id];
        // Overwrite if missing or using old format
        if (!existing || !existing.username.startsWith('169081')) {
          updatedCreds[s.id] = {
            username: codeVal,
            password: codeVal
          };
        }
      });
      setCredentials(updatedCreds);
      localStorage.setItem('student_login_credentials', JSON.stringify(updatedCreds));
    } catch (err) {
      toast.error('Failed to load students login list');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = (studentId: string) => {
    const cred = credentials[studentId];
    if (!cred || !cred.username) {
      toast.error('Username cannot be empty');
      return;
    }
    const savedCreds = localStorage.getItem('student_login_credentials');
    const allCreds = savedCreds ? JSON.parse(savedCreds) : {};
    allCreds[studentId] = cred;
    localStorage.setItem('student_login_credentials', JSON.stringify(allCreds));
    toast.success('Login credentials saved successfully!');
  };

  const handleSendCredentials = (studentId: string) => {
    toast.info('Credentials notification sent to student / parents!');
  };

  const handleExport = (type: string) => {
    toast.success(`${type} export started!`);
  };

  // Filter students based on selection & search
  const filteredStudents = students.filter(s => {
    const sClass = s.class_name || s.current_class_name || s.current_class || '';
    const classMatch = selectedClass === '' || sClass.toLowerCase().trim() === selectedClass.toLowerCase().trim();
    
    const query = searchTerm.toLowerCase();
    const searchMatch = 
      (s.full_name || '').toLowerCase().includes(query) ||
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

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate('/education/students')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Students
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Student Login</span>
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
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Search Student</label>
            <input
              type="text"
              placeholder="Type student name..."
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
              <option value="">-- Select class --</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Badges indicators on the right */}
          <div className="flex items-center gap-2 lg:justify-end">
            <div className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 shrink-0">
              👥 {totalEntries} Students
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100 shrink-0">
              🏫 All Classes
            </div>
            <button 
              onClick={() => {
                setSelectedClass('');
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

      {/* 2. STUDENT LOGIN CREDENTIALS TABLE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Table Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 pb-2">
            <GraduationCap className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Student Login Credentials</h2>
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
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((s) => {
                  const sClass = s.class_name || s.current_class_name || s.current_class || 'Grade 1-A';
                  const cred = credentials[s.id] || { username: '', password: '' };
                  const isVisible = visiblePasswords[s.id] || false;

                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-500">{s.student_id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{s.full_name}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-600">{sClass}</td>
                      
                      {/* Username input field with User icon prefix */}
                      <td className="py-3.5 px-4">
                        <div className="relative flex items-center max-w-[200px]">
                          <User className="absolute left-3 w-4 h-4 text-purple-400" />
                          <input
                            type="text"
                            value={cred.username}
                            onChange={(e) => {
                              const updated = { ...credentials };
                              updated[s.id] = { ...cred, username: e.target.value };
                              setCredentials(updated);
                            }}
                            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                          />
                        </div>
                      </td>

                      {/* Password input field with Lock icon prefix and Show/Hide button */}
                      <td className="py-3.5 px-4">
                        <div className="relative flex items-center max-w-[200px]">
                          <Lock className="absolute left-3 w-4 h-4 text-purple-400" />
                          <input
                            type={isVisible ? "text" : "password"}
                            value={cred.password || ''}
                            onChange={(e) => {
                              const updated = { ...credentials };
                              updated[s.id] = { ...cred, password: e.target.value };
                              setCredentials(updated);
                            }}
                            className="w-full h-9 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = { ...visiblePasswords };
                              updated[s.id] = !isVisible;
                              setVisiblePasswords(updated);
                            }}
                            className="absolute right-3 text-slate-400 hover:text-slate-600"
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>

                      {/* Actions: Save & Send */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSaveCredentials(s.id)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-2xs"
                            title="Save Credentials"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSendCredentials(s.id)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-2xs"
                            title="Send login info"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No matching student login records found.
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
