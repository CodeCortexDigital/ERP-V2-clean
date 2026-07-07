import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Printer, Download, ArrowLeft, RotateCcw } from 'lucide-react';
import studentService, { Student } from '@/services/student.service';
import { extractListData } from '@/services/api';

export default function StudentIdCardsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

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
          full_name: 'Urwah', 
          class_name: 'Grade 1-A',
          profile_picture: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150' 
        }
      ];

      const combined = [...(filtered.length > 0 ? filtered : defaultStudents), ...customStudents].filter(s => !deletedIds.includes(s.id));
      setStudents(combined);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExtraDetails = (std: any) => {
    return {
      name: std.full_name || 'Urwah',
      regNo: std.student_id || '001',
      class: std.class_name || 'Grade 1-A',
      dob: std.date_of_birth || '01 January, 2021',
      father: std.father_name || 'Azhar',
      phone: std.phone || '+92 300 1234567',
      address: std.address || 'House 456, Block C, Lahore, Pakistan',
      avatar: std.profile_picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const currentStudent = selectedStudent || (students.length > 0 ? students[0] : null);
  const extras = currentStudent ? getExtraDetails(currentStudent) : null;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* 1. INTERACTIVE HEADER (Hidden on print) */}
      <div className="print:hidden space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <button onClick={() => navigate('/education/students')} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Students
            </button>
            <span>&gt;</span>
            <span className="text-slate-500 font-bold">Student ID Cards</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentStudent?.id || ''}
              onChange={(e) => {
                const found = students.find(s => s.id === e.target.value);
                if (found) setSelectedStudent(found);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || 'Student'} ({s.student_id})</option>
              ))}
            </select>

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
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-lg font-bold text-slate-800">Generate Student ID Card</h2>
              <p className="text-xs text-slate-500">Pick any active student from the dropdown above to view and print their ID card.</p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print ID Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. CARD VIEW & PRINT LAYOUT */}
      {extras && (
        <div className="flex justify-center items-center py-10 print:py-0">
          {/* Physical Style ID Card container */}
          <div className="w-[320px] h-[480px] bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col justify-between relative print:shadow-none print:border print:border-slate-300">
            
            {/* Header Banner - Slanted Graphic */}
            <div className="bg-[#4C469D] text-white p-5 text-center relative overflow-hidden h-[120px] flex flex-col justify-center items-center">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6"></div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-6 h-6 text-white" />
                <span className="font-black text-lg tracking-tight">My School</span>
              </div>
              <p className="text-[8px] font-bold opacity-85 tracking-widest mt-0.5">SECONDARY SCHOOL SYSTEM</p>
            </div>

            {/* Profile Avatar Frame */}
            <div className="flex justify-center -mt-12 z-10">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-50 overflow-hidden shadow-md">
                <img src={extras.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Student Meta Details */}
            <div className="px-6 text-center space-y-1">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{extras.name}</h3>
              <span className="inline-block px-3 py-0.5 bg-purple-50 text-purple-700 font-extrabold text-[9px] rounded-lg tracking-wider uppercase border border-purple-100">
                {extras.class}
              </span>
            </div>

            {/* Details Table */}
            <div className="px-6 py-4 space-y-2.5 text-xs text-left">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Reg No</span>
                <span className="font-extrabold text-slate-700">{extras.regNo}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Father Name</span>
                <span className="font-bold text-slate-600">{extras.father}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Date of Birth</span>
                <span className="font-bold text-slate-600">{extras.dob}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Emergency No</span>
                <span className="font-bold text-slate-600">{extras.phone}</span>
              </div>
            </div>

            {/* Card Footer - Barcode Area */}
            <div className="bg-slate-50 border-t p-4 text-center flex flex-col items-center justify-center space-y-1">
              {/* QR Code Barcode Representation */}
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=MY SCHOOL-${extras.regNo}`} alt="Barcode" className="w-10 h-10 object-contain" />
              <span className="text-[8px] font-black text-slate-400 font-mono tracking-widest">*{extras.regNo}*</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
