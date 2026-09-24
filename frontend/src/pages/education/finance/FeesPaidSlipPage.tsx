import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Landmark, Printer, ArrowLeft, Check, AlertTriangle, CalendarDays, RefreshCw } from 'lucide-react';
import studentService from '@/services/student.service';
import financeService from '@/services/finance.service';
import { extractListData } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import settingsService from '@/services/settings.service';
import { cur } from '@/utils/currency';

interface Invoice {
  id: string;
  invoice_number: string;
  student: any;
  student_id?: any;
  student_name: string;
  student_id_code: string;
  student_id_num?: string;
  class_name: string;
  fee_month: string;
  invoice_month?: string;
  due_date: string;
  amount: number;
  fine_after_due_date: number;
  late_fee_amount?: number;
  opening_balance?: number;
  discount_amount?: number;
  total_amount?: number;
  balance_due?: number;
  previous_balance?: number;
  bank_name: string;
  status: string;
  description: string;
  created_at: string;
  paid_amount?: number;
  remaining_balance?: number;
  invoice_type?: string;
  breakdown?: any;
  payment_history?: any[];
  cancellation_remarks?: string;
  particulars_payments?: {
    monthlyFee: number;
    admissionFee: number;
    regFee: number;
    artFee: number;
    transportFee: number;
    booksFee: number;
    uniformFee: number;
    fineFee: number;
    othersFee: number;
    prevBalance: number;
    discountFee: number;
  };
}

