import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Printer, Download, ArrowLeft, RotateCcw, LayoutGrid, LayoutList, LayoutTemplate } from 'lucide-react';
import studentService from '@/services/student.service';
import { extractListData } from '@/services/api';

type CardStyle = 'default' | 'style2' | 'style3';

export default function StudentIdCardsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [cardStyle, setCardStyle] = useState<CardStyle>('default');

  // Improved placeholder detection - only filter out obvious test data
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
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const sRes = await studentService.getAll({ page_size: 1000 } as any).catch(() => ({ data: [] }));
      const fetched = extractListData<any>(sRes.data);

      console.log('Raw students from API:', fetched);
      
      const filteredStudents = fetched.filter(s => !isPlaceholderStudent(s));
      const uniqueStudents = deduplicateStudents(filteredStudents);
      
      const activeStudents = uniqueStudents.filter(s => {
        if (s.is_active !== undefined && s.is_active === false) return false;
        if (s.status !== undefined && s.status.toLowerCase() === 'inactive') return false;
        return true;
      });

      console.log('Active students:', activeStudents.length);
      
      setStudents(activeStudents);
      
      if (activeStudents.length > 0) {
        setSelectedStudent(activeStudents[0]);
      } else {
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const getExtraDetails = (std: any) => {
    const getAvatar = (name: string) => {
      if (std.profile_picture && std.profile_picture.startsWith('http')) {
        return std.profile_picture;
      }
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const colors = ['4C469D', 'E74C3C', '2ECC71', 'F39C12', '3498DB', '9B59B6', '1ABC9C', 'E67E22'];
      const colorIndex = name.length % colors.length;
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${colors[colorIndex]}&color=fff&size=128&bold=true`;
    };

    return {
      name: std.full_name || std.name || 'Student',
      regNo: std.student_id || std.registration_no || 'N/A',
      class: std.class_name || std.current_class_name || std.class || 'N/A',
      dob: std.date_of_birth || 'N/A',
      father: std.father_name || 'N/A',
      phone: std.phone || std.mobile || 'N/A',
      address: std.address || 'N/A',
      admissionDate: std.admission_date || std.date_of_admission || 'N/A',
      gender: std.gender || 'N/A',
      bloodGroup: std.blood_group || 'N/A',
      avatar: getAvatar(std.full_name || std.name || 'Student')
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const currentStudent = selectedStudent || (students.length > 0 ? students[0] : null);
  const extras = currentStudent ? getExtraDetails(currentStudent) : null;

  // Render different card styles
  const renderCard = (extras: any, style: CardStyle) => {
    switch (style) {
      case 'style2':
        return renderStyle2(extras);
      case 'style3':
        return renderStyle3(extras);
      default:
        return renderDefault(extras);
    }
  };

  // DEFAULT STYLE - Modern with banner
  const renderDefault = (extras: any) => (
    <div className="w-[320px] h-[480px] bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col justify-between relative print:shadow-none print:border print:border-slate-300">
      <div className="bg-[#4C469D] text-white p-5 text-center relative overflow-hidden h-[120px] flex flex-col justify-center items-center">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8"></div>
        <div className="flex items-center gap-1.5">
          <GraduationCap className="w-6 h-6 text-white" />
          <span className="font-black text-lg tracking-tight">My School</span>
        </div>
        <p className="text-[8px] font-bold opacity-85 tracking-widest mt-0.5">SECONDARY SCHOOL SYSTEM</p>
      </div>

      <div className="flex justify-center -mt-12 z-10">
        <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-50 overflow-hidden shadow-md">
          <img src={extras.avatar} alt={extras.name} className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="px-6 text-center space-y-1">
        <h3 className="text-lg font-black text-slate-800 tracking-tight">{extras.name}</h3>
        <span className="inline-block px-3 py-0.5 bg-purple-50 text-purple-700 font-extrabold text-[9px] rounded-lg tracking-wider uppercase border border-purple-100">
          {extras.class}
        </span>
      </div>

      <div className="px-6 py-4 space-y-2.5 text-xs text-left">
        <div className="flex justify-between border-b border-slate-100 pb-1">
          <span className="text-slate-400 font-bold text-[9px] uppercase">Reg No</span>
          <span className="font-extrabold text-slate-700">{extras.regNo}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-1">
          <span className="text-slate-400 font-bold text-[9px] uppercase">Father Name</span>
          <span className="font-bold text-slate-600">{extras.father}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-1">
          <span className="text-slate-400 font-bold text-[9px] uppercase">Date of Birth</span>
          <span className="font-bold text-slate-600">{extras.dob}</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-1">
          <span className="text-slate-400 font-bold text-[9px] uppercase">Emergency No</span>
          <span className="font-bold text-slate-600">{extras.phone}</span>
        </div>
      </div>

      <div className="bg-slate-50 border-t border-slate-100 p-4 text-center flex flex-col items-center justify-center space-y-1">
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`SCHOOL-${extras.regNo}`)}`} alt="QR Code" className="w-12 h-12 object-contain" />
        <span className="text-[8px] font-black text-slate-400 font-mono tracking-widest">*{extras.regNo}*</span>
      </div>
    </div>
  );

  // STYLE 2 - Horizontal Layout with Side Badge
  const renderStyle2 = (extras: any) => (
    <div className="w-[420px] h-[280px] bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex print:shadow-none print:border print:border-slate-300">
      {/* Left Side - Colored Badge with Avatar */}
      <div className="w-[140px] bg-gradient-to-b from-purple-600 to-indigo-800 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-20 h-20 rounded-full border-4 border-white/80 bg-white/20 overflow-hidden shadow-lg">
          <img src={extras.avatar} alt={extras.name} className="w-full h-full object-cover" />
        </div>
        <div className="mt-3 text-center">
          <div className="text-[10px] font-bold opacity-75 uppercase tracking-wider">Student ID</div>
          <div className="text-lg font-black tracking-wider">{extras.regNo}</div>
        </div>
      </div>

      {/* Right Side - Details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-800">{extras.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 font-bold text-[10px] rounded">
              {extras.class}
            </span>
            <span className="text-[10px] text-slate-400">•</span>
            <span className="text-[10px] font-medium text-slate-500">{extras.gender}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Father</span>
            <span className="font-semibold text-slate-700">{extras.father}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block">DOB</span>
            <span className="font-semibold text-slate-700">{extras.dob}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Blood Group</span>
            <span className="font-semibold text-slate-700">{extras.bloodGroup}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Phone</span>
            <span className="font-semibold text-slate-700">{extras.phone}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="text-[8px] font-mono text-slate-400 tracking-wider">ID: {extras.regNo}</span>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=30x30&data=${encodeURIComponent(`SCHOOL-${extras.regNo}`)}`} alt="QR" className="w-8 h-8" />
        </div>
      </div>
    </div>
  );

  // STYLE 3 - Premium / Credit Card Style
  const renderStyle3 = (extras: any) => (
    <div className="w-[380px] h-[500px] rounded-2xl bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 shadow-2xl overflow-hidden relative print:shadow-none print:border print:border-slate-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400 rounded-full -ml-24 -mb-24"></div>
      </div>
      
      {/* Card Content */}
      <div className="relative z-10 p-6 text-white h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold opacity-60 tracking-widest uppercase">Student ID Card</div>
            <div className="text-2xl font-black tracking-tight">My School</div>
          </div>
          <GraduationCap className="w-8 h-8 opacity-60" />
        </div>

        {/* Avatar & Name */}
        <div className="flex items-center gap-4 mt-4">
          <div className="w-20 h-20 rounded-full border-2 border-white/30 bg-white/10 overflow-hidden shadow-xl flex-shrink-0">
            <img src={extras.avatar} alt={extras.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-xl font-black">{extras.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-bold uppercase tracking-wider">
                {extras.class}
              </span>
              <span className="text-[10px] opacity-60">|</span>
              <span className="text-[10px] opacity-60">{extras.gender}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
          <div>
            <div className="text-[8px] font-bold opacity-50 uppercase tracking-wider">Registration</div>
            <div className="font-mono font-bold text-sm">{extras.regNo}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold opacity-50 uppercase tracking-wider">DOB</div>
            <div className="font-semibold text-sm">{extras.dob}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold opacity-50 uppercase tracking-wider">Father</div>
            <div className="font-semibold text-sm">{extras.father}</div>
          </div>
          <div>
            <div className="text-[8px] font-bold opacity-50 uppercase tracking-wider">Blood Group</div>
            <div className="font-semibold text-sm">{extras.bloodGroup}</div>
          </div>
        </div>

        {/* Footer with QR */}
        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            <div className="text-[8px] opacity-50">Valid ID</div>
            <div className="text-[10px] font-mono tracking-wider">{extras.regNo}</div>
          </div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${encodeURIComponent(`SCHOOL-${extras.regNo}`)}`} alt="QR" className="w-10 h-10" />
        </div>
      </div>
    </div>
  );

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

  // Show empty state
  if (!loading && students.length === 0) {
    return (
      <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
        <div className="print:hidden space-y-6">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
              <button onClick={() => navigate('/education/students')} className="hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Students
              </button>
              <span>&gt;</span>
              <span className="text-slate-500 font-bold">Student ID Cards</span>
            </div>
            <button 
              onClick={fetchStudents} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">🪪</div>
            <h3 className="text-lg font-bold text-slate-700">No Active Students Found</h3>
            <p className="text-sm text-slate-500">Please add active students to generate ID cards.</p>
            <button 
              onClick={() => navigate('/education/students/add')}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Add Student
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* INTERACTIVE HEADER (Hidden on print) */}
      <div className="print:hidden space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <button onClick={() => navigate('/education/students')} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Students
            </button>
            <span>&gt;</span>
            <span className="text-slate-500 font-bold">ID Cards</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium mr-1">Style:</span>
            <button
              onClick={() => setCardStyle('default')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                cardStyle === 'default' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setCardStyle('style2')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                cardStyle === 'style2' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Style 2
            </button>
            <button
              onClick={() => setCardStyle('style3')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                cardStyle === 'style3' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Premium
            </button>

            {students.length > 0 && (
              <select
                value={currentStudent?.id || currentStudent?.student_id || ''}
                onChange={(e) => {
                  const found = students.find(s => (s.id || s.student_id) === e.target.value);
                  if (found) setSelectedStudent(found);
                }}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
              >
                {students.map(s => {
                  const idKey = s.id || s.student_id;
                  const name = s.full_name || s.name || 'Student';
                  const regNo = s.student_id || s.registration_no || 'N/A';
                  return (
                    <option key={idKey} value={idKey}>
                      {name} ({regNo})
                    </option>
                  );
                })}
              </select>
            )}

            <button 
              onClick={fetchStudents} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reload
            </button>
          </div>
        </div>

        {/* Action Header Card */}
        {extras && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Student ID Card</h2>
              <p className="text-xs text-slate-500">
                {students.length} active student{students.length > 1 ? 's' : ''} • 
                Current: <span className="font-bold text-slate-700">{extras.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print ID Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CARD VIEW */}
      {extras && (
        <div className="flex justify-center items-center py-10 print:py-0">
          {renderCard(extras, cardStyle)}
        </div>
      )}
    </div>
  );
}