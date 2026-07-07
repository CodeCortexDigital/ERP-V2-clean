import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, Mail, Phone, Send, ArrowRight, List, CalendarDays, AlertCircle } from 'lucide-react';
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
  carried_forward?: boolean;
  carried_forward_to?: string;
  carried_forward_date?: string;
}

export default function FeesDefaultersPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // FIXED: Start with empty string = show ALL months
  const [feeMonth, setFeeMonth] = useState('');
  
  const [showDetails, setShowDetails] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Get unique months from invoices for filter
  const uniqueMonths: string[] = [];
  invoices.forEach(inv => {
    if (inv.fee_month && !uniqueMonths.includes(inv.fee_month)) {
      uniqueMonths.push(inv.fee_month);
    }
  });
  uniqueMonths.sort((a, b) => {
    try {
      const dateA = new Date(`${a} 1`);
      const dateB = new Date(`${b} 1`);
      return dateB.getTime() - dateA.getTime(); // Latest first
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(sRes.data || []);
      const deletedStudentIds: string[] = JSON.parse(localStorage.getItem('deleted_student_ids') || '[]');
      const customStudents = JSON.parse(localStorage.getItem('custom_students') || '[]');
      const allStudents = [...rawStudents, ...customStudents].filter(s => !deletedStudentIds.includes(s.id));
      setStudents(allStudents);

      const savedInvoices = localStorage.getItem('custom_invoices');
      if (savedInvoices) {
        setInvoices(JSON.parse(savedInvoices));
      } else {
        setInvoices([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Real ERP Defaulter Logic
  // A student is a defaulter if:
  // 1. Due date has passed (today > due_date)
  // 2. AND there is a pending balance (unpaid OR remaining_balance > 0)
  const getDefaulters = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day for accurate comparison

    // First, filter invoices by month (if selected)
    let monthFiltered = invoices;
    if (feeMonth) {
      monthFiltered = invoices.filter(inv => 
        inv.fee_month.toLowerCase().trim() === feeMonth.toLowerCase().trim()
      );
    }

    // Then apply defaulter logic
    const defaulters = monthFiltered.filter(inv => {
      // Skip if already carried forward
      if (inv.carried_forward) return false;

      // Parse due date
      let dueDate: Date;
      try {
        dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);
      } catch {
        return false; // Invalid due date, skip
      }

      // Check if due date has passed
      const isDuePassed = dueDate < today;

      // Check if there is pending balance
      const pending = inv.remaining_balance !== undefined && inv.remaining_balance !== null
        ? inv.remaining_balance
        : inv.status === 'unpaid'
          ? (inv.total_amount || inv.amount)
          : 0;

      const hasPending = pending > 0;

      // Defaulter = due date passed AND has pending balance
      return isDuePassed && hasPending;
    });

    return defaulters;
  };

  const unpaidInvoicesForMonth = getDefaulters();

  // Group by student to get unique defaulters
  const defaulterStudents: any[] = [];
  const studentMap = new Map<string, Invoice[]>();

  unpaidInvoicesForMonth.forEach(inv => {
    const list = studentMap.get(inv.student) || [];
    list.push(inv);
    studentMap.set(inv.student, list);
  });

  studentMap.forEach((invs, studentId) => {
    const studentInfo = students.find(s => s.id === studentId) || {
      id: studentId,
      full_name: invs[0].student_name,
      student_id: invs[0].student_id_code,
      class_name: invs[0].class_name,
      phone_number: 'N/A',
      guardian_phone: 'N/A',
      guardian_name: 'N/A',
      profile_pic: ''
    };

    // Sort by latest created_at
    invs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const latestInv = invs[0];
    const totalUnpaid = latestInv.remaining_balance !== undefined && latestInv.remaining_balance !== null
      ? latestInv.remaining_balance
      : latestInv.total_amount || latestInv.amount;

    // Calculate days late
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(latestInv.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysLate = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    defaulterStudents.push({
      ...studentInfo,
      totalUnpaid,
      daysLate,
      dueDate: latestInv.due_date,
      invoices: invs,
      invoice: latestInv
    });
  });

  // Sort defaulters by days late (most late first) then by amount
  defaulterStudents.sort((a, b) => {
    if (b.daysLate !== a.daysLate) return b.daysLate - a.daysLate;
    return b.totalUnpaid - a.totalUnpaid;
  });

  const handleSendReminderBulk = () => {
    if (defaulterStudents.length === 0) {
      toast.info('No defaulters found');
      return;
    }
    toast.success(`Fee reminder notifications successfully sent to all ${defaulterStudents.length} defaulters!`);
  };

  const handleCarryForward = () => {
    if (defaulterStudents.length === 0) {
      toast.info('No defaulter balances to carry forward');
      return;
    }

    const defaulterInvoiceIds = defaulterStudents.map(d => d.invoice.id);
    
    const updatedInvoices = invoices.map(inv => {
      if (defaulterInvoiceIds.includes(inv.id)) {
        return {
          ...inv,
          carried_forward: true,
          carried_forward_to: getNextMonth(),
          carried_forward_date: new Date().toISOString().split('T')[0]
        };
      }
      return inv;
    });

    localStorage.setItem('custom_invoices', JSON.stringify(updatedInvoices));
    setInvoices(updatedInvoices);
    
    toast.success(`Carried forward pending balances for ${defaulterStudents.length} students successfully!`);
  };

  const getNextMonth = () => {
    try {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'next month';
    }
  };

  const handleSendSingleReminder = (name: string) => {
    toast.success(`Fee reminder notification sent successfully to ${name}!`);
  };

  const handleCallParent = (name: string, contact: string) => {
    toast.info(`Dialing parent of ${name} (${contact || 'No contact saved'})...`);
  };

  const filteredTableDefaulters = defaulterStudents.filter(def => {
    const s = tableSearch.toLowerCase();
    return (
      def.full_name.toLowerCase().includes(s) ||
      (def.student_id && def.student_id.toLowerCase().includes(s)) ||
      (def.class_name && def.class_name.toLowerCase().includes(s)) ||
      (def.guardian_name && def.guardian_name.toLowerCase().includes(s))
    );
  });

  const getDaysLateColor = (days: number) => {
    if (days <= 7) return 'text-amber-500';
    if (days <= 15) return 'text-orange-500';
    if (days <= 30) return 'text-red-500';
    return 'text-rose-700';
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Fees</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">
            {showDetails ? 'Fees Defaulters List' : 'Fees Defaulters'}
          </span>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEES MONTH</label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={feeMonth}
              onChange={(e) => setFeeMonth(e.target.value)}
              className="w-56 h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            >
              <option value="">All Months</option>
              {uniqueMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all border border-purple-100"
          >
            <List className="w-4 h-4" /> {showDetails ? 'Grid View' : 'See Details'}
          </button>
          <button
            onClick={handleSendReminderBulk}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition-all border border-amber-100"
          >
            <Send className="w-4 h-4" /> Send Reminder
          </button>
          <button
            onClick={handleCarryForward}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
          >
            <ArrowRight className="w-4 h-4" /> Carry Forward Balance
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm text-center space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL DEFAULTERS</p>
          <p className="text-3xl font-black text-rose-500">{defaulterStudents.length}</p>
          <p className="text-[9px] text-slate-400 font-bold">
            {feeMonth ? `for ${feeMonth}` : 'All Months'}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm text-center space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL PENDING</p>
          <p className="text-3xl font-black text-purple-600">
            Rs {defaulterStudents.reduce((sum, d) => sum + d.totalUnpaid, 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-slate-400 font-bold">Across all defaulters</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm text-center space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AVG DAYS LATE</p>
          <p className="text-3xl font-black text-amber-500">
            {defaulterStudents.length > 0 
              ? Math.round(defaulterStudents.reduce((sum, d) => sum + d.daysLate, 0) / defaulterStudents.length)
              : 0} days
          </p>
          <p className="text-[9px] text-slate-400 font-bold">Average delay</p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[320px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          <p className="text-sm text-slate-500 font-semibold">Loading defaulters...</p>
        </div>
      ) : defaulterStudents.length === 0 ? (
        /* Empty State - No Fee Defaulters */
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[320px]">
          <div className="w-16 h-16 rounded-full bg-[#E6F4EA] flex items-center justify-center text-[#137333] text-4xl shadow-inner">
            😊
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[#1C1656]">No Fee Defaulters</h3>
            <p className="text-xs text-slate-400 font-semibold">
              No fee defaulters found {feeMonth ? `for ${feeMonth}` : 'for any month'}.
            </p>
            <p className="text-[10px] text-slate-400">
              All students have paid their fees on time.
            </p>
          </div>
        </div>
      ) : showDetails ? (
        /* Detailed Table list view */
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-6 space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap gap-1">
              {['Copy', 'CSV', 'Excel', 'PDF', 'Print'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => toast.success(`${btn} action triggered`)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-purple-50 hover:text-purple-700 text-[11px] font-bold shadow-3xs transition-all"
                >
                  {btn}
                </button>
              ))}
              <button
                onClick={() => toast.info('Column visibility toggle')}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-purple-50 hover:text-purple-700 text-[11px] font-bold shadow-3xs transition-all flex items-center gap-1"
              >
                Column visibility ▾
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 w-full sm:w-auto">
              <span>Search:</span>
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search defaulter..."
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 w-44 shadow-4xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider select-none">
                  <th className="py-3.5 px-5">ID</th>
                  <th className="py-3.5 px-5">Name</th>
                  <th className="py-3.5 px-5">Class</th>
                  <th className="py-3.5 px-5">Due Date</th>
                  <th className="py-3.5 px-5 text-right">Pending</th>
                  <th className="py-3.5 px-5 text-center">Days Late</th>
                  <th className="py-3.5 px-5">Phone</th>
                  <th className="py-3.5 px-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {filteredTableDefaulters.map(def => (
                  <tr key={def.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-3 px-5 text-slate-500 font-bold">{def.student_id || '001'}</td>
                    <td className="py-3 px-5 font-black text-slate-800">{def.full_name}</td>
                    <td className="py-3 px-5 text-slate-600">{def.class_name || 'N/A'}</td>
                    <td className="py-3 px-5 text-slate-555">
                      {def.dueDate ? new Date(def.dueDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                      }) : 'N/A'}
                    </td>
                    <td className="py-3 px-5 text-rose-500 font-black text-right">Rs {def.totalUnpaid.toLocaleString()}</td>
                    <td className="py-3 px-5 text-center">
                      <span className={`font-extrabold ${getDaysLateColor(def.daysLate)}`}>
                        {def.daysLate} days
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-555">{def.guardian_phone || def.phone_number || 'N/A'}</td>
                    <td className="py-3 px-5">
                      <button
                        onClick={() => handleSendSingleReminder(def.full_name)}
                        className="w-7 h-7 rounded-lg bg-[#5C53CD] hover:bg-[#4d45bd] text-white flex items-center justify-center shadow-xs transition-colors"
                        title="Send Reminder"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold pt-2 select-none">
            <span>
              Showing {filteredTableDefaulters.length > 0 ? 1 : 0} to {filteredTableDefaulters.length} of {filteredTableDefaulters.length} entries
            </span>
            <span className="text-[10px] text-purple-600 font-black">
              Total Pending: Rs {filteredTableDefaulters.reduce((sum, d) => sum + d.totalUnpaid, 0).toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        /* Defaulter Profile Cards Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredTableDefaulters.map(def => (
            <div key={def.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-between text-center gap-4 hover:shadow-sm transition-shadow relative">
              
              {/* Days Late Badge */}
              <div className={`absolute top-2 right-2 text-[8px] font-black px-2 py-0.5 rounded-full ${getDaysLateColor(def.daysLate)} bg-slate-50 border border-slate-100`}>
                {def.daysLate}d late
              </div>

              <div className="space-y-2 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-2 border-purple-100 overflow-hidden bg-purple-50 flex items-center justify-center font-black text-[#5C53CD] text-xl shadow-inner">
                  {def.profile_pic ? (
                    <img src={def.profile_pic} alt={def.full_name} className="w-full h-full object-cover" />
                  ) : (
                    def.full_name.charAt(0)
                  )}
                </div>

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-800 text-xs">{def.full_name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{def.student_id || '001'}</p>
                  <p className="text-[9px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded-full mt-1 border border-slate-100">
                    {def.class_name || 'N/A'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold">
                    Due: {def.dueDate ? new Date(def.dueDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: '2-digit' 
                    }) : 'N/A'}
                  </p>
                  <p className="text-[10px] text-rose-500 font-black pt-1">
                    Rs {def.totalUnpaid.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => handleSendSingleReminder(def.full_name)}
                  className="w-7 h-7 rounded-lg bg-[#5C53CD] hover:bg-[#4d45bd] text-white flex items-center justify-center shadow-xs transition-colors"
                  title="Send Reminder"
                >
                  <Mail className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    handleCallParent(def.full_name, def.guardian_phone || def.phone_number);
                  }}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-655 flex items-center justify-center transition-colors border border-slate-200/50"
                  title="Call Parent"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}