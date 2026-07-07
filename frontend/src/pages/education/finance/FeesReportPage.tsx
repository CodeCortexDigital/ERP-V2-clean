import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, Search, Printer, Calendar, TrendingUp, AlertCircle, CheckCircle, Wallet, Users, CalendarDays } from 'lucide-react';
import studentService from '@/services/student.service';
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
}

export default function FeesReportPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // FIXED: Auto-detect current month
  const [feeMonth, setFeeMonth] = useState(() => {
    return new Date().toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  });
  const [filterClass, setFilterClass] = useState('All Classes');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(sRes.data || []);
      const deletedStudentIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const allStudents = [...rawStudents, ...customStudents].filter(s => !deletedStudentIds.includes(s.id));
      setStudents(allStudents);

      // Fetch invoices from localStorage
      const savedInvoices = localStorage.getItem('custom_invoices');
      if (savedInvoices) {
        const parsed = JSON.parse(savedInvoices);
        setInvoices(parsed);
      } else {
        setInvoices([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices based on inputs
  const filteredInvoices = invoices.filter(inv => {
    // Month filter
    const isMonthMatch = inv.fee_month.toLowerCase().trim() === feeMonth.toLowerCase().trim();
    if (!isMonthMatch) return false;

    // Class filter
    const isClassMatch = filterClass === 'All Classes' || 
      inv.class_name.toLowerCase().trim() === filterClass.toLowerCase().trim();
    if (!isClassMatch) return false;

    // Status filter
    if (filterStatus === 'Paid') {
      return inv.status === 'paid' && (inv.remaining_balance === undefined || inv.remaining_balance <= 0);
    }
    if (filterStatus === 'Unpaid') {
      return inv.status === 'unpaid';
    }
    if (filterStatus === 'Partial') {
      return inv.status === 'paid' && inv.remaining_balance !== undefined && inv.remaining_balance > 0;
    }
    return true;
  });

  // Calculate fee statistics
  let totalGenerated = 0;
  let totalCollected = 0;
  let totalPending = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;

  filteredInvoices.forEach(inv => {
    // Use total_amount if available, otherwise use amount
    const invoiceTotal = inv.total_amount || inv.amount;
    totalGenerated += invoiceTotal;
    
    if (inv.status === 'unpaid') {
      totalPending += invoiceTotal;
      unpaidCount++;
    } else {
      const paid = inv.paid_amount ?? invoiceTotal;
      const pending = inv.remaining_balance ?? 0;
      totalCollected += paid;
      totalPending += pending;
      if (pending > 0) {
        partialCount++;
      } else {
        paidCount++;
      }
    }
  });

  // Extract unique classes from invoices
  const uniqueClasses: string[] = [];
  invoices.forEach(inv => {
    if (inv.class_name && !uniqueClasses.includes(inv.class_name)) {
      uniqueClasses.push(inv.class_name);
    }
  });

  // Helper for month picker
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

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0 print:m-0">
      
      {/* Print CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body * { visibility: hidden; }
          .print-section, .print-section * { visibility: visible; }
          .print-section { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Top Breadcrumb Bar - Hidden on Print */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden no-print">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Fees</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Fees Report</span>
        </div>
      </div>

      {/* PRINT SECTION */}
      <div className="print-section">
        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-black text-slate-800">Fee Collection Report</h1>
          <p className="text-sm text-slate-500">{feeMonth}</p>
          <p className="text-xs text-slate-400">Generated on: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Control Filter Panel Card - Hidden on Print */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 no-print">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEES MONTH</label>
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
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">CLASS</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              >
                <option value="All Classes">All Classes</option>
                {uniqueClasses.sort().map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">PAYMENT STATUS</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              >
                <option value="All">All Invoices</option>
                <option value="Paid">Fully Paid</option>
                <option value="Partial">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <button
                onClick={handlePrintReport}
                className="w-full h-11 bg-purple-600 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:gap-4">
          
          {/* Total Fees Collected */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between h-32 print:shadow-none print:border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">FEES COLLECTED</span>
            <span className="text-2xl font-black text-[#10B981] block">Rs {totalCollected.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-bold block">{paidCount} Fully Paid</span>
          </div>

          {/* Pending Fees */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between h-32 print:shadow-none print:border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PENDING FEES</span>
            <span className="text-2xl font-black text-[#EF4444] block">Rs {totalPending.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-bold block">{partialCount + unpaidCount} Students Pending</span>
          </div>

          {/* Total Generated */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between h-32 print:shadow-none print:border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL GENERATED</span>
            <span className="text-2xl font-black text-[#1b3bb6] block">Rs {totalGenerated.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-bold block">Total Invoice Amount</span>
          </div>

          {/* Total Invoices */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs flex flex-col justify-between h-32 print:shadow-none print:border-slate-200">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL INVOICES</span>
            <span className="text-2xl font-black text-[#8B5CF6] block">{filteredInvoices.length}</span>
            <span className="text-[10px] text-slate-400 font-bold block">
              {paidCount} Paid | {partialCount} Partial | {unpaidCount} Unpaid
            </span>
          </div>

        </div>

        {/* Fees Table Sheet */}
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4 print:shadow-none print:border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-sm text-[#1C1656] uppercase tracking-wider">Fee Collection Statement</h3>
            <span className="text-[10px] text-slate-450 font-bold">{filteredInvoices.length} invoices</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 print:border-slate-200">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider select-none">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Class</th>
                  <th className="py-3 px-3 text-right">Invoice</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Pending</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {filteredInvoices.map((inv, index) => {
                  const invoiceTotal = inv.total_amount || inv.amount;
                  const isPaid = inv.status === 'paid' && (inv.remaining_balance === undefined || inv.remaining_balance <= 0);
                  const isPartial = inv.status === 'paid' && inv.remaining_balance !== undefined && inv.remaining_balance > 0;
                  const paidAmount = inv.paid_amount ?? (inv.status === 'paid' ? invoiceTotal : 0);
                  const pendingAmount = inv.remaining_balance ?? (inv.status === 'unpaid' ? invoiceTotal : 0);
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 font-bold">{index + 1}</td>
                      <td className="py-2.5 px-3 font-black text-slate-800">{inv.student_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{inv.class_name}</td>
                      <td className="py-2.5 px-3 text-right">Rs {invoiceTotal.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-[#10B981] font-bold">
                        Rs {paidAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#EF4444] font-bold">
                        Rs {pendingAmount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          isPaid ? 'bg-emerald-50 text-emerald-700' :
                          isPartial ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                      {loading ? 'Loading...' : 'No matching fee invoices found for the selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredInvoices.length > 0 && (
                <tfoot className="bg-slate-50/75 border-t border-slate-150 font-bold text-slate-700">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-right uppercase text-slate-400">TOTALS</td>
                    <td className="py-3 px-3 text-right">Rs {totalGenerated.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-[#10B981]">Rs {totalCollected.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-[#EF4444]">Rs {totalPending.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {paidCount + partialCount + unpaidCount} invoices
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Print footer */}
          <div className="hidden print:block text-center text-[8px] text-slate-400 pt-4 border-t border-slate-200">
            * This is a computer generated report. Generated on: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}