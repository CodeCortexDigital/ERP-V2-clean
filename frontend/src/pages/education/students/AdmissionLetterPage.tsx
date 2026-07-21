import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Printer, Download, ArrowLeft, Search, RefreshCw, User, Calendar, BookOpen, CreditCard, Phone, Mail, MapPin, Users, Hash, Award, AlertCircle, RotateCcw } from 'lucide-react';
import studentService, { Student } from '@/services/student.service';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import { useAuth } from '@/contexts/AuthContext';
import settingsService from '@/services/settings.service';

export default function AdmissionLetterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const isStudent = role === 'student';
  const queryStudentId = searchParams.get('student_id');

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentRules, setStudentRules] = useState('');

  // Search screen states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchedStudent, setSearchedStudent] = useState<any | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [instituteProfile, setInstituteProfile] = useState<any>({});

  useEffect(() => {
    // Load institute profile from API
    settingsService.getInstituteProfile().then(res => {
      if (res.data) setInstituteProfile(res.data);
    }).catch(() => {});

    // Load rules from API
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.rules && res.data.rules.studentRules) {
        setStudentRules(res.data.rules.studentRules);
      }
    }).catch(() => {});
  }, []);

  // Helper function to get student status
  const getStudentStatus = (std: any): string => {
    if (!std) return 'active';
    
    const possibleStatusFields = [
      std.status,
      std.student_status,
      std.account_status,
      std.is_active,
      std.active,
      std.portal_status,
      std.status_name,
      std.user_status,
      std.enrollment_status
    ];
    
    for (const status of possibleStatusFields) {
      if (status !== undefined && status !== null) {
        if (typeof status === 'boolean') {
          return status ? 'active' : 'inactive';
        }
        if (typeof status === 'string') {
          const normalized = status.toLowerCase().trim();
          if (['inactive', 'false', '0', 'disabled'].includes(normalized)) {
            return 'inactive';
          }
          if (['active', 'true', '1', 'enabled'].includes(normalized)) {
            return 'active';
          }
        }
        if (typeof status === 'number') {
          return status === 1 ? 'active' : 'inactive';
        }
      }
    }
    return 'active';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const getLoginCredentials = (std: any) => {
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
    const padded = code.replace(/[^0-9]/g, '').padStart(4, '0');
    return {
      username: `169081w71${padded}`,
      password: `169081w71${padded}`,
    };
  };

  const getExtraDetails = (std: any) => {
    const status = getStudentStatus(std);
    
    return {
      name: std.full_name || std.name || '',
      regNo: std.student_id || std.registration_no || '',
      doa: std.admission_date ? formatDate(std.admission_date) : '',
      class: std.class_name || std.current_class_name || std.class || '',
      dob: std.date_of_birth ? formatDate(std.date_of_birth) : '',
      gender: std.gender || '',
      religion: std.religion || '',
      father: std.father_name || '',
      fatherNid: std.father_national_id || '',
      fatherOccupation: std.father_occupation || '',
      fatherEducation: std.father_education || '',
      fatherMobile: std.father_mobile || '',
      fatherIncome: std.father_income || '',
      mother: std.mother_name || '',
      motherNid: std.mother_national_id || '',
      motherOccupation: std.mother_occupation || '',
      motherEducation: std.mother_education || '',
      motherMobile: std.mother_mobile || '',
      motherIncome: std.mother_income || '',
      address: std.address || '',
      birthFormId: std.birth_form_id || '',
      cast: std.cast || '',
      previousSchool: std.previous_school || '',
      previousId: std.previous_id || '',
      additionalNote: std.additional_note || '',
      orphanStudent: std.orphan_student || '',
      osc: std.osc || '',
      selectFamily: std.select_family || '',
      totalSiblings: std.total_siblings || '',
      discountInFee: std.discount_in_fee || '0',
      phone: std.phone || std.mobile || '',
      status: status,
      avatar: std.profile_picture || std.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(std.full_name || std.name || 'Student')}&background=4C469D&color=fff&size=128&bold=true`
    };
  };

  const deduplicateStudents = (studentsList: any[]) => {
    const seen = new Map();
    return studentsList.filter(student => {
      const id = student.id || student.student_id;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.set(id, true);
      return true;
    });
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<any>(sRes.data);
      
      const uniqueStudents = deduplicateStudents(fetched);
      setStudents(uniqueStudents);

      let targetStudent = null;
      if (isStudent) {
        targetStudent = uniqueStudents.find((s: any) => 
          String(s.id) === String(user?.id) || 
          String(s.student_id) === String(user?.id) ||
          s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
        );
        if (!targetStudent && uniqueStudents.length > 0) {
          targetStudent = uniqueStudents[0];
        }
      } else if (queryStudentId) {
        targetStudent = uniqueStudents.find((s: any) => 
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

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = students.filter(s => {
      const studentName = (s as any).full_name || (s as any).name || '';
      const studentId = (s as any).student_id || '';
      return (
        studentName.toLowerCase().includes(val.toLowerCase()) ||
        studentId.toLowerCase().includes(val.toLowerCase())
      );
    });
    setSuggestions(filtered.slice(0, 5));
  };

  const handleSelectStudent = async (student: any) => {
    setSearchedStudent(student);
    setSearchQuery(`${student.full_name || student.name} (${student.student_id || 'N/A'})`);
    setSuggestions([]);
    
    try {
      if (student.id && !student.id.startsWith('std-')) {
        const res = await studentService.getById(student.id).catch(() => null);
        if (res && res.data) {
          const mergedData = {
            ...student,
            ...res.data,
            status: getStudentStatus(res.data) || getStudentStatus(student)
          };
          setStudentDetails(mergedData);
          setSearchedStudent(mergedData);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching student details:', e);
    }

    const finalStudent = student;
    finalStudent.status = getStudentStatus(finalStudent);
    setStudentDetails(finalStudent);
    setSearchedStudent(finalStudent);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectStudent(suggestions[0]);
    } else if (searchQuery.trim()) {
      const matched = students.find(s => {
        const studentName = (s as any).full_name || (s as any).name || '';
        const studentId = (s as any).student_id || '';
        return (
          studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          studentId.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
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
  const currentStatus = getStudentStatus(studentDetails || searchedStudent);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="animate-spin rounded-full h-8 w-8 text-purple-600" />
      </div>
    );
  }

  if (!loading && students.length === 0 && !searchedStudent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-4xl">👨‍🎓</div>
          <h3 className="text-lg font-bold text-slate-700">No Students Found</h3>
          <p className="text-sm text-slate-500">Please add students to generate admission letters.</p>
        </div>
      </div>
    );
  }

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    const student = s as any;
    return (
      (student.full_name || student.name || '').toLowerCase().includes(query) ||
      (student.student_id || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0">
      
      {/* Breadcrumb Header — Hidden on Print */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <button onClick={() => navigate(isStudent ? '/student' : '/education/students')} className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> {isStudent ? 'Dashboard' : 'Students'}
          </button>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Admission Letter</span>
        </div>

        {searchedStudent && !isStudent && (
          <button
            onClick={() => {
              setSearchedStudent(null);
              setStudentDetails(null);
              setSearchQuery('');
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors print:hidden"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Back to Search
          </button>
        )}
      </div>

      {!searchedStudent ? (
        /* SEARCH SCREEN */
        <div className="flex items-center justify-center pt-16">
          <div className="max-w-xl w-full bg-white p-10 rounded-3xl border border-slate-100 shadow-xs text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-50 to-indigo-50 text-purple-650 flex items-center justify-center mx-auto shadow-2xs">
              <GraduationCap className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800">Generate Admission Letter</h2>
              <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto">
                Search for a student by name or registration number.
              </p>
            </div>

            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name or registration..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-12 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-400"
              />
              <button 
                onClick={handleSearchSubmit}
                className="absolute right-1.5 top-1.5 h-8 w-8 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List results */}
            <div className="max-w-md mx-auto max-h-48 overflow-y-auto space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-2 custom-scrollbar">
              {loading ? (
                <p className="text-xs text-slate-400 py-4 font-semibold">Loading students list...</p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 font-semibold">No matching records found.</p>
              ) : (
                filteredStudents.map(s => {
                  const student = s as any;
                  return (
                    <button
                      key={student.id || student.student_id}
                      onClick={() => handleSelectStudent(s)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-white hover:shadow-2xs transition border border-transparent hover:border-slate-150 flex items-center justify-between text-xs font-bold text-slate-700"
                    >
                      <span>{student.full_name || student.name}</span>
                      <span className="text-[10px] text-purple-600 font-mono bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100/50">{student.student_id || 'Student'}</span>
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-[10px] text-slate-400 font-semibold">ℹ {students.length} student(s) available</p>
          </div>
        </div>
      ) : (
        /* RESULTS VIEW */
        <div className="space-y-6">
          
          {/* Preview Card */}
          {extras && creds && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
              <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-100 shrink-0">
                  <img src={extras.avatar} alt={extras.name} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-slate-800">{extras.name}</h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px] font-medium">
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">💳 {extras.regNo}</span>
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">📋 {extras.class}</span>
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">📅 {extras.doa}</span>
                    <span className={`px-2.5 py-1 rounded-lg border font-medium text-[10px] ${
                      currentStatus === 'inactive' 
                        ? 'bg-red-50 text-red-600 border-red-200' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {currentStatus === 'inactive' ? '🔴 Inactive' : '🟢 Active'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[10px]">
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">👤 {creds.username}</span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">🔒 {creds.password}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
                <button
                  onClick={handlePrint}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Admission Letter
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-purple-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          )}

          {/* Printable Admission Letter */}
          {extras && creds && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6 text-slate-800 print:p-6 print:border-0 print:shadow-none print:max-w-none">
              
              {/* Letter Header */}
              <div className="text-center border-b border-slate-200 pb-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {instituteProfile?.logoUrl && (
                    <img src={instituteProfile.logoUrl} alt="Logo" className="h-12 w-auto" />
                  )}
                  <GraduationCap className="w-8 h-8 text-purple-700" />
                  <span className="text-2xl font-bold text-purple-700">{instituteProfile?.name || 'Institute Name'}</span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 tracking-widest">"{instituteProfile?.targetLine || 'YOUR SCHOOL SOFTWARE'}"</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {instituteProfile?.phone || '+92 300 1234567'} | {instituteProfile?.website || 'www.my-school.com'} | {instituteProfile?.email || 'info@my-school.com'}
                </p>
                <h1 className="text-2xl font-black text-purple-700 mt-3 tracking-wide">ADMISSION LETTER</h1>
              </div>

              {/* Student Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center md:items-start">
                  <img src={extras.avatar} alt={extras.name} className="w-24 h-24 rounded-xl border border-slate-200 shadow-sm object-cover" />
                </div>

                <div className="space-y-2">
                  <InfoRow label="Serial No" value="1,888,614" />
                  <InfoRow label="Registration No" value={extras.regNo} highlight />
                  <InfoRow label="Student Name" value={extras.name} bold />
                  <InfoRow label="Class" value={extras.class} />
                </div>

                <div className="space-y-2">
                  <InfoRow label="Date of Birth" value={extras.dob} />
                  <InfoRow label="Birth Form ID" value={extras.birthFormId} />
                  <InfoRow label="Gender" value={extras.gender} />
                  <InfoRow label="Religion" value={extras.religion} />
                </div>

                <div className="space-y-2">
                  <InfoRow label="Date of Admission" value={extras.doa} />
                  <InfoRow label="Discount in Fee" value={extras.discountInFee ? `${extras.discountInFee}%` : ''} />
                  <InfoRow label="Username" value={creds.username} highlight monospace />
                  <InfoRow label="Password" value={creds.password} highlight monospace />
                </div>
              </div>

              {/* Address & Family Section */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <InfoRow label="Address" value={extras.address} />
                  <InfoRow label="Total Siblings" value={extras.totalSiblings} />
                </div>
                <div>
                  <InfoRow label="Previous School" value={extras.previousSchool} />
                  <InfoRow label="Previous ID" value={extras.previousId} />
                  <InfoRow label="Cast" value={extras.cast} />
                </div>
              </div>

              {/* Parents Section */}
              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Father / Guardian</h4>
                  <InfoRow label="Name" value={extras.father} />
                  <InfoRow label="National ID" value={extras.fatherNid} />
                  <InfoRow label="Education" value={extras.fatherEducation} />
                  <InfoRow label="Occupation" value={extras.fatherOccupation} />
                  <InfoRow label="Mobile" value={extras.fatherMobile} />
                  <InfoRow label="Income" value={extras.fatherIncome} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Mother</h4>
                  <InfoRow label="Name" value={extras.mother} />
                  <InfoRow label="National ID" value={extras.motherNid} />
                  <InfoRow label="Education" value={extras.motherEducation} />
                  <InfoRow label="Occupation" value={extras.motherOccupation} />
                  <InfoRow label="Mobile" value={extras.motherMobile} />
                  <InfoRow label="Income" value={extras.motherIncome} />
                </div>
              </div>

              {/* Additional Note */}
              {extras.additionalNote && (
                <div className="border-t border-slate-200 pt-4">
                  <InfoRow label="Additional Note" value={extras.additionalNote} />
                </div>
              )}

              {/* Rules Section */}
              {studentRules && (
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Rules & Regulations</h4>
                  <div 
                    className="text-[11px] text-slate-600 leading-relaxed rich-editor-content"
                    dangerouslySetInnerHTML={{ __html: studentRules }}
                  />
                </div>
              )}

              {/* QR Code */}
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                <div>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`http://my-school.com/login?u=${creds.username}`)}`} 
                    alt="QR Code" 
                    className="w-16 h-16"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                  <p className="text-[8px] text-slate-400 mt-1 font-medium tracking-wider">SCAN TO ACCESS PORTAL</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-500">Web Portal</p>
                  <p className="text-[8px] text-slate-400">my-school.com</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="border-t border-slate-200 pt-6 flex justify-between text-xs font-medium text-slate-600">
                <div>
                  <div className="h-8 border-b border-slate-300 w-48"></div>
                  <p className="mt-1">Signature of Authority</p>
                </div>
                <div>
                  <div className="h-8 border-b border-slate-300 w-48"></div>
                  <p className="mt-1">Institute Stamp</p>
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}

// Helper component for info rows
function InfoRow({ label, value, highlight, bold, monospace }: { label: string; value: any; highlight?: boolean; bold?: boolean; monospace?: boolean }) {
  if (!value) return null;
  
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="font-semibold text-slate-500 min-w-[100px]">{label}:</span>
      <span className={`
        ${bold ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}
        ${highlight ? 'text-purple-700 font-bold' : ''}
        ${monospace ? 'font-mono text-[11px]' : ''}
      `}>
        {value}
      </span>
    </div>
  );
}