export default function FeesPaidSlipPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role, user } = useAuth();
  const isStudent = role === 'student';
  const queryStudentId = searchParams.get('student_id');

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // FIXED: Auto-detect current month
  const [feeMonth, setFeeMonth] = useState(() => {
    return new Date().toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Rendered receipt state
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);
  const [printMode, setPrintMode] = useState<'detailed' | 'mini'>('detailed');
  const [studentHistory, setStudentHistory] = useState<Invoice[]>([]);
  const [instituteInfo, setInstituteInfo] = useState<any>(null);

  useEffect(() => {
    fetchStudentsList();

    // Load institute profile settings
    const loadProfile = async () => {
      try {
        const local = settingsService.getLocalInstituteProfile();
        if (local) {
          setInstituteInfo({
            name: local.name,
            logo: local.logoUrl || local.logo,
            motto: local.targetLine || local.motto,
            phone: local.phone,
            email: local.email,
            website: local.website
          });
        }
        
        const res = await settingsService.getInstituteProfile();
        if (res && res.data) {
          const profile = res.data.profile || res.data || {};
          const mapped = {
            name: profile.name,
            logo: profile.logoUrl || profile.logo,
            motto: profile.targetLine || profile.motto,
            phone: profile.phone,
            email: profile.email,
            website: profile.website
          };
          setInstituteInfo(mapped);
          settingsService.setLocalInstituteProfile(profile);
        }
      } catch (e) {
        console.error('Failed to load institute profile', e);
      }
    };
    loadProfile();
  }, []);

  const fetchStudentsList = async () => {
    try {
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(sRes.data || []);
      setStudents(rawStudents);

      // Auto-select student if student or queryStudentId provided
      let targetStudent = null;
      if (isStudent) {
        targetStudent = rawStudents.find((s: any) => 
          String(s.id) === String(user?.id) || 
          String(s.student_id) === String(user?.id) ||
          s.full_name?.toLowerCase() === user?.full_name?.toLowerCase()
        );
        if (!targetStudent && rawStudents.length > 0) {
          targetStudent = rawStudents[0];
        }
      } else if (queryStudentId) {
        targetStudent = rawStudents.find((s: any) => 
          String(s.id) === String(queryStudentId) || 
          String(s.student_id) === String(queryStudentId)
        );
      }

      if (targetStudent) {
        setSelectedStudent(targetStudent);
        setSearchQuery(`${targetStudent.full_name} (${targetStudent.student_id || 'N/A'})`);
        
        // Load invoices for target student automatically
        const res = await financeService.getInvoices({ student_id: targetStudent.id }).catch(() => ({ data: [] }));
        const parsed: Invoice[] = extractListData<any>(res.data || []);
        const matches = parsed.filter(inv => {
          const isStudentMatch = String(inv.student) === String(targetStudent.id) || 
                                String(inv.student_id) === String(targetStudent.id) || 
                                (inv.student && String(inv.student.id) === String(targetStudent.id));
          return isStudentMatch && (inv.status === 'paid' || inv.status === 'partial');
        });
        const matchingAll = parsed.filter(inv => 
          String(inv.student) === String(targetStudent.id) || 
          String(inv.student_id) === String(targetStudent.id) || 
          (inv.student && String(inv.student.id) === String(targetStudent.id))
        );
        
        matches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        if (matches.length > 0) {
          setActiveReceipt(matches[0]);
          setStudentHistory(matchingAll);
          setFeeMonth(getInvoiceFeeMonth(matches[0]));
        }
      }
    } catch (e) {
      console.error(e);
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
    setSelectedStudent(student);
    setSearchQuery(`${student.full_name} (${student.student_id || 'N/A'})`);
    setSuggestions([]);

    try {
      const res = await financeService.getInvoices({ student_id: student.id }).catch(() => ({ data: [] }));
      const parsed: Invoice[] = extractListData<any>(res.data || []);
      const matchingAll = parsed.filter(inv => 
        String(inv.student) === String(student.id) || 
        String(inv.student_id) === String(student.id) || 
        (inv.student && String(inv.student.id) === String(student.id))
      );
      setStudentHistory(matchingAll);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    if (!feeMonth.trim()) {
      toast.error('Please enter fee month');
      return;
    }

    setLoading(true);
    try {
      const res = await financeService.getInvoices({ student_id: selectedStudent.id }).catch(() => ({ data: [] }));
      const parsed: Invoice[] = extractListData<any>(res.data || []);
      const targetMonth = getMonthValue(feeMonth);
      const matches = parsed.filter(inv => {
        const isStudentMatch = String(inv.student) === String(selectedStudent.id) || 
                              String(inv.student_id) === String(selectedStudent.id) || 
                              (inv.student && String(inv.student.id) === String(selectedStudent.id));
        const invMonth = inv.invoice_month || (inv.fee_month ? getMonthValue(inv.fee_month) : '') || '';
        const matchesMonth = invMonth.substring(0, 7) === targetMonth ||
                             (typeof invMonth === 'string' && invMonth.toLowerCase().trim() === feeMonth.toLowerCase().trim());
        const isPaidStatus = inv.status === 'paid' || inv.status === 'partial';
        return isStudentMatch && matchesMonth && isPaidStatus;
      });

      // Sort matches to prefer invoices that have payment details defined
      matches.sort((a, b) => {
        if (a.paid_amount !== undefined && b.paid_amount === undefined) return -1;
        if (a.paid_amount === undefined && b.paid_amount !== undefined) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const found = matches[0];
      const matchingAll = parsed.filter(inv => 
        String(inv.student) === String(selectedStudent.id) || 
        String(inv.student_id) === String(selectedStudent.id) || 
        (inv.student && String(inv.student.id) === String(selectedStudent.id))
      );

      if (found) {
        setActiveReceipt(found);
        setStudentHistory(matchingAll);
        toast.success('Fees Paid Slip generated successfully!');
      } else {
        toast.error(`No paid fee invoice found for this student in ${feeMonth}.`);
      }
    } catch (err) {
      toast.error('Failed to generate receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPrint = (mode: 'detailed' | 'mini') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const mIdx = Number(parts[1]) - 1;
        return `${parts[2]} ${months[mIdx]}, ${parts[0]}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const guardianName = selectedStudent ? (selectedStudent.father_name || selectedStudent.guardian_name || 'azhar') : 'azhar';

  // Helper to convert "Month Year" to "YYYY-MM" for input[type="month"]
  const getMonthValue = (monthYear: string) => {
    if (!monthYear) return '';
    try {
      const d = new Date(`${monthYear} 1`);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const formatMonthValue = (yearMonth: string) => {
    if (!yearMonth) return '';
    try {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
        month: 'long',
      });
      return `${monthName} ${year}`;
    } catch {
      return '';
    }
  };

  const getInvoiceFeeMonth = (inv: any): string => {
    if (!inv) return '';
    const monthVal = inv.invoice_month || inv.fee_month;
    if (!monthVal) return '';
    if (monthVal.includes(' ') && !monthVal.includes('-')) return monthVal;
    const match = monthVal.match(/^(\d{4})-(\d{2})/);
    if (match) {
      return formatMonthValue(`${match[1]}-${match[2]}`);
    }
    return monthVal;
  };

  // Calculations for active receipt
  const totalAmount = activeReceipt 
    ? (activeReceipt.total_amount !== undefined && activeReceipt.total_amount !== null
      ? Number(activeReceipt.total_amount)
      : (activeReceipt.particulars_payments 
        ? (Object.values(activeReceipt.particulars_payments).reduce((a: any, b: any) => Number(a) + Number(b), 0) - Number(activeReceipt.particulars_payments.discountFee)) 
        : (activeReceipt.breakdown && Object.keys(activeReceipt.breakdown).length > 0
          ? ((Object.values(activeReceipt.breakdown as any) as number[]).reduce((a: number, b: number) => a + b, 0) + Number(activeReceipt.late_fee_amount || activeReceipt.fine_after_due_date || 0) - Number(activeReceipt.discount_amount || 0) + Number(activeReceipt.opening_balance || 0))
          : Number(activeReceipt.amount))))
    : 0;

  const totalPaid = activeReceipt ? Number(activeReceipt.paid_amount || 0) : 0;
  const lastPayment = activeReceipt?.payment_history && activeReceipt.payment_history.length > 0
    ? activeReceipt.payment_history[activeReceipt.payment_history.length - 1]
    : null;
  const depositAmount = lastPayment ? Number(lastPayment.amount) : totalPaid;
  const previouslyPaid = totalPaid - depositAmount;

  const remainingBalance = activeReceipt
    ? (activeReceipt.balance_due !== undefined && activeReceipt.balance_due !== null
      ? Number(activeReceipt.balance_due)
      : activeReceipt.remaining_balance !== undefined && activeReceipt.remaining_balance !== null
        ? Number(activeReceipt.remaining_balance)
        : 0)
    : 0;

  const isPartiallyPaid = remainingBalance > 0;

  // Particulars breakdown mapping from particulars_payments, breakdown, or base invoice fields
  const monthlyFee = activeReceipt?.particulars_payments?.monthlyFee ?? activeReceipt?.breakdown?.tuition ?? activeReceipt?.amount ?? 0;
  const admissionFee = activeReceipt?.particulars_payments?.admissionFee ?? activeReceipt?.breakdown?.admission ?? 0;
  const regFee = activeReceipt?.particulars_payments?.regFee ?? activeReceipt?.breakdown?.registration ?? 0;
  const artFee = activeReceipt?.particulars_payments?.artFee ?? activeReceipt?.breakdown?.art ?? 0;
  const transportFee = activeReceipt?.particulars_payments?.transportFee ?? activeReceipt?.breakdown?.transport ?? 0;
  const booksFee = activeReceipt?.particulars_payments?.booksFee ?? activeReceipt?.breakdown?.books ?? 0;
  const uniformFee = activeReceipt?.particulars_payments?.uniformFee ?? activeReceipt?.breakdown?.uniform ?? 0;
  const fineFee = activeReceipt?.particulars_payments?.fineFee ?? activeReceipt?.late_fee_amount ?? activeReceipt?.fine_after_due_date ?? 0;
  const othersFee = activeReceipt?.particulars_payments?.othersFee ?? activeReceipt?.breakdown?.others ?? 0;
  const prevBalance = activeReceipt?.particulars_payments?.prevBalance ?? activeReceipt?.opening_balance ?? activeReceipt?.previous_balance ?? 0;
  const discountFee = activeReceipt?.particulars_payments?.discountFee ?? activeReceipt?.discount_amount ?? 0;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0 print:m-0">
      
      {/* Dynamic Print CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; box-sizing: border-box; }
        }
      `}} />

      {/* Top Breadcrumb Bar — Hidden on Print */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate(isStudent ? '/student' : '/education/finance')}>{isStudent ? 'Dashboard' : 'Fees'}</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Fees Paid Slip</span>
        </div>
      </div>

      {/* PRINT-ONLY SECTION */}
      {activeReceipt && (
        <div className="hidden print:block print-section w-full text-slate-800 font-sans">
          {printMode === 'detailed' ? (
            /* DETAILED FEE SLIP PRINT VIEW */
            <div className="p-6 space-y-6 bg-white w-full">
              {/* Header */}
              <div className="text-center space-y-1">
                {instituteInfo?.logo ? (
                  <img src={instituteInfo.logo} alt="Logo" className="h-12 mx-auto object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">🎓</div>
                )}
                <h2 className="text-2xl font-black tracking-wide text-slate-800">{instituteInfo?.name || 'Code Cortex'}</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{instituteInfo?.motto ? `"${instituteInfo.motto}"` : '"YOUR SCHOOL SOFTWARE"'}</p>
                <p className="text-[9px] font-bold text-slate-400">
                  {[instituteInfo?.phone, instituteInfo?.website, instituteInfo?.email].filter(Boolean).join(' | ') || '+923460004443 | www.codecortex.com | info@codecortex.com'}
                </p>
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Fee Submission Slip</h3>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-12 gap-4 border-y border-slate-200 py-4 items-center">
                <div className="col-span-3 flex justify-center">
                  <div className="w-16 h-16 rounded-full border border-slate-250 bg-slate-100 flex items-center justify-center text-xl overflow-hidden">
                    👤
                  </div>
                </div>
                
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Registration no</p>
                  <p className="text-slate-800 text-xs font-black">→ {activeReceipt.student_id_num || activeReceipt.student_id_code || 'N/A'}</p>
                  <p className="text-slate-400">Student Name</p>
                  <p className="text-slate-850">→ {activeReceipt.student_name}</p>
                  <p className="text-slate-400">Guardian name</p>
                  <p className="text-slate-850">→ {guardianName}</p>
                  <p className="text-slate-400">class</p>
                  <p className="text-slate-850">→ {activeReceipt.class_name}</p>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Serial no</p>
                  <p className="text-slate-800 text-xs font-black">→ {activeReceipt.invoice_number}</p>
                  <p className="text-slate-400">Date of Submission</p>
                  <p className="text-slate-850">→ {formatDateLabel(activeReceipt.created_at.split('T')[0])}</p>
                  <p className="text-slate-400">Fees Month</p>
                  <p className="text-slate-855">→ {getInvoiceFeeMonth(activeReceipt)}</p>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Total Amount</p>
                  <p className="text-slate-800 text-xs font-black">→ {cur()} {totalAmount}</p>
                  {(previouslyPaid || 0) > 0 && (
                    <>
                      <p className="text-slate-400">Previously Paid</p>
                      <p className="text-slate-800 text-xs font-black">→ {cur()} {previouslyPaid}</p>
                    </>
                  )}
                  <p className="text-slate-400">Deposit Amount</p>
                  <p className="text-slate-800 text-xs font-black">→ {cur()} {depositAmount}</p>
                  <p className="text-slate-400">Remaining Balance</p>
                  <p className="text-rose-600 text-xs font-black">→ {cur()} {remainingBalance} {remainingBalance > 0 && '(Partially Paid)'}</p>
                </div>
              </div>

              {/* Particulars Table */}
              <div className="pt-2">
                <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                      <th className="py-1.5 px-3 border-r border-slate-350">Sr. No.</th>
                      <th className="py-1.5 px-3 border-r border-slate-350">Particulars</th>
                      <th className="py-1.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">1</td><td className="py-1 px-3 border-r border-slate-200">MONTHLY FEE</td><td className="py-1 px-3 text-right">{monthlyFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">2</td><td className="py-1 px-3 border-r border-slate-200">ADMISSION FEE</td><td className="py-1 px-3 text-right">{admissionFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">3</td><td className="py-1 px-3 border-r border-slate-200">REGISTRATION FEE</td><td className="py-1 px-3 text-right">{regFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">4</td><td className="py-1 px-3 border-r border-slate-200">ART MATERIAL</td><td className="py-1 px-3 text-right">{artFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">5</td><td className="py-1 px-3 border-r border-slate-200">TRANSPORT</td><td className="py-1 px-3 text-right">{transportFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">6</td><td className="py-1 px-3 border-r border-slate-200">BOOKS</td><td className="py-1 px-3 text-right">{booksFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">7</td><td className="py-1 px-3 border-r border-slate-200">UNIFORM</td><td className="py-1 px-3 text-right">{uniformFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">8</td><td className="py-1 px-3 border-r border-slate-200">FINE</td><td className="py-1 px-3 text-right">{fineFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">9</td><td className="py-1 px-3 border-r border-slate-200">OTHERS</td><td className="py-1 px-3 text-right">{othersFee}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">10</td><td className="py-1 px-3 border-r border-slate-200">PREVIOUS BALANCE</td><td className="py-1 px-3 text-right">{prevBalance}</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-1 px-3 border-r border-slate-200">11</td><td className="py-1 px-3 border-r border-slate-200">DISCOUNT IN FEE</td><td className="py-1 px-3 text-right">{discountFee}</td></tr>
                    
                    {/* Totals row */}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">TOTAL</td>
                      <td className="py-1 px-3 text-right">{cur()} {totalAmount}</td>
                    </tr>
                    {(previouslyPaid || 0) > 0 && (
                      <tr className="font-bold bg-slate-50">
                        <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">PREVIOUSLY PAID</td>
                        <td className="py-1 px-3 text-right text-amber-600">{cur()} {previouslyPaid}</td>
                      </tr>
                    )}
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">DEPOSIT</td>
                      <td className="py-1 px-3 text-right">{cur()} {depositAmount}</td>
                    </tr>
                    <tr className="font-black bg-slate-100">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">DUE-ABLE BALANCE</td>
                      <td className="py-1 px-3 text-right">{cur()} {remainingBalance}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Statement History section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wide">
                  Fee Submission Statement Of {activeReceipt.student_name}
                </h4>
                <table className="w-full text-[9px] text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 font-bold border-b border-slate-200 text-slate-650">
                      <th className="p-1 px-2 border-r border-slate-200">Sr#</th>
                      <th className="p-1 px-2 border-r border-slate-200">Submission Date</th>
                      <th className="p-1 px-2 border-r border-slate-200">Fee Month</th>
                      <th className="p-1 px-2 border-r border-slate-200">Total Amount</th>
                      <th className="p-1 px-2 border-r border-slate-200">Deposit</th>
                      <th className="p-1 px-2">Due-able</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                    {studentHistory.map((h, i) => {
                      const totalH = h.particulars_payments ? (Object.values(h.particulars_payments).reduce((a, b) => a + b, 0) - h.particulars_payments.discountFee) : h.amount;
                      const depositH = h.paid_amount ?? (h.status === 'paid' ? h.amount : 0);
                      const dueH = h.balance_due ?? h.remaining_balance ?? (h.status === 'unpaid' ? h.amount : 0);
                      return (
                        <tr key={h.id}>
                          <td className="p-1 px-2 border-r border-slate-150">{i + 1}</td>
                          <td className="p-1 px-2 border-r border-slate-150">{formatDateLabel(h.created_at.split('T')[0])}</td>
                          <td className="p-1 px-2 border-r border-slate-150">{getInvoiceFeeMonth(h)}</td>
                          <td className="p-1 px-2 border-r border-slate-150">{totalH}</td>
                          <td className="p-1 px-2 border-r border-slate-150">{depositH}</td>
                          <td className="p-1 px-2">{dueH}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-2 pt-6 text-[10px] font-bold text-slate-650">
                <div className="space-y-8">
                  <p>Prepared by : ______________________</p>
                  <p>Checked By : ______________________</p>
                </div>
                <div className="text-right pt-8">
                  <p>Accounts department</p>
                </div>
              </div>
            </div>
          ) : (
            /* MINI FEE SLIP PRINT VIEW */
            <div className="p-6 space-y-6 bg-white w-full">
              {/* Header */}
              <div className="text-center space-y-1">
                {instituteInfo?.logo ? (
                  <img src={instituteInfo.logo} alt="Logo" className="h-12 mx-auto object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">🎓</div>
                )}
                <h2 className="text-2xl font-black tracking-wide text-slate-800">{instituteInfo?.name || 'Code Cortex'}</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{instituteInfo?.motto ? `"${instituteInfo.motto}"` : '"YOUR SCHOOL SOFTWARE"'}</p>
                <p className="text-[9px] font-bold text-slate-400">
                  {[instituteInfo?.phone, instituteInfo?.website, instituteInfo?.email].filter(Boolean).join(' | ') || '+923460004443 | www.codecortex.com | info@codecortex.com'}
                </p>
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Fee Submission Slip</h3>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-12 gap-4 border-y border-slate-200 py-4 items-center">
                <div className="col-span-3 flex justify-center">
                  <div className="w-16 h-16 rounded-full border border-slate-250 bg-slate-100 flex items-center justify-center text-xl overflow-hidden">
                    👤
                  </div>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Reg. No:</p>
                  <p className="text-slate-800 font-black">{activeReceipt.student_id_num || activeReceipt.student_id_code || 'N/A'}</p>
                  <p className="text-slate-400">Student Name:</p>
                  <p className="text-slate-800">{activeReceipt.student_name}</p>
                  <p className="text-slate-400">Father Name:</p>
                  <p className="text-slate-800">{guardianName}</p>
                  <p className="text-slate-400">Class:</p>
                  <p className="text-slate-800">{activeReceipt.class_name}</p>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Serial No:</p>
                  <p className="text-slate-800 font-black">{activeReceipt.invoice_number}</p>
                  <p className="text-slate-400">Submit Date:</p>
                  <p className="text-slate-800">{activeReceipt.created_at.split('T')[0]}</p>
                  <p className="text-slate-400">Fees Month:</p>
                  <p className="text-slate-800">{getInvoiceFeeMonth(activeReceipt)}</p>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Total Amount:</p>
                  <p className="text-slate-800 font-black">{cur()} {totalAmount}</p>
                  <p className="text-slate-400">Deposit Amount:</p>
                  <p className="text-slate-800 font-black">{cur()} {depositAmount}</p>
                  <p className="text-slate-400">Remaining Balance:</p>
                  <p className="text-rose-600 font-black">{cur()} {remainingBalance} {remainingBalance > 0 && '(Partially Paid)'}</p>
                </div>
              </div>

              {/* Signature section */}
              <div className="grid grid-cols-2 pt-12 text-[10px] font-bold text-slate-650">
                <div className="space-y-8">
                  <p>Prepared By : ______________________</p>
                  <p>Checked By : ______________________</p>
                </div>
                <div className="text-right pt-8">
                  <p>Accounts Department</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN SCREEN SECTION (Hidden on print) */}
      <div className="print:hidden">
        {!activeReceipt ? (
          <div className="space-y-8">
            {isStudent ? (
              studentHistory.length === 0 ? (
                <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center py-12 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto text-xl">
                    ⚠️
                  </div>
                  <h3 className="font-extrabold text-base text-slate-800">No Paid Fee Receipt Found</h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
                    There are no paid fee slip records generated for your account. Please contact the administration department.
                  </p>
                </div>
              ) : null
            ) : (
              /* SEARCH CARD */
              <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-650 mx-auto">
                    📄
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-800">Fees Paid Receipt</h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
                    Select a student and fee month to view or print their paid receipt.
                  </p>
                </div>

                <form onSubmit={handleGenerateReceipt} className="space-y-5">
                  {/* FIXED: Fee Month with Calendar Picker */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEE MONTH *</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="month"
                        value={getMonthValue(feeMonth)}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const formatted = formatMonthValue(e.target.value);
                          setFeeMonth(formatted);
                        }}
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SEARCH STUDENT *</label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Type student name or registration number"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                      />
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-50">
                        {suggestions.map(s => (
                          <div
                            key={s.id}
                            onClick={() => handleSelectStudent(s)}
                            className="p-3 hover:bg-purple-50/50 cursor-pointer text-xs font-semibold text-slate-700 flex justify-between items-center"
                          >
                            <span>{s.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full">
                              Reg: {s.student_id || 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-10 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
                    >
                      Generate Receipt
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Complete Invoice & Payment History */}
            {((isStudent && studentHistory.length > 0) || (!isStudent && selectedStudent)) && (
              <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                    {isStudent ? 'My Invoice & Payment History' : `Invoice History for ${selectedStudent.full_name}`}
                  </h4>
                  <span className="text-[10px] font-bold bg-purple-50 text-[#5C53CD] px-2.5 py-1 rounded-full uppercase">
                    {studentHistory.length} Invoice{studentHistory.length !== 1 ? 's' : ''} Found
                  </span>
                </div>

                {studentHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold py-6 text-center">No invoices generated for this student yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-black text-slate-455 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Invoice No</th>
                          <th className="py-2.5 px-3">Month</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Total Amount</th>
                          <th className="py-2.5 px-3 text-right">Paid</th>
                          <th className="py-2.5 px-3 text-right">Pending</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {studentHistory.map(inv => {
                          const totalAmt = inv.total_amount !== undefined ? inv.total_amount : (inv.amount + (inv.late_fee_amount || 0) - (inv.discount_amount || 0));
                          const balance = inv.balance_due !== undefined ? inv.balance_due : (totalAmt - (inv.paid_amount || 0));

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="py-3.5 px-3 font-mono text-slate-655 uppercase tracking-tight">{inv.invoice_number}</td>
                              <td className="py-3.5 px-3">{getInvoiceFeeMonth(inv)}</td>
                              <td className="py-3.5 px-3 uppercase text-[10px] text-slate-500">{inv.invoice_type || 'Tuition'}</td>
                              <td className="py-3.5 px-3 text-right font-bold">{cur()} {Number(totalAmt).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-right text-emerald-600 font-bold">{cur()} {Number(inv.paid_amount || 0).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-right font-bold text-slate-655">{cur()} {Number(balance).toLocaleString()}</td>
                              <td className="py-3.5 px-3 text-center">
                                {inv.status === 'paid' || balance <= 0 ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">Paid</span>
                                ) : inv.status === 'cancelled' ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-400" title={`Cancellation Remarks: ${inv.cancellation_remarks || 'None'}`}>Cancelled</span>
                                ) : inv.status === 'partial' || (inv.paid_amount > 0 && balance > 0) ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">Partial</span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500">Unpaid</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {(inv.status === 'paid' || inv.status === 'partial') ? (
                                  <button
                                    onClick={() => setActiveReceipt(inv)}
                                    className="px-3 py-1.5 bg-purple-50 text-purple-650 hover:bg-purple-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                  >
                                    View Slip
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 italic">No Slip</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* PRINTABLE PAID RECEIPT SLIP CARD */
          <div className="max-w-4xl mx-auto space-y-6">
            {!isStudent && (
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-655 hover:text-[#5C53CD]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Search
                </button>
              </div>
            )}

            {/* Status Alert Bar */}
            <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-black shadow-3xs uppercase tracking-wider ${
              isPartiallyPaid 
                ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#D97706]' 
                : 'bg-[#D1FAE5] border-[#A7F3D0] text-[#059669]'
            }`}>
              {isPartiallyPaid ? (
                <>
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Partially Paid</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 shrink-0 bg-emerald-600 text-white rounded-full p-0.5" />
                  <span>Fully Paid</span>
                </>
              )}
            </div>

            {/* Main Receipt Sheet */}
            <div className="bg-white p-8 rounded-3xl border border-slate-150 shadow-sm space-y-8 relative overflow-hidden">
              
              {/* Header section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                <div className="space-y-1.5 text-left">
                  <h2 className="text-2xl font-black text-[#1C1656] tracking-tight">Fees Paid Receipt</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-455 text-[10px] font-bold">
                    <span className="flex items-center gap-1">👤 Student: <strong className="text-slate-700">{activeReceipt.student_name}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">🔑 Reg: <strong className="text-slate-700">{activeReceipt.student_id_num || activeReceipt.student_id_code || 'N/A'}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">🏫 Class: <strong className="text-slate-700">{activeReceipt.class_name}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">📅 Month: <strong className="text-slate-700">{getInvoiceFeeMonth(activeReceipt)}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">🏷️ Type: <strong className="text-slate-700 uppercase">{activeReceipt.invoice_type || 'Tuition'}</strong></span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isStudent && remainingBalance > 0 && (
                    <button
                      onClick={() => navigate(`/education/finance/collect-fees?student_id=${activeReceipt.student}`)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all print:hidden shadow-sm"
                    >
                      Collect Remaining ({cur()} {remainingBalance})
                    </button>
                  )}
                  <button
                    onClick={() => handleTriggerPrint('detailed')}
                    className="px-4 py-2 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Detailed
                  </button>
                  <button
                    onClick={() => handleTriggerPrint('mini')}
                    className="px-4 py-2 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Mini
                  </button>
                  <button
                    onClick={() => handleTriggerPrint('mini')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Thermal
                  </button>
                </div>
              </div>

              {/* Three Indicator Boxes */}
              <div className={`grid grid-cols-1 md:grid-cols-${(previouslyPaid || 0) > 0 ? 4 : 3} gap-6 text-center`}>
                
                {/* Total Amount */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL AMOUNT</span>
                  <span className="block text-xl font-black text-[#1b3bb6]">{cur()} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Previously Paid */}
                {(previouslyPaid || 0) > 0 && (
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">PREVIOUSLY PAID</span>
                    <span className="block text-xl font-black text-amber-600">{cur()} {previouslyPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {/* Deposit Amount */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">DEPOSIT AMOUNT</span>
                  <span className="block text-xl font-black text-[#10B981]">{cur()} {depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Remaining Balance */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">REMAINING BALANCE</span>
                  <span className="block text-xl font-black text-[#EF4444]">{cur()} {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

              </div>

              {/* Particulars Table */}
              <div className="pt-2">
                <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                      <th className="py-2 px-3 border-r border-slate-200">Sr. No.</th>
                      <th className="py-2 px-3 border-r border-slate-200">Particulars</th>
                      <th className="py-2 px-3 text-right">Amount ({cur()})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">1</td><td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-800">MONTHLY FEE</td><td className="py-1.5 px-3 text-right">{Number(monthlyFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">2</td><td className="py-1.5 px-3 border-r border-slate-200">ADMISSION FEE</td><td className="py-1.5 px-3 text-right">{Number(admissionFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">3</td><td className="py-1.5 px-3 border-r border-slate-200">REGISTRATION FEE</td><td className="py-1.5 px-3 text-right">{Number(regFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">4</td><td className="py-1.5 px-3 border-r border-slate-200">ART MATERIAL</td><td className="py-1.5 px-3 text-right">{Number(artFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">5</td><td className="py-1.5 px-3 border-r border-slate-200">TRANSPORT</td><td className="py-1.5 px-3 text-right">{Number(transportFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">6</td><td className="py-1.5 px-3 border-r border-slate-200">BOOKS</td><td className="py-1.5 px-3 text-right">{Number(booksFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">7</td><td className="py-1.5 px-3 border-r border-slate-200">UNIFORM</td><td className="py-1.5 px-3 text-right">{Number(uniformFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">8</td><td className="py-1.5 px-3 border-r border-slate-200">FINE</td><td className="py-1.5 px-3 text-right">{Number(fineFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">9</td><td className="py-1.5 px-3 border-r border-slate-200">OTHERS</td><td className="py-1.5 px-3 text-right">{Number(othersFee).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">10</td><td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-800">PREVIOUS BALANCE</td><td className="py-1.5 px-3 text-right">{Number(prevBalance).toLocaleString()}</td></tr>
                    <tr className="border-b border-slate-100"><td className="py-1.5 px-3 border-r border-slate-200">11</td><td className="py-1.5 px-3 border-r border-slate-200">DISCOUNT IN FEE</td><td className="py-1.5 px-3 text-right">{Number(discountFee).toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Print footer notice */}
              <div className="text-[10px] text-center text-slate-400 font-bold border-t border-slate-55 pt-6">
                * This is a computer generated receipt. Thank you for your payment.
              </div>

            </div>

            {/* Invoice & Payment History at the bottom of active receipt (print:hidden) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  Invoice & Payment History
                </h4>
                <span className="text-[10px] font-bold bg-purple-50 text-[#5C53CD] px-2.5 py-1 rounded-full uppercase">
                  {studentHistory.length} Invoice{studentHistory.length !== 1 ? 's' : ''} Found
                </span>
              </div>

              {studentHistory.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold py-4 text-center">No invoices generated for this student yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-black text-slate-455 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Invoice No</th>
                        <th className="py-2.5 px-3">Month</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">Paid</th>
                        <th className="py-2.5 px-3 text-right">Pending</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {studentHistory.map(inv => {
                        const totalAmt = inv.total_amount !== undefined ? inv.total_amount : (inv.amount + (inv.late_fee_amount || 0) - (inv.discount_amount || 0));
                        const balance = inv.balance_due !== undefined ? inv.balance_due : (totalAmt - (inv.paid_amount || 0));
                        const isCurrent = String(inv.id) === String(activeReceipt.id);

                        return (
                          <tr key={inv.id} className={`hover:bg-slate-50/30 transition-colors ${isCurrent ? 'bg-purple-50/30 font-bold' : ''}`}>
                            <td className="py-3.5 px-3 font-mono text-slate-655 uppercase tracking-tight">
                              {inv.invoice_number}
                              {isCurrent && <span className="ml-1.5 inline-block text-[9px] font-black tracking-widest text-[#5C53CD] uppercase bg-purple-100 px-1.5 py-0.5 rounded-sm">Current</span>}
                            </td>
                            <td className="py-3.5 px-3">{getInvoiceFeeMonth(inv)}</td>
                            <td className="py-3.5 px-3 uppercase text-[10px] text-slate-500">{inv.invoice_type || 'Tuition'}</td>
                            <td className="py-3.5 px-3 text-right font-bold">{cur()} {Number(totalAmt).toLocaleString()}</td>
                            <td className="py-3.5 px-3 text-right text-emerald-600 font-bold">{cur()} {Number(inv.paid_amount || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-3 text-right font-bold text-slate-655">{cur()} {Number(balance).toLocaleString()}</td>
                            <td className="py-3.5 px-3 text-center">
                              {inv.status === 'paid' || balance <= 0 ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">Paid</span>
                              ) : inv.status === 'cancelled' ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-400" title={`Cancellation Remarks: ${inv.cancellation_remarks || 'None'}`}>Cancelled</span>
                              ) : inv.status === 'partial' || (inv.paid_amount > 0 && balance > 0) ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">Partial</span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500">Unpaid</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {(inv.status === 'paid' || inv.status === 'partial') ? (
                                <button
                                  disabled={isCurrent}
                                  onClick={() => {
                                    setActiveReceipt(inv);
                                    setFeeMonth(getInvoiceFeeMonth(inv));
                                  }}
                                  className="px-3 py-1.5 bg-purple-50 disabled:opacity-50 text-purple-650 hover:bg-purple-100 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                >
                                  View Slip
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 italic">No Slip</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}