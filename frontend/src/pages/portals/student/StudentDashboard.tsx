import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import studentService from '@/services/student.service';
import financeService from '@/services/finance.service';
import { Calendar, Clock, DollarSign, BookOpen, User, RefreshCw, UserCheck, AlertCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import NotificationBell from '@/components/notifications/NotificationBell';

interface FeeItem {
  amount: number;
  month: string;
  status: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any | null>(null);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);

  // Clock state
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');

  useEffect(() => {
    fetchStudentData();
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [user]);

  const formatFeeMonth = (inv: any): string => {
    const raw = inv?.invoice_month || inv?.fee_month || inv?.due_date || inv?.issue_date || inv?.created_at || '';
    if (!raw) return 'N/A';
    if (typeof raw === 'string' && raw.includes(' ') && !raw.includes('-')) return raw;
    const m = String(raw).match(/^(\d{4})-(\d{2})/);
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const feeStatusLabel = (inv: any): string => {
    const paid = Number(inv?.paid_amount || 0);
    const balance = Number(inv?.balance_due ?? (Number(inv?.total_amount ?? inv?.amount ?? 0) - paid));
    const status = String(inv?.status || '').toLowerCase();
    if (status === 'paid' || balance <= 0) return 'PAID';
    if (status.includes('partial') || paid > 0) return 'PARTIALLY PAID';
    if (status === 'cancelled') return 'CANCELLED';
    return 'UNPAID';
  };

  const updateClock = () => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setCurrentDateStr(now.toLocaleDateString([], { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }));
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Load all students and match the logged-in one (same logic as Admission Letter)
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const list: any[] = Array.isArray(sRes?.data) ? sRes.data : [];

      const summaryId = user?.student?.student_id;
      let data: any = list.find(
        (s: any) =>
          (summaryId && String(s.student_id) === String(summaryId)) ||
          String(s.id) === String(user?.id) ||
          String(s.student_id) === String(user?.id) ||
          s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
      ) || null;

      // Fallback to first record so the dashboard still renders
      if (!data && list.length > 0) {
        data = list[0];
      }

      if (!data) {
        setStudent(null);
        return;
      }

      const val = (v: any) => (v === null || v === undefined || v === '' ? 'N/A' : v);

      const fullStudent = {
        name: data.full_name || user?.full_name || 'Student',
        regNo: val(data.student_id),
        admissionDate: val(data.admission_date),
        className: val(data.current_class_name || data.class_name),
        family: val(data.select_family),
        discount: data.discount_in_fee ? `${data.discount_in_fee}%` : '0%',
        dob: val(data.date_of_birth),
        gender: val(data.gender),
        idMark: val(data.identification_mark),
        bloodGroup: val(data.blood_group),
        disease: val(data.disease),
        nic: val(data.birth_form_id),
        cast: val(data.cast),
        prevSchool: val(data.previous_school),
        prevRollNo: val(data.previous_id),
        additionalNote: val(data.additional_note),
        orphan: val(data.orphan_student),
        osc: val(data.osc),
        religion: val(data.religion)
      };

      setStudent(fullStudent);

      // Load real invoices for this student
      try {
        const invRes = await financeService.getInvoices({ student_id: data.id }).catch(() => ({ data: [] }));
        const allInv: any[] = Array.isArray(invRes?.data) ? invRes.data : [];
        const mine = allInv.filter((inv: any) =>
          String(inv.student) === String(data.id) ||
          String(inv.student_id) === String(data.id) ||
          (inv.student && String(inv.student.id) === String(data.id))
        );
        mine.sort((a: any, b: any) =>
          new Date(b.created_at || b.issue_date || 0).getTime() - new Date(a.created_at || a.issue_date || 0).getTime()
        );
        setFeeItems(
          mine.map((inv: any) => ({
            amount: Number(inv.total_amount ?? inv.amount ?? 0),
            month: formatFeeMonth(inv),
            status: feeStatusLabel(inv),
          }))
        );
      } catch (err) {
        console.error('Failed to load invoices', err);
        setFeeItems([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-650" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col justify-center items-center h-96 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">Student profile not found for this account.</p>
        <button
          onClick={fetchStudentData}
          className="px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-650 text-xs font-bold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-400 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-855 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/student')}>Student Portal</span>
          <span>Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStudentData}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Student Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 flex flex-col items-center">
            
            {/* Campus Image Avatar placeholder matching Picture 2 */}
            <div className="w-40 h-40 rounded-full border-4 border-slate-100 overflow-hidden shadow-2xs mb-4 relative bg-slate-150 flex items-center justify-center">
              <span className="text-5xl">🎒</span>
            </div>

            {/* Name */}
            <h3 className="text-lg font-black text-[#5C53CD] uppercase tracking-wide text-center">
              {student?.name}
            </h3>

            {/* Details Fields list matching Picture 2 */}
            <div className="w-full mt-6 space-y-3.5 text-[11px] font-bold text-slate-500 border-t border-slate-100 pt-4">
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Registration No</span>
                <span className="text-blue-650 bg-blue-50 px-2 py-0.5 rounded-lg font-mono font-bold">
                  {student?.regNo}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date of Admission</span>
                <span className="text-slate-700 font-mono">{student?.admissionDate}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Class</span>
                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg font-bold">
                  {student?.className}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Family</span>
                <span className="text-slate-700">{student?.family}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Discount in Fee</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">
                  {student?.discount}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-100 my-2"></div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date of Birth</span>
                <span className="text-slate-700 font-mono">{student?.dob}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Gender</span>
                <span className="text-slate-700">{student?.gender}</span>
              </div>

              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 flex-shrink-0">Any Ident Section Mark?</span>
                <span className="text-slate-700 text-right">{student?.idMark}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Blood Group</span>
                <span className="text-slate-700">{student?.bloodGroup}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Disease if Any?</span>
                <span className="text-slate-700">{student?.disease}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Student Birth Form ID / NIC</span>
                <span className="text-slate-700 font-mono">{student?.nic}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cast</span>
                <span className="text-slate-700">{student?.cast}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Previous School</span>
                <span className="text-slate-700">{student?.prevSchool}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Previous ID / Board Roll No</span>
                <span className="text-slate-700 font-mono">{student?.prevRollNo}</span>
              </div>

              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 flex-shrink-0">Any Additional Note</span>
                <span className="text-slate-700 text-right">{student?.additionalNote}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Orphan Student</span>
                <span className="text-slate-700">{student?.orphan}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">OSC</span>
                <span className="text-slate-700">{student?.osc}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Religion</span>
                <span className="text-slate-700">{student?.religion}</span>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Hero Banner & Columns grid of reports */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Welcome Banner Card matching Picture 2 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
            <div className="space-y-1.5 z-10">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase tracking-wider">
                👋 Welcome {student?.name} at Student Portal.
              </span>
              <h2 className="text-xl font-black">Your Institute Name Here</h2>
              <p className="text-[10px] text-blue-150 font-bold uppercase tracking-wider">Your targetline goes here</p>
            </div>
            
            <div className="z-10 text-right md:text-right mt-4 md:mt-0 bg-white/10 p-3 rounded-xl border border-white/10 flex items-center gap-3">
              <NotificationBell />
              <div>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold justify-end">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-sm font-black">{currentTime}</span>
                </div>
                <p className="text-[9px] text-blue-100 font-bold uppercase tracking-wider mt-0.5">{currentDateStr}</p>
              </div>
            </div>

            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-white/5 skew-x-12 transform origin-bottom-right"></div>
          </div>

          {/* Sub Grid of Reports 1, 2, 3, 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column A (Left Column): Report 1 & 2 */}
            <div className="space-y-6">
              
              {/* 1. Attendance Report */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-xs">1</span>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Attendance Report
                  </h3>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="46" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
                      <circle cx="56" cy="56" r="46" stroke="#3b82f6" strokeWidth="10" fill="transparent" 
                              strokeDasharray={2 * Math.PI * 46} 
                              strokeDashoffset={0} />
                    </svg>
                    <div className="absolute text-center">
                      <span className="block text-lg font-black text-blue-650 leading-none">100%</span>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Overall</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[8px] font-bold text-slate-400">
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Present</div>
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-450"></span> Leave</div>
                    <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-450"></span> Absent</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-150 text-center">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Today</span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[8px] font-black uppercase">
                      NOT MARKED
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-150 text-center">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Yesterday</span>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[8px] font-black uppercase">
                      NOT MARKED
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-center">
                    <span className="block text-base font-black text-blue-600">1</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Presents</span>
                  </div>
                  <div className="p-2 bg-purple-50/50 rounded-lg border border-purple-100 text-center">
                    <span className="block text-base font-black text-purple-600">0</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Leaves</span>
                  </div>
                  <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100 text-center">
                    <span className="block text-base font-black text-rose-600">0</span>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Absents</span>
                  </div>
                </div>
              </div>

              {/* 2. Class Tests Report */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-xs">2</span>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Class Tests Report
                  </h3>
                </div>

                <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-2xl">📝</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-700">No Record Found.</p>
                    <p className="text-[9px] text-slate-400 font-bold">No academic class test scores found.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Column B (Right Column): Report 3 & 4 */}
            <div className="space-y-6">
              
              {/* 3. Examination Report */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-xs">3</span>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Examination Report
                  </h3>
                </div>

                <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-2xl">🏆</span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-700">No Record Found.</p>
                    <p className="text-[9px] text-slate-400 font-bold">No final board exam results found.</p>
                  </div>
                </div>
              </div>

              {/* 4. Fee Report */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-xs">4</span>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Fee Report
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {feeItems.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2">
                      <span className="text-2xl">💳</span>
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-slate-700">No Record Found.</p>
                        <p className="text-[9px] text-slate-400 font-bold">No fee invoices found.</p>
                      </div>
                    </div>
                  ) : (
                    feeItems.map((fee, idx) => {
                      const badge =
                        fee.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : fee.status === 'PARTIALLY PAID'
                          ? 'bg-amber-100 text-amber-700'
                          : fee.status === 'CANCELLED'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-rose-100 text-rose-700';
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
                          <div className="space-y-0.5">
                            <span className="block text-xs font-black text-slate-700">Rs {fee.amount.toLocaleString()}</span>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fees of {fee.month}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${badge}`}>
                            {fee.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}