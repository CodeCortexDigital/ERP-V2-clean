import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Landmark, ShieldAlert, Check, AlertTriangle, Printer } from 'lucide-react';
import studentService from '@/services/student.service';
import financeService from '@/services/finance.service';
import { extractListData } from '@/services/api';

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
  previous_balance?: number;
  total_amount?: number;
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

interface SubmittedReceipt {
  invoice_number: string;
  student_name: string;
  student_id_code: string;
  class_name: string;
  fee_month: string;
  totalAmount: number;
  depositAmount: number;
  remainingBalance: number;
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
  date: string;
}

export default function CollectFeesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'student' | 'family' | 'scan'>('student');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);

  const [feeMonth, setFeeMonth] = useState(() => {
    return new Date().toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  });
  const [selectedFamily, setSelectedFamily] = useState('');

  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [admissionFee, setAdmissionFee] = useState(0);
  const [regFee, setRegFee] = useState(0);
  const [artFee, setArtFee] = useState(0);
  const [transportFee, setTransportFee] = useState(0);
  const [booksFee, setBooksFee] = useState(0);
  const [uniformFee, setUniformFee] = useState(0);
  const [fineFee, setFineFee] = useState(0);
  const [othersFee, setOthersFee] = useState(0);
  const [prevBalance, setPrevBalance] = useState(0);
  const [discountFee, setDiscountFee] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);

  const [submittedReceipt, setSubmittedReceipt] = useState<SubmittedReceipt | null>(null);
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

    // Try backend first
    try {
      const res = await financeService.getInvoices({ student: student.id });
      const data = extractListData<any>(res.data || []);
      const matchingUnpaid = data.filter((inv: any) => inv.student === student.id && (inv.status === 'unpaid' || (inv.status === 'paid' && inv.remaining_balance !== undefined && inv.remaining_balance > 0)));
      const matchingAll = data.filter((inv: any) => inv.student === student.id);

      setUnpaidInvoices(matchingUnpaid);
      setStudentHistory(matchingAll);

      if (matchingUnpaid.length > 0) {
        handleOpenCollectionForm(matchingUnpaid[0]);
      } else {
        setActiveInvoice(null);
      }
      return;
    } catch (e) {
      setUnpaidInvoices([]);
      setActiveInvoice(null);
    }
  };

  // FIXED: Properly handle partial payments
  const handleOpenCollectionForm = (invoice: Invoice) => {
    setActiveInvoice(invoice);

    const isPartial = invoice.remaining_balance !== undefined && invoice.remaining_balance > 0 && invoice.status === 'paid';
    const isUnpaid = invoice.status === 'unpaid';

    if (isPartial) {
      // This is a partial payment recovery - show only the remaining balance
      setMonthlyFee(0);
      setAdmissionFee(0);
      setRegFee(0);
      setArtFee(0);
      setTransportFee(0);
      setBooksFee(0);
      setUniformFee(0);
      setFineFee(0);
      setOthersFee(0);
      setPrevBalance(invoice.remaining_balance || 0);
      setDiscountFee(0);
      setDeposit(invoice.remaining_balance || 0);
    } else if (isUnpaid) {
      // Fresh invoice - show full amount
      const totalAmount = invoice.total_amount || invoice.amount;
      setMonthlyFee(invoice.amount);
      setAdmissionFee(0);
      setRegFee(0);
      setArtFee(0);
      setTransportFee(0);
      setBooksFee(0);
      setUniformFee(0);
      setFineFee(invoice.fine_after_due_date || 0);
      setOthersFee(0);
      setPrevBalance(invoice.previous_balance || 0);
      setDiscountFee(0);
      setDeposit(totalAmount);
    }

    setCollectionDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmitCollection = async () => {
    if (!activeInvoice) return;
    setLoading(true);
    try {
      const calculatedTotal = 
        Number(monthlyFee) +
        Number(admissionFee) +
        Number(regFee) +
        Number(artFee) +
        Number(transportFee) +
        Number(booksFee) +
        Number(uniformFee) +
        Number(fineFee) +
        Number(othersFee) +
        Number(prevBalance) -
        Number(discountFee);

      const remainingBal = calculatedTotal - deposit;

      await financeService.createPayment({
        invoice_id: activeInvoice.id,
        amount: deposit,
        date: collectionDate,
        particulars_payments: {
          monthlyFee: Number(monthlyFee),
          admissionFee: Number(admissionFee),
          regFee: Number(regFee),
          artFee: Number(artFee),
          transportFee: Number(transportFee),
          booksFee: Number(booksFee),
          uniformFee: Number(uniformFee),
          fineFee: Number(fineFee),
          othersFee: Number(othersFee),
          prevBalance: Number(prevBalance),
          discountFee: Number(discountFee)
        }
      });

      await financeService.updateInvoice(activeInvoice.id, {
        paid_amount: (activeInvoice.paid_amount || 0) + deposit,
        remaining_balance: remainingBal,
        status: 'paid'
      });

      setSubmittedReceipt({
        invoice_number: activeInvoice.invoice_number,
        student_name: activeInvoice.student_name,
        student_id_code: activeInvoice.student_id_code,
        class_name: activeInvoice.class_name,
        fee_month: activeInvoice.fee_month,
        totalAmount: calculatedTotal,
        depositAmount: deposit,
        remainingBalance: remainingBal,
        monthlyFee: Number(monthlyFee),
        admissionFee: Number(admissionFee),
        regFee: Number(regFee),
        artFee: Number(artFee),
        transportFee: Number(transportFee),
        booksFee: Number(booksFee),
        uniformFee: Number(uniformFee),
        fineFee: Number(fineFee),
        othersFee: Number(othersFee),
        prevBalance: Number(prevBalance),
        discountFee: Number(discountFee),
        date: collectionDate
      });

      toast.success(`Fee collected successfully! Rs ${deposit} deposited.`);
      setActiveInvoice(null);
    } catch (e) {
      toast.error('Failed to submit fee payment');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily) {
      toast.error('Please select family/guardian');
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await financeService.getInvoices().catch(() => ({ data: [] }));
        const parsed: Invoice[] = extractListData<any>(res.data || []);

        const familyStudents = students.filter(s => {
          const sFam = s.select_family || s.guardian_name || '';
          return sFam.toLowerCase().trim() === selectedFamily.toLowerCase().trim();
        });
        const familyStudentIds = familyStudents.map(s => s.id);

        const toCollect = parsed.filter(inv => familyStudentIds.includes(inv.student) && inv.fee_month === feeMonth && inv.status === 'unpaid');

        if (toCollect.length === 0) {
          toast.info(`No unpaid invoices found for family in ${feeMonth}`);
          setLoading(false);
          return;
        }

        let totalCollected = 0;

        await Promise.all(toCollect.map(async (inv) => {
          try {
            await financeService.updateInvoice(inv.id, { paid_amount: inv.amount, remaining_balance: 0, status: 'paid' });
            totalCollected += inv.amount;
          } catch (e) {
            console.error('Family payment update failed', e);
          }
        }));

        toast.success(`Successfully collected Rs ${totalCollected} from ${toCollect.length} family invoices!`);
        setSelectedFamily('');
      } catch (e) {
        toast.error('Failed to submit family payments');
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleTriggerPrint = (mode: 'detailed' | 'mini') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDoneReceipt = () => {
    setSubmittedReceipt(null);
    setSelectedStudent(null);
    setSearchQuery('');
    setUnpaidInvoices([]);
  };

  const uniqueFamilies: string[] = [];
  students.forEach(s => {
    const fam = s.select_family || s.guardian_name || '';
    if (fam && !uniqueFamilies.includes(fam)) {
      uniqueFamilies.push(fam);
    }
  });

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

  const totalAmount = 
    Number(monthlyFee) +
    Number(admissionFee) +
    Number(regFee) +
    Number(artFee) +
    Number(transportFee) +
    Number(booksFee) +
    Number(uniformFee) +
    Number(fineFee) +
    Number(othersFee) +
    Number(prevBalance) -
    Number(discountFee);

  const dueBalance = totalAmount - deposit;
  const guardianName = selectedStudent ? (selectedStudent.father_name || selectedStudent.guardian_name || 'azhar') : '';

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0 print:m-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: auto; margin: 5mm; }
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />

      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Fees</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Collect Fees</span>
        </div>
      </div>

      {submittedReceipt && (
        <div className="hidden print:block print-section w-full text-slate-800 font-sans">
          {printMode === 'detailed' ? (
            <div className="p-6 space-y-6 bg-white w-full">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">🎓</div>
                <h2 className="text-2xl font-black tracking-wide text-slate-800">eSkooly</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
                <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com | info@eskooly.com</p>
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Fee Submission Slip</h3>
              </div>

              <div className="grid grid-cols-12 gap-4 border-y border-slate-200 py-4 items-center">
                <div className="col-span-3 flex justify-center">
                  <div className="w-16 h-16 rounded-full border border-slate-250 bg-slate-100 flex items-center justify-center text-xl overflow-hidden">👤</div>
                </div>
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Registration no</p>
                  <p className="text-slate-800 text-xs font-black">→ {submittedReceipt.student_id_code}</p>
                  <p className="text-slate-400">Student Name</p>
                  <p className="text-slate-850">→ {submittedReceipt.student_name}</p>
                  <p className="text-slate-400">Guardian name</p>
                  <p className="text-slate-850">→ {guardianName}</p>
                  <p className="text-slate-400">class</p>
                  <p className="text-slate-850">→ {submittedReceipt.class_name}</p>
                </div>
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Serial no</p>
                  <p className="text-slate-800 text-xs font-black">→ {submittedReceipt.invoice_number}</p>
                  <p className="text-slate-400">Date of Submission</p>
                  <p className="text-slate-850">→ {formatDateLabel(submittedReceipt.date)}</p>
                  <p className="text-slate-400">Fees Month</p>
                  <p className="text-slate-850">→ {submittedReceipt.fee_month}</p>
                </div>
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Total Amount</p>
                  <p className="text-slate-800 text-xs font-black">→ Rs {submittedReceipt.totalAmount}</p>
                  <p className="text-slate-400">Deposit Amount</p>
                  <p className="text-slate-800 text-xs font-black">→ Rs {submittedReceipt.depositAmount}</p>
                  <p className="text-slate-400">Remaining Balance</p>
                  <p className="text-rose-600 text-xs font-black">→ Rs {submittedReceipt.remainingBalance}</p>
                </div>
              </div>

              <div className="pt-2">
                <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                      <th className="py-1.5 px-3 border-r border-slate-350">Sr. No.</th>
                      <th className="py-1.5 px-3 border-r border-slate-350">Particulars</th>
                      <th className="py-1.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr><td className="py-1 px-3 border-r border-slate-200">1</td><td className="py-1 px-3 border-r border-slate-200">MONTHLY FEE</td><td className="py-1 px-3 text-right">{submittedReceipt.monthlyFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">2</td><td className="py-1 px-3 border-r border-slate-200">PREVIOUS BALANCE</td><td className="py-1 px-3 text-right">{submittedReceipt.prevBalance}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">3</td><td className="py-1 px-3 border-r border-slate-200">ADMISSION FEE</td><td className="py-1 px-3 text-right">{submittedReceipt.admissionFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">4</td><td className="py-1 px-3 border-r border-slate-200">REGISTRATION FEE</td><td className="py-1 px-3 text-right">{submittedReceipt.regFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">5</td><td className="py-1 px-3 border-r border-slate-200">ART MATERIAL</td><td className="py-1 px-3 text-right">{submittedReceipt.artFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">6</td><td className="py-1 px-3 border-r border-slate-200">TRANSPORT</td><td className="py-1 px-3 text-right">{submittedReceipt.transportFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">7</td><td className="py-1 px-3 border-r border-slate-200">BOOKS</td><td className="py-1 px-3 text-right">{submittedReceipt.booksFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">8</td><td className="py-1 px-3 border-r border-slate-200">UNIFORM</td><td className="py-1 px-3 text-right">{submittedReceipt.uniformFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">9</td><td className="py-1 px-3 border-r border-slate-200">FINE</td><td className="py-1 px-3 text-right">{submittedReceipt.fineFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">10</td><td className="py-1 px-3 border-r border-slate-200">OTHERS</td><td className="py-1 px-3 text-right">{submittedReceipt.othersFee}</td></tr>
                    <tr><td className="py-1 px-3 border-r border-slate-200">11</td><td className="py-1 px-3 border-r border-slate-200">DISCOUNT IN FEE</td><td className="py-1 px-3 text-right">{submittedReceipt.discountFee}</td></tr>
                    
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">TOTAL</td>
                      <td className="py-1 px-3 text-right">Rs {submittedReceipt.totalAmount}</td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">DEPOSIT</td>
                      <td className="py-1 px-3 text-right">Rs {submittedReceipt.depositAmount}</td>
                    </tr>
                    <tr className="font-black bg-slate-100">
                      <td colSpan={2} className="py-1 px-3 border-r border-slate-200 text-right uppercase">DUE-ABLE BALANCE</td>
                      <td className="py-1 px-3 text-right">Rs {submittedReceipt.remainingBalance}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wide">
                  Fee Submission Statement Of {submittedReceipt.student_name}
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
                      const totalH = h.particulars_payments ? (Object.values(h.particulars_payments).reduce((a, b) => a + b, 0) - h.particulars_payments.discountFee) : (h.total_amount || h.amount);
                      const depositH = h.paid_amount ?? (h.status === 'paid' ? h.total_amount || h.amount : 0);
                      const dueH = h.remaining_balance ?? (h.status === 'unpaid' ? h.total_amount || h.amount : 0);
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

              <div className="grid grid-cols-2 pt-6 text-[10px] font-bold text-slate-600">
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
            <div className="p-6 space-y-6 bg-white w-full">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">🎓</div>
                <h2 className="text-2xl font-black tracking-wide text-slate-800">eSkooly</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
                <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com | info@eskooly.com</p>
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Fee Submission Slip</h3>
              </div>

              <div className="grid grid-cols-12 gap-4 border-y border-slate-200 py-4 items-center">
                <div className="col-span-3 flex justify-center">
                  <div className="w-16 h-16 rounded-full border border-slate-250 bg-slate-100 flex items-center justify-center text-xl overflow-hidden">👤</div>
                </div>
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Reg. No:</p>
                  <p className="text-slate-800 font-black">{submittedReceipt.student_id_code}</p>
                  <p className="text-slate-400">Student Name:</p>
                  <p className="text-slate-800">{submittedReceipt.student_name}</p>
                  <p className="text-slate-400">Father Name:</p>
                  <p className="text-slate-800">{guardianName}</p>
                  <p className="text-slate-400">Class:</p>
                  <p className="text-slate-800">{submittedReceipt.class_name}</p>
                </div>
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Serial No:</p>
                  <p className="text-slate-800 font-black">{submittedReceipt.invoice_number}</p>
                  <p className="text-slate-400">Submit Date:</p>
                  <p className="text-slate-800">{submittedReceipt.date}</p>
                  <p className="text-slate-400">Fees Month:</p>
                  <p className="text-slate-800">{submittedReceipt.fee_month}</p>
                </div>
                <div className="col-span-3 text-[10px] space-y-1.5 font-bold">
                  <p className="text-slate-400">Total Amount:</p>
                  <p className="text-slate-800 font-black">Rs {submittedReceipt.totalAmount}</p>
                  <p className="text-slate-400">Deposit Amount:</p>
                  <p className="text-slate-800 font-black">Rs {submittedReceipt.depositAmount}</p>
                  <p className="text-slate-400">Remaining Balance:</p>
                  <p className="text-rose-600 font-black">Rs {submittedReceipt.remainingBalance}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 pt-12 text-[10px] font-bold text-slate-600">
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

      <div className="print:hidden">
        {submittedReceipt ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
                <Landmark className="w-4 h-4 text-purple-750" />
                <span className="cursor-pointer hover:underline" onClick={handleDoneReceipt}>Collect Fees</span>
                <span>&gt;</span>
                <span className="text-slate-500 font-bold">Fees Paid Slip</span>
              </div>
              <button onClick={handleDoneReceipt} className="px-5 py-2 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-xl text-xs font-bold transition-all shadow-sm">Collect Another Fee</button>
            </div>

            <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-xs font-black shadow-3xs uppercase tracking-wider ${submittedReceipt.remainingBalance > 0 ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#D97706]' : 'bg-[#D1FAE5] border-[#A7F3D0] text-[#059669]'}`}>
              {submittedReceipt.remainingBalance > 0 ? (
                <><AlertTriangle className="w-5 h-5 shrink-0" /><span>Partially Paid</span></>
              ) : (
                <><Check className="w-5 h-5 shrink-0 bg-emerald-600 text-white rounded-full p-0.5" /><span>Fully Paid</span></>
              )}
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-150 shadow-sm space-y-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                <div className="space-y-1.5 text-left">
                  <h2 className="text-2xl font-black text-[#1C1656] tracking-tight">Fees Paid Receipt</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-455 text-[10px] font-bold">
                    <span className="flex items-center gap-1">👤 Student: <strong className="text-slate-700">{submittedReceipt.student_name}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">🔑 Reg: <strong className="text-slate-700">{submittedReceipt.student_id_code}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">🏫 Class: <strong className="text-slate-700">{submittedReceipt.class_name}</strong></span>
                    <span>|</span>
                    <span className="flex items-center gap-1">📅 Month: <strong className="text-slate-700">{submittedReceipt.fee_month}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTriggerPrint('detailed')} className="px-4 py-2 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"><Printer className="w-3.5 h-3.5" /> Detailed</button>
                  <button onClick={() => handleTriggerPrint('mini')} className="px-4 py-2 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"><Printer className="w-3.5 h-3.5" /> Mini</button>
                  <button onClick={() => handleTriggerPrint('mini')} className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"><Printer className="w-3.5 h-3.5" /> Thermal</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL AMOUNT</span>
                  <span className="block text-xl font-black text-[#1b3bb6]">Rs {submittedReceipt.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">DEPOSIT AMOUNT</span>
                  <span className="block text-xl font-black text-[#10B981]">Rs {submittedReceipt.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-1 shadow-3xs">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">REMAINING BALANCE</span>
                  <span className="block text-xl font-black text-[#EF4444]">Rs {submittedReceipt.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-[10px] text-center text-slate-400 font-bold border-t border-slate-50 pt-6">
                * This is a computer generated receipt. Thank you for your payment.
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl border border-slate-150 shadow-sm space-y-6">
            <div className="flex justify-center border-b border-slate-100 pb-6">
              <div className="flex bg-slate-55 p-1.5 rounded-2xl border border-slate-100 gap-1 text-xs font-bold text-slate-500 shadow-2xs">
                <button onClick={() => { setActiveTab('student'); setSelectedStudent(null); setSearchQuery(''); setUnpaidInvoices([]); setActiveInvoice(null); }} className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'student' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-700'}`}>👤 Student Wise</button>
                <button onClick={() => { setActiveTab('family'); setSelectedFamily(''); }} className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'family' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-700'}`}>👪 Family Wise</button>
                <button onClick={() => setActiveTab('scan')} className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'scan' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-700'}`}>🔍 Scan Paid Invoice</button>
              </div>
            </div>

            {activeTab === 'student' && (
              <div className="space-y-6">
                <div className="relative max-w-xl mx-auto">
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">Search Student *</label>
                  <div className="relative flex items-center">
                    <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400" />
                    <input type="text" placeholder="Type student name or registration number" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs" />
                  </div>
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-50">
                      {suggestions.map(s => (
                        <div key={s.id} onClick={() => handleSelectStudent(s)} className="p-3 hover:bg-purple-50/50 cursor-pointer text-xs font-semibold text-slate-700 flex justify-between items-center">
                          <span>{s.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full">Reg: {s.student_id || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedStudent && activeInvoice ? (
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    {unpaidInvoices.length > 1 && (
                      <div className="max-w-xl mx-auto bg-purple-50/40 p-4 rounded-2xl border border-purple-100/50 space-y-2">
                        <label className="block text-[10px] font-black text-purple-700 uppercase tracking-wider">Multiple Invoices Found: Select month to collect</label>
                        <select value={activeInvoice.id} onChange={(e) => { const found = unpaidInvoices.find(inv => inv.id === e.target.value); if (found) handleOpenCollectionForm(found); }} className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all">
                          {unpaidInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.fee_month} ({inv.invoice_number}) - Rs {inv.remaining_balance ?? inv.total_amount ?? inv.amount}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="text-center space-y-1">
                      <h3 className="text-lg font-black text-[#5C53CD]">Fees Collection</h3>
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">* are required fields.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DetailBox label="REGISTRATION" value={activeInvoice.student_id_code} />
                      <DetailBox label="STUDENT NAME" value={activeInvoice.student_name} />
                      <DetailBox label="GUARDIAN NAME" value={guardianName} />
                      <DetailBox label="CLASS" value={activeInvoice.class_name} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEE MONTH *</label>
                        <input type="text" value={activeInvoice.fee_month} disabled className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-555 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">DATE *</label>
                        <input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} required className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs" />
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-[#EEEDFC] border-b border-slate-200/50 text-[10px] font-black text-[#5C53CD] uppercase tracking-wider">
                            <th className="py-3 px-4 w-16">SR.</th>
                            <th className="py-3 px-4">PARTICULARS</th>
                            <th className="py-3 px-4 text-right pr-6">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          <ParticularInputRow sr={1} name="MONTHLY FEE" value={monthlyFee} onChange={setMonthlyFee} />
                          <ParticularInputRow sr={2} name="PREVIOUS BALANCE" value={prevBalance} onChange={setPrevBalance} />
                          <ParticularInputRow sr={3} name="ADMISSION FEE" value={admissionFee} onChange={setAdmissionFee} />
                          <ParticularInputRow sr={4} name="REGISTRATION FEE" value={regFee} onChange={setRegFee} />
                          <ParticularInputRow sr={5} name="ART MATERIAL" value={artFee} onChange={setArtFee} />
                          <ParticularInputRow sr={6} name="TRANSPORT" value={transportFee} onChange={setTransportFee} />
                          <ParticularInputRow sr={7} name="BOOKS" value={booksFee} onChange={setBooksFee} />
                          <ParticularInputRow sr={8} name="UNIFORM" value={uniformFee} onChange={setUniformFee} />
                          <ParticularInputRow sr={9} name="FINE" value={fineFee} onChange={setFineFee} />
                          <ParticularInputRow sr={10} name="OTHERS" value={othersFee} onChange={setOthersFee} />
                          <ParticularInputRow sr={11} name="DISCOUNT IN FEE" value={discountFee} onChange={setDiscountFee} />
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-center">
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-1">
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL</span>
                        <span className="block text-xl font-black text-slate-800">Rs {totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="bg-purple-50/50 border border-purple-150 p-4 rounded-2xl space-y-1 focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                        <span className="block text-[9px] font-black text-[#5C53CD] uppercase tracking-widest">DEPOSIT *</span>
                        <input type="number" value={deposit || ''} onChange={(e) => setDeposit(Number(e.target.value))} className="w-full text-center bg-transparent border-none p-0 text-xl font-black text-[#5C53CD] focus:outline-none focus:ring-0 placeholder-purple-300" placeholder="Enter deposit..." />
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-1">
                        <span className="block text-[9px] font-black text-red-400 uppercase tracking-widest">DUE BALANCE</span>
                        <span className="block text-xl font-black text-rose-600">Rs {dueBalance.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-center pt-4">
                      <button onClick={handleSubmitCollection} disabled={loading} className="px-12 py-3 bg-[#5C53CD] hover:bg-[#4d45bd] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5">
                        {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : '✔ submit fees'}
                      </button>
                    </div>
                  </div>
                ) : selectedStudent ? (
                  <p className="text-xs text-slate-455 font-bold text-center py-10">No unpaid generated invoices pending for this student.</p>
                ) : null}
              </div>
            )}

            {activeTab === 'family' && (
              <form onSubmit={handleFamilySubmit} className="space-y-6 max-w-xl mx-auto">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEE MONTH *</label>
                  <input type="text" value={feeMonth} onChange={(e) => setFeeMonth(e.target.value)} required placeholder="June 2026" className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT FAMILY *</label>
                  <select value={selectedFamily} onChange={(e) => setSelectedFamily(e.target.value)} required className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs">
                    <option value="">Select Family</option>
                    {uniqueFamilies.map(fam => <option key={fam} value={fam}>{fam}</option>)}
                  </select>
                </div>
                <div className="flex justify-center pt-2">
                  <button type="submit" disabled={loading} className="px-10 py-3.5 bg-purple-650 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider">Submit Payment</button>
                </div>
              </form>
            )}

            {activeTab === 'scan' && (
              <div className="bg-amber-50/50 p-8 rounded-2xl border border-amber-100 text-center flex flex-col items-center justify-center space-y-3 max-w-xl mx-auto">
                <ShieldAlert className="w-10 h-10 text-amber-500 mb-1" />
                <h4 className="font-extrabold text-amber-700 text-sm">Scanner Locked</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">Invoice scanning is available in the paid <span className="text-purple-700 font-bold">Desktop version</span> only.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex flex-col justify-center min-h-[56px]">
      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-xs font-black text-slate-800 truncate">{value}</span>
    </div>
  );
}

function ParticularInputRow({ sr, name, value, onChange }: { sr: number; name: string; value: number; onChange: (val: number) => void }) {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="py-2.5 px-4 font-bold text-slate-400">{sr}</td>
      <td className="py-2.5 px-4 font-black uppercase text-slate-700 tracking-wide text-[10px]">{name}</td>
      <td className="py-1.5 px-4 text-right pr-6">
        <input type="number" value={value || 0} onChange={(e) => onChange(Number(e.target.value))} className="w-28 h-8 px-2.5 text-right border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white" />
      </td>
    </tr>
  );
}