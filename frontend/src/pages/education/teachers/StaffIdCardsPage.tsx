import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, Printer, Download, ArrowLeft, RotateCcw } from 'lucide-react';
import teacherService, { Teacher } from '@/services/teacher.service';
import { extractListData } from '@/services/api';

export default function StaffIdCardsPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const fetched = extractListData<any>(tRes.data);
      
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deleted_teacher_ids') || '[]');
      const filtered = fetched.filter(t => !deletedIds.includes(t.id));
      
      const defaultTeachers = [
        {
          id: 't-1',
          employee_id: '250822',
          full_name: 'Maryam Fatima',
          email: 'maryam.fatima@school.edu',
          phone: '+92 300 1234567',
          qualifications: ['Master of Education'],
          specializations: ['Teacher'],
          experience_years: 5,
          joining_date: '2026-06-29',
          is_active: true,
          profile_picture: null
        }
      ];

      const combined = filtered.length > 0 ? filtered : defaultTeachers;
      setTeachers(combined);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExtraDetails = (tch: any) => {
    const savedExtras = localStorage.getItem('employees_extra_info');
    let extra = {
      role: tch.specializations?.[0] || 'Teacher',
      fatherName: '--',
      phone: tch.phone || '+92 300 1234567',
      address: 'Lahore, Pakistan',
      avatar: tch.profile_picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200'
    };

    if (savedExtras) {
      try {
        const extrasMap = JSON.parse(savedExtras);
        if (extrasMap[tch.id]) {
          extra = { 
            ...extra, 
            ...extrasMap[tch.id],
            avatar: extrasMap[tch.id].profilePictureUrl || extra.avatar
          };
        }
      } catch (e) {}
    }
    return extra;
  };

  const handlePrint = () => {
    window.print();
  };

  const currentTeacher = selectedTeacher || (teachers.length > 0 ? teachers[0] : null);
  const extras = currentTeacher ? getExtraDetails(currentTeacher) : null;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* 1. INTERACTIVE HEADER (Hidden on print) */}
      <div className="print:hidden space-y-6">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
            <button onClick={() => navigate('/education/teachers')} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Employees
            </button>
            <span>&gt;</span>
            <span className="text-slate-500 font-bold">Staff ID Cards</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentTeacher?.id || ''}
              onChange={(e) => {
                const found = teachers.find(t => t.id === e.target.value);
                if (found) setSelectedTeacher(found);
              }}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.employee_id})</option>
              ))}
            </select>

            <button 
              onClick={fetchTeachers} 
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
              <h2 className="text-lg font-bold text-slate-800">Generate Staff ID Card</h2>
              <p className="text-xs text-slate-500">Pick any employee/staff member from the dropdown above to view and print their ID card.</p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handlePrint} className="px-6 py-2.5 bg-[#4C469D] hover:bg-[#3f3a85] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print ID Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. CARD VIEW & PRINT LAYOUT */}
      {extras && currentTeacher && (
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
              <p className="text-[8px] font-bold opacity-85 tracking-widest mt-0.5">INSTITUTE STAFF ID CARD</p>
            </div>

            {/* Profile Avatar Frame */}
            <div className="flex justify-center -mt-12 z-10">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-50 overflow-hidden shadow-md">
                <img src={extras.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Employee Meta Details */}
            <div className="px-6 text-center space-y-1">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{currentTeacher.full_name}</h3>
              <span className="inline-block px-3 py-0.5 bg-purple-50 text-purple-700 font-extrabold text-[9px] rounded-lg tracking-wider uppercase border border-purple-100">
                {extras.role}
              </span>
            </div>

            {/* Details Table */}
            <div className="px-6 py-4 space-y-2.5 text-xs text-left">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Emp ID</span>
                <span className="font-extrabold text-slate-700">{currentTeacher.employee_id}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Father/Husband</span>
                <span className="font-bold text-slate-600">{extras.fatherName}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Date of Joining</span>
                <span className="font-bold text-slate-600">{currentTeacher.joining_date || '2026-06-29'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-400 font-bold text-[9px] uppercase">Emergency No</span>
                <span className="font-bold text-slate-600">{extras.phone}</span>
              </div>
            </div>

            {/* Card Footer - Barcode Area */}
            <div className="bg-slate-50 border-t p-4 text-center flex flex-col items-center justify-center space-y-1">
              {/* QR Code Barcode Representation */}
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=STAFF-${currentTeacher.employee_id}`} alt="Barcode" className="w-10 h-10 object-contain" />
              <span className="text-[8px] font-black text-slate-400 font-mono tracking-widest">*{currentTeacher.employee_id}*</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
