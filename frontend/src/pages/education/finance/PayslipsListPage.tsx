import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, Search, Filter, RotateCcw, CheckCircle2, Clock, 
  AlertTriangle, Eye, X, Plus, DollarSign, Wallet, Sheet, User, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import ledgerService, { Payslip } from '@/services/ledger.service';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import { getCurrencySymbol } from '@/utils/currency';

const sym = getCurrencySymbol();
const formatCurrency = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  return `${sym} ${num.toLocaleString('en-PK')}`;
};

const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function PayslipsListPage() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Disburse Salary Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payingSlip, setPayingSlip] = useState<any | null>(null);
  const [payDeposit, setPayDeposit] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Filters State
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, partial, pending, unpaid

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slipsRes, teachersRes] = await Promise.allSettled([
        ledgerService.getPayslips(),
        teacherService.getAll({ include_inactive: true }).catch(() => ({ data: [] }))
      ]);

      let loadedSlips: any[] = [];
      if (slipsRes.status === 'fulfilled' && slipsRes.value && slipsRes.value.data) {
        loadedSlips = Array.isArray(slipsRes.value.data) ? slipsRes.value.data : [];
      }

      let loadedTeachers: any[] = [];
      if (teachersRes.status === 'fulfilled' && teachersRes.value && teachersRes.value.data) {
        loadedTeachers = extractListData<any>(teachersRes.value.data);
        setTeachers(loadedTeachers);
      }

      // Merge local storage generated payslips if any
      try {
        const localSlips = JSON.parse(localStorage.getItem('erp_generated_payslips') || '[]');
        const customSlips = JSON.parse(localStorage.getItem('custom_salaries') || '[]');
        const combinedLocal = [
          ...(Array.isArray(localSlips) ? localSlips : []),
          ...(Array.isArray(customSlips) ? customSlips : [])
        ];
        combinedLocal.forEach((lSlip: any) => {
          const exists = loadedSlips.some(s => String(s.id) === String(lSlip.id) || String(s.slip_number) === String(lSlip.slip_number) || (String(s.employee) === String(lSlip.employee_id || lSlip.employee) && String(s.month) === String(lSlip.month)));
          if (!exists) {
            loadedSlips.unshift(lSlip);
          }
        });
      } catch (e) {}

      // Normalize payslip object fields
      const normalized = loadedSlips.map((slip: any) => {
        const netAmt = Number(slip.net_salary ?? (Number(slip.base_salary || slip.basic_salary || 0) + Number(slip.bonuses || slip.allowances || 0) - Number(slip.deductions || 0)));
        const paidAmt = Number(slip.paid_amount ?? (slip.status === 'paid' ? netAmt : 0));
        const pendingBal = Math.max(0, netAmt - paidAmt);
        
        let st = String(slip.status || 'pending').toLowerCase();
        if (netAmt > 0 && paidAmt >= netAmt) {
          st = 'paid';
        } else if (paidAmt > 0 && pendingBal > 0) {
          st = 'partial';
        } else if (st === 'issued' || st === 'draft') {
          st = 'pending';
        }

        // Find teacher info for role/avatar
        const empId = String(slip.employee || slip.employee_id || '');
        const teacherObj = loadedTeachers.find(t => String(t.id) === empId || String(t.employee_id) === empId || String(t.full_name).toLowerCase() === String(slip.employee_name).toLowerCase());
        const empRole = teacherObj?.role || teacherObj?.specializations?.[0] || 'Staff';

        return {
          ...slip,
          employee_name: slip.employee_name || teacherObj?.full_name || 'Employee',
          employee_id_code: teacherObj?.employee_id || teacherObj?.id || 'EMP-001',
          employee_role: empRole,
          net_salary: netAmt,
          paid_amount: paidAmt,
          pending_balance: pendingBal,
          status: st
        };
      });

      setPayslips(normalized);
    } catch (err) {
      console.error('Error loading payslips:', err);
      toast.error('Failed to load salary payslips');
    } finally {
      setLoading(false);
    }
  };

  // Get distinct roles and months for filter dropdowns
  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    payslips.forEach(p => {
      if (p.employee_role) roles.add(p.employee_role);
    });
    return Array.from(roles).sort();
  }, [payslips]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    payslips.forEach(p => {
      if (p.month) months.add(p.month);
    });
    return Array.from(months).sort();
  }, [payslips]);

  // Filtered payslips list based on search and dropdown filters
  const filteredPayslips = useMemo(() => {
    return payslips.filter(slip => {
      const empName = String(slip.employee_name || '').toLowerCase();
      const empCode = String(slip.employee_id_code || '').toLowerCase();
      const slipNum = String(slip.slip_number || slip.id || '').toLowerCase();

      // Search Employee Name, ID or Slip Number
      if (searchEmployee.trim()) {
        const q = searchEmployee.toLowerCase();
        const matchName = empName.includes(q);
        const matchCode = empCode.includes(q);
        const matchSlip = slipNum.includes(q);
        if (!matchName && !matchCode && !matchSlip) return false;
      }

      // Role filter
      if (selectedRole && String(slip.employee_role).toLowerCase() !== selectedRole.toLowerCase()) {
        return false;
      }

      // Month filter
      if (selectedMonth && String(slip.month).toLowerCase() !== selectedMonth.toLowerCase()) {
        return false;
      }

      // Status filter (all, paid, partial, pending, unpaid)
      const st = String(slip.status || '').toLowerCase();
      const isPaid = st === 'paid' || (slip.net_salary > 0 && slip.paid_amount >= slip.net_salary);
      const isPartial = !isPaid && (st === 'partial' || (slip.paid_amount > 0 && slip.pending_balance > 0));
      const hasAnyPayment = isPaid || isPartial || slip.paid_amount > 0;

      if (statusFilter === 'paid') {
        if (!hasAnyPayment) return false;
      } else if (statusFilter === 'partial') {
        if (!isPartial) return false;
      } else if (statusFilter === 'pending') {
        if (hasAnyPayment || st === 'unpaid') return false;
      } else if (statusFilter === 'unpaid') {
        if (hasAnyPayment || st === 'paid' || st === 'partial') return false;
      }

      return true;
    });
  }, [payslips, searchEmployee, selectedRole, selectedMonth, statusFilter]);

  // Global Summary Stats for 5 Clickable Cards
  const stats = useMemo(() => {
    let totalCount = 0;
    let totalSalaryAmount = 0;
    let totalPaidAmount = 0;
    let totalPartialAmount = 0;
    let totalPendingAmount = 0;
    let totalUnpaidAmount = 0;

    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let unpaidCount = 0;

    payslips.forEach(slip => {
      totalCount += 1;
      const net = Number(slip.net_salary || 0);
      const paid = Number(slip.paid_amount || 0);
      const pending = Number(slip.pending_balance || 0);
      const st = String(slip.status || '').toLowerCase();

      const isPaid = st === 'paid' || (net > 0 && paid >= net);
      const isPartial = !isPaid && (st === 'partial' || (paid > 0 && pending > 0));
      const hasAnyPayment = isPaid || isPartial || paid > 0;

      totalSalaryAmount += net;
      totalPaidAmount += paid;

      if (hasAnyPayment) {
        paidCount += 1;
        if (isPartial) {
          partialCount += 1;
          totalPartialAmount += paid;
        }
      } else if (st === 'unpaid') {
        unpaidCount += 1;
        totalUnpaidAmount += pending;
      } else {
        pendingCount += 1;
        totalPendingAmount += pending;
      }
    });

    return {
      totalCount,
      totalSalaryAmount,
      totalPaidAmount,
      totalPartialAmount,
      totalPendingAmount,
      totalUnpaidAmount,
      paidCount,
      partialCount,
      pendingCount,
      unpaidCount
    };
  }, [payslips]);

  const handleResetFilters = () => {
    setSearchEmployee('');
    setSelectedRole('');
    setSelectedMonth('');
    setStatusFilter('all');
  };

  // Open Quick Pay Modal for a Payslip
  const handleInitiatePay = (slip: any) => {
    setPayingSlip(slip);
    setPayDeposit(String(slip.pending_balance > 0 ? slip.pending_balance : slip.net_salary));
    setPayMethod('bank_transfer');
    setShowPayModal(true);
  };

  // Confirm Salary Payment
  const handleConfirmPay = async () => {
    if (!payingSlip) return;
    const deposit = parseFloat(payDeposit);
    if (isNaN(deposit) || deposit <= 0) {
      toast.error('Please enter a valid disbursement amount.');
      return;
    }

    setSubmittingPay(true);
    try {
      const net = Number(payingSlip.net_salary || 0);
      const prevPaid = Number(payingSlip.paid_amount || 0);
      const newPaid = prevPaid + deposit;
      const newPending = Math.max(0, net - newPaid);
      const nextStatus = newPending <= 0 ? 'paid' : 'partial';

      // 1. Update payslip via ledger service
      await ledgerService.updatePayslip(payingSlip.id, {
        paid_amount: newPaid,
        status: nextStatus as any,
        payment_date: new Date().toISOString().substring(0, 10)
      }).catch(e => console.warn('Payslip update notice:', e));

      // 2. Post expense transaction to Ledger
      await ledgerService.createLedgerEntry({
        date: new Date().toISOString().substring(0, 10),
        description: `Salary Payment - ${payingSlip.employee_name} (${payingSlip.month})`,
        amount: deposit,
        type: 'expense',
        account_head_name: 'Staff Salary Expense',
        reference: payingSlip.slip_number || `SAL-${payingSlip.id}`,
        notes: `Disbursed Rs ${deposit} via ${payMethod}`
      }).catch(e => console.warn('Ledger auto-expense notice:', e));

      toast.success(`Salary payment of Rs ${deposit.toLocaleString()} disbursed to ${payingSlip.employee_name}!`);
      setShowPayModal(false);
      setPayingSlip(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record salary payment.');
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-6 text-slate-800 pb-12">
      {/* Page Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 text-purple-700">
          <div className="p-2.5 bg-purple-50 rounded-2xl text-purple-600 shadow-3xs">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Salary List (clist)</h1>
            <p className="text-xs font-semibold text-slate-400">View, search, and disburse employee salary payslips and payment status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => navigate('/education/salary/generate')}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-3xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Generate Salary
          </button>
        </div>
      </div>

      {/* 5 Interactive Clickable Summary Cards Grid (Identical to Invoices Page Pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Salary Payslips */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-3xs hover:-translate-y-0.5 ${
            statusFilter === 'all'
              ? 'border-purple-300 ring-2 ring-purple-600 shadow-md bg-purple-50/20 scale-[1.02]'
              : 'border-slate-150 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">TOTAL PAYSLIPS</span>
            <div className={`p-2 rounded-xl transition-colors ${statusFilter === 'all' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-slate-800">{stats.totalCount}</div>
            <div className="text-xs font-bold text-slate-500">{formatCurrency(stats.totalSalaryAmount)}</div>
          </div>
        </button>

        {/* Card 2: Paid Salaries */}
        <button
          onClick={() => setStatusFilter('paid')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-3xs hover:-translate-y-0.5 ${
            statusFilter === 'paid'
              ? 'border-emerald-300 ring-2 ring-emerald-600 shadow-md bg-emerald-50/20 scale-[1.02]'
              : 'border-slate-150 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">PAID SALARIES</span>
            <div className={`p-2 rounded-xl transition-colors ${statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-slate-800">{stats.paidCount}</div>
            <div className="text-xs font-bold text-emerald-600">{formatCurrency(stats.totalPaidAmount)}</div>
          </div>
        </button>

        {/* Card 3: Partial Paid */}
        <button
          onClick={() => setStatusFilter('partial')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-3xs hover:-translate-y-0.5 ${
            statusFilter === 'partial'
              ? 'border-blue-300 ring-2 ring-blue-600 shadow-md bg-blue-50/20 scale-[1.02]'
              : 'border-slate-150 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">PARTIAL PAID</span>
            <div className={`p-2 rounded-xl transition-colors ${statusFilter === 'partial' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-slate-800">{stats.partialCount}</div>
            <div className="text-xs font-bold text-blue-600">{formatCurrency(stats.totalPartialAmount)}</div>
          </div>
        </button>

        {/* Card 4: Pending / Draft Salaries */}
        <button
          onClick={() => setStatusFilter('pending')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-3xs hover:-translate-y-0.5 ${
            statusFilter === 'pending'
              ? 'border-amber-300 ring-2 ring-amber-500 shadow-md bg-amber-50/20 scale-[1.02]'
              : 'border-slate-150 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">PENDING SALARIES</span>
            <div className={`p-2 rounded-xl transition-colors ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-slate-800">{stats.pendingCount}</div>
            <div className="text-xs font-bold text-amber-600">{formatCurrency(stats.totalPendingAmount)}</div>
          </div>
        </button>

        {/* Card 5: Unpaid / Overdue */}
        <button
          onClick={() => setStatusFilter('unpaid')}
          className={`text-left bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-3xs hover:-translate-y-0.5 ${
            statusFilter === 'unpaid'
              ? 'border-rose-300 ring-2 ring-rose-600 shadow-md bg-rose-50/20 scale-[1.02]'
              : 'border-slate-150 hover:border-slate-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">UNPAID</span>
            <div className={`p-2 rounded-xl transition-colors ${statusFilter === 'unpaid' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-2xl font-black text-slate-800">{stats.unpaidCount}</div>
            <div className="text-xs font-bold text-rose-600">{formatCurrency(stats.totalUnpaidAmount)}</div>
          </div>
        </button>
      </div>

      {/* Filters & Search Options Bar (Identical to Invoices Page Pattern) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
            <Filter className="w-4 h-4 text-purple-600" />
            <span>Filters & Search Options</span>
          </div>
          {(searchEmployee || selectedRole || selectedMonth || statusFilter !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              × Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee Search */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Employee Name / ID</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Filter By Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs cursor-pointer"
            >
              <option value="">All Roles</option>
              {roleOptions.map((role, idx) => (
                <option key={idx} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Pay Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs cursor-pointer"
            >
              <option value="">All Months</option>
              {monthOptions.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs cursor-pointer"
            >
              <option value="all">All Salary Payslips</option>
              <option value="paid">Paid Salaries</option>
              <option value="partial">Partially Paid</option>
              <option value="pending">Pending Salaries</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Salary Payslips Data Table (Identical Layout Pattern) */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
            <p className="text-xs font-semibold">Loading salary payslips...</p>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">No salary payslips match your search filters.</p>
            <p className="text-xs text-slate-400">Try clearing filters or generating new salary slips.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">SR.</th>
                  <th className="py-3.5 px-4">EMPLOYEE NAME & ID</th>
                  <th className="py-3.5 px-4">ROLE</th>
                  <th className="py-3.5 px-4">MONTH</th>
                  <th className="py-3.5 px-4">SLIP NO</th>
                  <th className="py-3.5 px-4 text-right">NET SALARY</th>
                  <th className="py-3.5 px-4 text-right">PAID</th>
                  <th className="py-3.5 px-4 text-right">PENDING</th>
                  <th className="py-3.5 px-4">PAY DATE</th>
                  <th className="py-3.5 px-4 text-center">STATUS</th>
                  <th className="py-3.5 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayslips.map((slip, index) => {
                  const isPaid = slip.status === 'paid';
                  const isPartial = slip.status === 'partial';

                  return (
                    <tr key={slip.id || index} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sr */}
                      <td className="py-3.5 px-4 font-bold text-slate-400">{index + 1}</td>

                      {/* Employee Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-xs shadow-2xs">
                            {(slip.employee_name || 'E')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800">{slip.employee_name}</p>
                            <p className="text-[10px] font-mono text-slate-400 uppercase">{slip.employee_id_code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 font-bold text-slate-600">{slip.employee_role}</td>

                      {/* Month */}
                      <td className="py-3.5 px-4 font-bold text-slate-700">{slip.month}</td>

                      {/* Slip No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 uppercase">{slip.slip_number || `SLIP-${slip.id?.substring(0, 6)}`}</td>

                      {/* Net Salary */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        {formatCurrency(slip.net_salary)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(slip.paid_amount)}
                      </td>

                      {/* Pending Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                        {formatCurrency(slip.pending_balance)}
                      </td>

                      {/* Pay Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-bold">{formatDate(slip.payment_date || slip.date)}</td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 border border-blue-100 text-blue-600">
                            <AlertTriangle className="w-3 h-3" /> Partial
                          </span>
                        ) : slip.status === 'unpaid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 border border-rose-100 text-rose-600">
                            <X className="w-3 h-3" /> Unpaid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/education/salary/slips?id=${slip.id}&month=${slip.month}`)}
                            title="View Salary Slip"
                            className="p-1.5 bg-purple-50 text-purple-650 hover:bg-purple-100 rounded-lg transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-purple-600" />
                          </button>
                          {slip.pending_balance > 0 && (
                            <button
                              onClick={() => handleInitiatePay(slip)}
                              title="Disburse Salary Payment Now"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Pay Salary Modal (Identical to Quick Receive Payment Modal Pattern) */}
      {showPayModal && payingSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Disburse Salary Payment</h4>
              </div>
              <button 
                onClick={() => { setShowPayModal(false); setPayingSlip(null); }}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <p><span className="font-bold text-slate-400">EMPLOYEE:</span> <span className="font-bold text-slate-800">{payingSlip.employee_name}</span></p>
                <p><span className="font-bold text-slate-400">PAY MONTH:</span> <span className="font-bold text-slate-800">{payingSlip.month}</span></p>
                <p><span className="font-bold text-slate-400">TOTAL DUE:</span> <span className="font-bold text-emerald-600">{formatCurrency(payingSlip.pending_balance)}</span></p>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Disbursement Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-3xs cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash Payment</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Disbursement Amount (Rs) *</label>
                <input
                  type="number"
                  placeholder="Enter amount paid..."
                  value={payDeposit}
                  onChange={(e) => setPayDeposit(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-3xs"
                />
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setShowPayModal(false); setPayingSlip(null); }}
                className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-500 font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmPay}
                disabled={submittingPay || !payDeposit || parseFloat(payDeposit) <= 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {submittingPay ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : 'Confirm Disbursement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
