import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Printer, Download, ArrowLeft, Search, RefreshCw } from 'lucide-react';
import studentService, { Student } from '@/services/student.service';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import { useAuth } from '@/contexts/AuthContext';

export default function AdmissionLetterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const isStudent = role === 'student';
  const queryStudentId = searchParams.get('student_id');

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentRules, setStudentRules] = useState('');

  useEffect(() => {
    // 1. Try local storage fallback
    const saved = localStorage.getItem('rules_settings');
    let localRules = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        localRules = parsed.studentRules || '';
      } catch (e) {
        console.log('Error parsing local rules settings');
      }
    }

    // 2. Fetch canonical rules from backend settings API
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.rules && res.data.rules.studentRules) {
        setStudentRules(res.data.rules.studentRules);
      } else {
        setStudentRules(localRules || '<p>The school rules have been established in partnership with the community over a long period of time. They reflect the school community\'s expectations in terms of acceptable standards of behaviour, dress and personal presentation in the widest sense. Students are expected to follow the school rules at all times when on the school grounds, representing the school, attending a school activity or when clearly associated with the school i.e. when wearing school uniform.</p>');
      }
    }).catch(() => {
      setStudentRules(localRules || '<p>The school rules have been established in partnership with the community over a long period of time. They reflect the school community\'s expectations in terms of acceptable standards of behaviour, dress and personal presentation in the widest sense. Students are expected to follow the school rules at all times when on the school grounds, representing the school, attending a school activity or when clearly associated with the school i.e. when wearing school uniform.</p>');
    });
  }, []);

  // Search screen states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchedStudent, setSearchedStudent] = useState<any | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);

  // Generate deterministic username/password matching format
  const getLoginCredentials = (std: any) => {
    // Check if we have saved custom credentials
    const savedCreds = localStorage.getItem('student_login_credentials');
    if (savedCreds) {
      try {
        const parsed = JSON.parse(savedCreds);
        if (parsed[std.id]) {
          return {
            username: parsed[std.id].username,
            password: parsed[std.id].password || parsed[std.id].username,
          };
        }
      } catch (e) {}
    }

    const code = std.student_id || '001';
    // Format to 169081w710001 (code padded to 4 chars)
    const padded = code.replace(/[^0-9]/g, '').padStart(4, '0');
    return {
      username: `169081w71${padded}`,
      password: `169081w71${padded}`,
    };
  };

  const getExtraDetails = (std: any) => {
    return {
      name: std.full_name || 'Sundasg',
      regNo: std.student_id || '001',
      doa: std.admission_date ? formatDate(std.admission_date) : '29 June, 2026',
      class: std.class_name || 'Grade 1-A',
      dob: std.date_of_birth ? formatDate(std.date_of_birth) : '01 January, 2021',
      gender: std.gender || 'n/a',
      religion: std.religion || 'n/a',
      father: std.father_name || 'n/a',
      mother: std.mother_name || 'n/a',
      address: std.address || 'NILL',
      avatar: std.profile_picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'
    };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
          }
        }
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<any>(sRes.data);
      
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const filtered = fetched.filter(s => !deletedIds.includes(s.id));
      
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const defaultStudents = [
        { 
          id: 'std-1', 
          student_id: '001', 
          full_name: 'Sundasg', 
          class_name: 'Grade 1-A',
          profile_picture: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150' 
        }
      ];

      const combined = [...(filtered.length > 0 ? filtered : defaultStudents), ...customStudents].filter(s => !deletedIds.includes(s.id));
      setStudents(combined);

      // Auto-select student if logged-in user is a student or queryStudentId is provided
      let targetStudent = null;
      if (isStudent) {
        // Force match only the logged-in student's own details
        targetStudent = combined.find((s: any) => 
          String(s.id) === String(user?.id) || 
          String(s.student_id) === String(user?.id) ||
          s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
        );
        if (!targetStudent && combined.length > 0) {
          targetStudent = combined[0];
        }
      } else if (queryStudentId) {
        targetStudent = combined.find((s: any) => 
          String(s.id) === String(queryStudentId) || 
          String(s.student_id) === String(queryStudentId)
        );
      }

      if (targetStudent) {
        handleSelectStudent(targetStudent);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = students.filter(s => 
      s.full_name.toLowerCase().includes(val.toLowerCase()) ||
      (s.student_id && s.student_id.toLowerCase().includes(val.toLowerCase()))
    );
    setSuggestions(filtered.slice(0, 5));
  };

  const handleSelectStudent = async (student: any) => {
    setSearchedStudent(student);
    setSearchQuery(`${student.full_name} (${student.student_id || 'N/A'})`);
    setSuggestions([]);
    
    // Fetch details
    try {
      if (student.id && !student.id.startsWith('std-')) {
        const res = await studentService.getById(student.id).catch(() => null);
        if (res && res.data) {
          setStudentDetails(res.data);
          return;
        }
      }
    } catch (e) {}

    // Fallback to custom_students or selected item
    const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
    const customMatch = customStudents.find((s: any) => s.id === student.id);
    setStudentDetails(customMatch || student);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectStudent(suggestions[0]);
    } else if (searchQuery.trim()) {
      const matched = students.find(s => 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student_id && s.student_id.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (matched) {
        handleSelectStudent(matched);
      } else {
        toast.error('No matching student found.');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const creds = searchedStudent ? getLoginCredentials(searchedStudent) : null;
  const extras = (studentDetails || searchedStudent) ? getExtraDetails(studentDetails || searchedStudent) : null;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0">
      
      {/* Breadcrumb Header Bar — Hidden on Print */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate(isStudent ? '/student' : '/education/students')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> {isStudent ? 'Dashboard' : 'Students'}
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Admission Letter</span>
        </div>

        {/* Back to search link when results are visible */}
        {searchedStudent && !isStudent && (
          <button
            onClick={() => {
              setSearchedStudent(null);
              setStudentDetails(null);
              setSearchQuery('');
            }}
            className="text-xs font-bold text-purple-700 hover:underline print:hidden"
          >
            ← Back to Search
          </button>
        )}
      </div>

      {!searchedStudent ? (
        /* 1. CENTERED SEARCH SCREEN — Matches first and second screenshots exactly */
        <div className="flex items-center justify-center pt-16">
          {isStudent ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="animate-spin rounded-full h-8 w-8 text-[#5C53CD]" />
            </div>
          ) : (
            <div className="max-w-xl w-full bg-white p-10 rounded-3xl border border-slate-100 shadow-xs text-center space-y-6 relative">
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-650 mx-auto text-xl shadow-inner">
                📄
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-800">Generate Admission Letter</h2>
                <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                  Search for a student by name or registration number to generate their admission letter.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student by name or registration..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 bg-white text-xs font-semibold text-slate-700 focus:outline-none transition-all shadow-3xs"
                  />
                </div>

                <button
                  type="submit"
                  className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  Search
                </button>

                {/* Autocomplete Dropdown suggestions — Matches 2nd screenshot */}
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-12 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-50 text-left">
                    {suggestions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="p-3.5 hover:bg-purple-50/50 cursor-pointer text-xs font-semibold text-slate-700"
                      >
                        {s.student_id || '001'} - {s.full_name} - {s.class_name || 'Grade 1-A'}
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      ) : (
        /* 2. RESULTS & LETTERS VIEW — Matches third screenshot exactly */
        <div className="space-y-6">
          
          {/* Top Preview Card and Print Action Card row */}
          {extras && creds && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
              
              {/* Preview Card (Left) */}
              <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-100 shrink-0 shadow-inner">
                  <img src={extras.avatar} alt={extras.name} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-3 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-slate-800">{extras.name}</h2>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] font-bold">
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">💳 Reg: {extras.regNo}</span>
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">📋 Class: {extras.class}</span>
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">📅 DOA: {extras.doa}</span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">🟢 Active</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] font-bold pt-1">
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">👤 Username: <strong className="font-mono">{creds.username}</strong></span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">🔒 Password: <strong className="font-mono">{creds.password}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions Card (Right) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
                <button
                  onClick={handlePrint}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Admission Letter
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-purple-700 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Get PDF
                </button>
              </div>

            </div>
          )}

          {/* Printable Admission Letter Document card */}
          {extras && creds && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-8 text-slate-800 text-xs print:p-0 print:border-0 print:shadow-none print:max-w-none print:text-black">
              {/* Document Header */}
              <div className="text-center space-y-2 border-b border-slate-200 pb-6">
                <div className="flex justify-center mb-1">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                    <span>Institute Name</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">&quot; YOUR SCHOOL SOFTWARE &quot;</p>
                <p className="text-[11px] font-medium text-slate-500">+923460204447 | www.my-school.com | info@my-school.com</p>
                <h1 className="text-2xl font-black text-purple-700 pt-2">Admission Letter</h1>
              </div>

              {/* Top Metadata Grid */}
              <div className="grid grid-cols-4 gap-6 items-start">
                <div>
                  <img src={extras.avatar} alt="Student" className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-2xs" />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Serial No</p>
                    <p className="font-bold text-slate-800 text-sm">↪ 1,888,614</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Registration No</p>
                    <p className="font-bold text-purple-700 text-sm">↪ {extras.regNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Student Name</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Class</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.class}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Date Of Birth</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.dob}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Student Birth Form ID / NIC</p>
                    <p className="font-bold text-slate-800 text-sm">↪ --</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Gender</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Religion</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.religion}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Date of Admission</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.doa}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Discount In Fee</p>
                    <p className="font-bold text-slate-800 text-sm">↪ 0 %</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Username</p>
                    <p className="font-bold text-purple-700 font-mono text-sm">↪ {creds.username}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Password</p>
                    <p className="font-bold text-purple-700 font-mono text-sm">↪ {creds.password}</p>
                  </div>
                </div>
              </div>

              {/* Middle Details & QR Codes */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-4 gap-6">
                <div className="col-span-3 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                    <p className="font-bold text-slate-800 text-sm">↪ {extras.address}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Father Name ↪ <strong className="text-slate-800">{extras.father}</strong></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Father National ID ↪ <strong className="text-slate-800">--</strong></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Education ↪ <strong className="text-slate-800">Graduate</strong></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Mobile No ↪ <strong className="text-slate-800">{searchedStudent.phone || '+92 300 1234567'}</strong></p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Mother Name ↪ <strong className="text-slate-800">{extras.mother}</strong></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Mother National ID ↪ <strong className="text-slate-800">--</strong></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Education ↪ <strong className="text-slate-800">Graduate</strong></p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Mobile No ↪ <strong className="text-slate-800">{searchedStudent.phone || '+92 300 1234567'}</strong></p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Siblings ↪ <strong className="text-slate-800">4</strong></p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-center border-l border-slate-100 pl-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">SCAN QR CODE TO ACCESS PORTAL</p>
                  <div className="p-2 border border-slate-200 rounded-xl inline-block bg-slate-50">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=http://my-school.com/login?u=${creds.username}`} alt="Web Portal" className="w-16 h-16 mx-auto" />
                    <span className="text-[9px] font-bold text-slate-500 block mt-1">Web Portal</span>
                  </div>
                </div>
              </div>

              {/* Rules and Regulations */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <h3 className="font-bold text-sm text-slate-800">Rules And Regulations:</h3>
                <div 
                  className="text-[11px] text-slate-500 leading-relaxed rich-editor-content"
                  dangerouslySetInnerHTML={{ __html: studentRules }}
                />
              </div>

              {/* Signatures */}
              <div className="pt-12 flex justify-between items-center text-xs font-semibold text-slate-700 print:text-black">
                <div>Signature of Authority_____________________</div>
                <div>Institute Stamp_____________________</div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
