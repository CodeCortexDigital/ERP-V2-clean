import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Landmark, Printer, ArrowLeft, Check, AlertTriangle, CalendarDays, RefreshCw } from 'lucide-react';
import studentService from '@/services/student.service';
import financeService from '@/services/finance.service';
import { extractListData } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Invoice {
  id: string;
  invoice_number: string;
  student: string;
  student_name: string;
  student_id_code: string;
  class_name: string;
  fee_month: string;
  due_date: string;
  amount: number;
  fine_after_due_date: number;
  bank_name: string;
  status: 'unpaid' | 'paid';
  description: string;
  created_at: string;
  paid_amount?: number;
  remaining_balance?: number;
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

  useEffect(() => {
    fetchStudentsList();
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
        const res = await financeService.getInvoices({ student: targetStudent.id }).catch(() => ({ data: [] }));
        const parsed: Invoice[] = extractListData<any>(res.data || []);
        const matches = parsed.filter(inv => inv.student === targetStudent.id && inv.status === 'paid');
        const matchingAll = parsed.filter(inv => inv.student === targetStudent.id);
        
        matches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        if (matches.length > 0) {
          setActiveReceipt(matches[0]);
          setStudentHistory(matchingAll);
          setFeeMonth(matches[0].fee_month);
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

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery(`${student.full_name} (${student.student_id || 'N/A'})`);
    setSuggestions([]);
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
      const res = await financeService.getInvoices({ student: selectedStudent.id }).catch(() => ({ data: [] }));
      const parsed: Invoice[] = extractListData<any>(res.data || []);
      const matches = parsed.filter(inv => 
        inv.student === selectedStudent.id && 
        inv.fee_month.toLowerCase().trim() === feeMonth.toLowerCase().trim() &&
        inv.status === 'paid'
      );

      // Sort matches to prefer invoices that have payment details defined
      matches.sort((a, b) => {
        if (a.paid_amount !== undefined && b.paid_amount === undefined) return -1;
        if (a.paid_amount === undefined && b.paid_amount !== undefined) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const found = matches[0];
      const matchingAll = parsed.filter(inv => inv.student === selectedStudent.id);

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

  // Helper to convert "YYYY-MM" to "Month Year"
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

  // Calculations for active receipt
  const totalAmount = activeReceipt 
    ? (activeReceipt.particulars_payments 
      ? (Object.values(activeReceipt.particulars_payments).reduce((a, b) => a + b, 0) - activeReceipt.particulars_payments.discountFee) 
      : (activeReceipt.amount + (activeReceipt.fine_after_due_date || 0) + 1500))
    : 0;

  const depositAmount = activeReceipt
    ? (activeReceipt.paid_amount ?? activeReceipt.amount)
    : 0;

  const remainingBalance = activeReceipt
    ? (activeReceipt.remaining_balance ?? 0)
    : 0;

  const isPartiallyPaid = remainingBalance > 0;

  // Particulars breakdown
  const monthlyFee = activeReceipt?.particulars_payments?.monthlyFee ?? activeReceipt?.amount ?? 0;
  const admissionFee = activeReceipt?.particulars_payments?.admissionFee ?? 0;
  const regFee = activeReceipt?.particulars_payments?.regFee ?? 0;
  const artFee = activeReceipt?.particulars_payments?.artFee ?? 0;
  const transportFee = activeReceipt?.particulars_payments?.transportFee ?? 0;
  const booksFee = activeReceipt?.particulars_payments?.booksFee ?? 0;
  const uniformFee = activeReceipt?.particulars_payments?.uniformFee ?? 0;
  const fineFee = activeReceipt?.particulars_payments?.fineFee ?? activeReceipt?.fine_after_due_date ?? 0;
  const othersFee = activeReceipt?.particulars_payments?.othersFee ?? 0;
  const prevBalance = activeReceipt?.particulars_payments?.prevBalance ?? 1500;
  const discountFee = activeReceipt?.particulars_payments?.discountFee ?? 0;

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0 print:m-0">
      
      {/* Dynamic Print CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: auto;
            margin: 5mm;
          }
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />

      {/* Top Breadcrumb Bar — Hidden on Print */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Fees</span>
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
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">
                  🎓
                </div>
                <h2 className="text-2xl font-black tracking-wide text-slate-800">eSkooly</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
                <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com | info@eskooly.com</p>
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
                  <p className="text-slate-800 text-xs font-black">→ {activeReceipt.student_id_code}</p>
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
                  <p className="text-slate-850">→ {activeReceipt.fee_month}</p>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Total Amount</p>
                  <p className="text-slate-800 text-xs font-black">→ Rs {totalAmount}</p>
                  <p className="text-slate-400">Deposit Amount</p>
                  <p className="text-slate-800 text-xs font-black">→ Rs {depositAmount}</p>
                  <p className="text-slate-400">Remaining Balance</p>
                  <p className="text-rose-600 text-xs font-black">→ Rs {remainingBalance}</p>
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
                      <td className="py-1 px-3 text-right">Rs {totalAmount}</td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">DEPOSIT</td>
                      <td className="py-1 px-3 text-right">Rs {depositAmount}</td>
                    </tr>
                    <tr className="font-black bg-slate-100">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">DUE-ABLE BALANCE</td>
                      <td className="py-1 px-3 text-right">Rs {remainingBalance}</td>
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
                      const dueH = h.remaining_balance ?? (h.status === 'unpaid' ? h.amount : 0);
                      return (
                        <tr key={h.id}>
                          <td className="p-1 px-2 border-r border-slate-150">{i + 1}</td>
                          <td className="p-1 px-2 border-r border-slate-150">{formatDateLabel(h.created_at.split('T')[0])}</td>
                          <td className="p-1 px-2 border-r border-slate-150">{h.fee_month}</td>
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
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">
                  🎓
                </div>
                <h2 className="text-2xl font-black tracking-wide text-slate-800">eSkooly</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
                <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com | info@eskooly.com</p>
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
                  <p className="text-slate-800 font-black">{activeReceipt.student_id_code}</p>
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
                  <p className="text-slate-800">{activeReceipt.fee_month}</p>
                </div>

                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Total Amount:</p>
                  <p className="text-slate-800 font-black">Rs {totalAmount}</p>
                  <p className="text-slate-400">Deposit Amount:</p>
                  <p className="text-slate-800 font-black">Rs {depositAmount}</p>
                  <p className="text-slate-400">Remaining Balance:</p>
                  <p className="text-rose-600 font-black">Rs {remainingBalance}</p>
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
          isStudent ? (
            <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto text-xl">
                ⚠️
              </div>
              <h3 className="font-extrabold text-base text-slate-800">No Paid Fee Receipt Found</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
                There are no paid fee slip records generated for your account. Please contact the administration department.
              </p>
            </div>
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
        )) : (
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
                    <span className="flex items-center gap-1">🔑 Reg: <strong className="text-slate-700">{activeReceipt.student_id_code}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">🏫 Class: <strong className="text-slate-700">{activeReceipt.class_name}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">📅 Month: <strong className="text-slate-700">{activeReceipt.fee_month}</strong></span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                
                {/* Total Amount */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL AMOUNT</span>
                  <span className="block text-xl font-black text-[#1b3bb6]">Rs {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Deposit Amount */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">DEPOSIT AMOUNT</span>
                  <span className="block text-xl font-black text-[#10B981]">Rs {depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* Remaining Balance */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">REMAINING BALANCE</span>
                  <span className="block text-xl font-black text-[#EF4444]">Rs {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

              </div>

              {/* Print footer notice */}
              <div className="text-[10px] text-center text-slate-400 font-bold border-t border-slate-55 pt-6">
                * This is a computer generated receipt. Thank you for your payment.
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}