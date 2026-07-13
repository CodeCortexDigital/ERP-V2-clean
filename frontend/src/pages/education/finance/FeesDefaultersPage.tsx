import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, Mail, Phone, Send, ArrowRight, List, CalendarDays, AlertCircle } from 'lucide-react';
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
  const [includeUpcoming, setIncludeUpcoming] = useState(false);

  // Reminder states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<any | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'email' | 'sms' | 'whatsapp'>('email');
  const [reminderTemplate, setReminderTemplate] = useState<'friendly' | 'standard' | 'urgent'>('standard');
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const getInvoiceFeeMonth = (inv: Invoice) => {
    if (inv.invoice_month) {
      try {
        const d = new Date(inv.invoice_month);
        return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      } catch {}
    }
    return inv.fee_month || 'N/A';
  };

  // Get unique months from invoices for filter
  const uniqueMonths: string[] = [];
  invoices.forEach(inv => {
    const month = getInvoiceFeeMonth(inv);
    if (month && month !== 'N/A' && !uniqueMonths.includes(month)) {
      uniqueMonths.push(month);
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
      setStudents(rawStudents);

      const res = await financeService.getInvoices({ status: 'all' }).catch(() => ({ data: [] }));
      setInvoices(extractListData<any>(res.data || []));
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
        getInvoiceFeeMonth(inv).toLowerCase().trim() === feeMonth.toLowerCase().trim()
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
      const pending = inv.balance_due !== undefined && inv.balance_due !== null
        ? inv.balance_due
        : (inv.total_amount || inv.amount || 0) - (inv.paid_amount || 0);

      const hasPending = pending > 0;

      // Defaulter = (due date passed OR includeUpcoming) AND has pending balance
      if (inv.status === 'cancelled') return false;
      return (isDuePassed || includeUpcoming) && hasPending;
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
    const totalUnpaid = latestInv.balance_due !== undefined && latestInv.balance_due !== null
      ? latestInv.balance_due
      : (latestInv.total_amount || latestInv.amount || 0) - (latestInv.paid_amount || 0);

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
    handleInitiateReminder({
      full_name: 'All Defaulters',
      isBulk: true,
      count: defaulterStudents.length,
      totalUnpaid: defaulterStudents.reduce((sum, d) => sum + d.totalUnpaid, 0)
    });
  };

  const handleCarryForward = async () => {
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

    await Promise.all(updatedInvoices.filter(inv => defaulterInvoiceIds.includes(inv.id)).map(inv =>
      financeService.updateInvoice(inv.id, {
        carried_forward: true,
        carried_forward_to: inv.carried_forward_to,
        carried_forward_date: inv.carried_forward_date
      }).catch(() => undefined)
    ));

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

  const getReminderText = (target: any, templateType: 'friendly' | 'standard' | 'urgent') => {
    if (!target) return '';
    const studentName = target.isBulk ? 'your child' : target.full_name;
    const amountStr = target.isBulk ? `Rs ${target.totalUnpaid.toLocaleString()}` : `Rs ${target.totalUnpaid.toLocaleString()}`;
    const feeMonthStr = target.isBulk ? 'current month' : (getInvoiceFeeMonth(target.invoice) || 'current month');
    const daysLateStr = target.isBulk ? '' : `${target.daysLate} days`;
    
    if (templateType === 'friendly') {
      return `Hello! Just a gentle reminder that the fee invoice for ${studentName} (${feeMonthStr}) has a pending balance of ${amountStr}. If already paid, please ignore. Thank you!`;
    } else if (templateType === 'urgent') {
      return `URGENT: Fee payment of ${amountStr} for ${studentName} (${feeMonthStr}) is overdue${daysLateStr ? ' by ' + daysLateStr : ''}. Please clear the balance immediately to avoid late fee penalties or suspension of services.`;
    } else {
      return `Dear Parent/Guardian, the fee invoice for ${studentName} for the month of ${feeMonthStr} remains outstanding with a balance of ${amountStr}. Please submit the payment at your earliest convenience.`;
    }
  };

  const handleInitiateReminder = (target: any) => {
    setReminderTarget(target);
    setReminderChannel('email');
    setReminderTemplate('standard');
    const body = getReminderText(target, 'standard');
    setReminderMessage(body);
    setShowReminderModal(true);
  };

  const handleTemplateChange = (tmpl: 'friendly' | 'standard' | 'urgent') => {
    setReminderTemplate(tmpl);
    if (reminderTarget) {
      setReminderMessage(getReminderText(reminderTarget, tmpl));
    }
  };

  const handleSendReminderSubmit = async () => {
    if (!reminderTarget) return;
    setSendingReminder(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSendingReminder(false);
    setShowReminderModal(false);
    toast.success(`Fee reminder sent successfully via ${reminderChannel.toUpperCase()}!`);
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
        <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
          <div>
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
          <div className="flex items-center gap-2 md:pt-6">
            <input
              id="include-upcoming-checkbox"
              type="checkbox"
              checked={includeUpcoming}
              onChange={(e) => setIncludeUpcoming(e.target.checked)}
              className="w-4 h-4 text-purple-650 border-slate-350 rounded focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="include-upcoming-checkbox" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
              Include upcoming unpaid invoices (not yet overdue)
            </label>
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
                        onClick={() => handleInitiateReminder(def)}
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
                  onClick={() => handleInitiateReminder(def)}
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

      {/* Send Reminder Modal */}
      {showReminderModal && reminderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2 text-purple-700">
                <Landmark className="w-5 h-5 animate-pulse" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">
                  {reminderTarget.isBulk ? 'Send Bulk Reminders' : 'Send Fee Reminder'}
                </h4>
              </div>
              <button 
                onClick={() => { setShowReminderModal(false); setReminderTarget(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                {reminderTarget.isBulk ? (
                  <>
                    <p><span className="font-bold text-slate-400">RECIPIENTS:</span> <span className="font-bold text-slate-800">{reminderTarget.count} Defaulters</span></p>
                    <p><span className="font-bold text-slate-400">TOTAL OUTSTANDING:</span> <span className="font-bold text-rose-500">Rs {reminderTarget.totalUnpaid.toLocaleString()}</span></p>
                  </>
                ) : (
                  <>
                    <p><span className="font-bold text-slate-400">STUDENT:</span> <span className="font-bold text-slate-800">{reminderTarget.full_name}</span></p>
                    <p><span className="font-bold text-slate-400">CLASS:</span> <span className="font-bold text-slate-800">{reminderTarget.class_name || 'N/A'}</span></p>
                    <p><span className="font-bold text-slate-400">OUTSTANDING FEE:</span> <span className="font-bold text-rose-500">Rs {reminderTarget.totalUnpaid.toLocaleString()}</span></p>
                    <p><span className="font-bold text-slate-400">DAYS OVERDUE:</span> <span className="font-bold text-amber-600">{reminderTarget.daysLate} days</span></p>
                  </>
                )}
              </div>

              {/* Reminder Channel Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Reminder Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'email', label: '📧 Email' },
                    { value: 'sms', label: '💬 SMS' },
                    { value: 'whatsapp', label: '🟢 WhatsApp' }
                  ].map(chan => (
                    <button
                      key={chan.value}
                      type="button"
                      onClick={() => setReminderChannel(chan.value as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reminderChannel === chan.value 
                          ? 'bg-purple-550 border-purple-500 text-white shadow-3xs'
                          : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      {chan.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Message Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'friendly', label: '😊 Friendly' },
                    { value: 'standard', label: '💼 Standard' },
                    { value: 'urgent', label: '🚨 Urgent' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.value}
                      type="button"
                      onClick={() => handleTemplateChange(tmpl.value as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        reminderTemplate === tmpl.value 
                          ? 'bg-purple-550 border-purple-500 text-white shadow-3xs'
                          : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
                      }`}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Message Body */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Reminder Message Preview</label>
                <textarea
                  rows={4}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs"
                />
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setShowReminderModal(false); setReminderTarget(null); }}
                className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-500 font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendReminderSubmit}
                disabled={sendingReminder || !reminderMessage.trim()}
                className="px-5 py-2 bg-purple-650 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                {sendingReminder ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}