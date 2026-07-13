import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  GraduationCap, 
  Users, 
  Clock 
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import financeService, { Invoice } from '@/services/finance.service';
import academicService from '@/services/academic.service';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchParent, setSearchParent] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, pending, defaulters

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, studentsRes, classesRes] = await Promise.allSettled([
        financeService.getInvoices({ status: 'all' }),
        api.get(API_ENDPOINTS.STUDENTS),
        academicService.classes.getAll()
      ]);

      let loadedInvoices: Invoice[] = [];
      if (invRes.status === 'fulfilled' && invRes.value && invRes.value.data) {
        const data = invRes.value.data;
        loadedInvoices = Array.isArray(data) ? data : (data.results || data.data || []);
        setInvoices(loadedInvoices);
        console.log('InvoicesPage: Loaded invoices count:', loadedInvoices.length, loadedInvoices);
      } else {
        console.error('InvoicesPage: Failed to load invoices:', invRes);
      }
      
      if (studentsRes.status === 'fulfilled' && studentsRes.value) {
        const rawStudents = extractListData<any>(studentsRes.value.data);
        setStudents(rawStudents);
        console.log('InvoicesPage: Loaded students count:', rawStudents.length);
      } else {
        console.error('InvoicesPage: Failed to load students:', studentsRes);
      }
      
      if (classesRes.status === 'fulfilled' && classesRes.value) {
        const rawClasses = Array.isArray(classesRes.value) ? classesRes.value : [];
        setClasses(rawClasses);
        console.log('InvoicesPage: Loaded classes count:', rawClasses.length);
      } else {
        console.error('InvoicesPage: Failed to load classes:', classesRes);
      }
    } catch (err) {
      console.error('InvoicesPage: Exception in fetchData:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceFeeMonth = (inv: any) => {
    if (!inv) return '';
    const dateStr = inv.invoice_month || inv.issue_date || inv.created_at || '';
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June', 
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const mIdx = Number(parts[1]) - 1;
        return `${months[mIdx]} ${parts[0]}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null) return '0';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString();
  };

  // Helper to determine if an invoice is in defaulter state
  const isDefaulter = (inv: Invoice) => {
    try {
      if (!inv) return false;
      if (inv.status === 'paid' || inv.status === 'carried_forward' || inv.status === 'cancelled') {
        return false;
      }
      const balance = inv.balance_due !== undefined ? inv.balance_due : (Number(inv.amount || 0) - Number(inv.paid_amount || 0));
      if (balance <= 0) return false;
      
      if (inv.due_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(inv.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }
    } catch (e) {
      console.error('Error checking defaulter status:', e);
    }
    return false;
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    const list = Array.isArray(invoices) ? invoices : [];
    return list.filter(inv => {
      if (!inv) return false;
      
      // Find student details
      const studentObj = Array.isArray(students) 
        ? students.find(s => s && String(s.id) === String(inv.student))
        : null;
      const studentName = studentObj?.full_name || inv.student_name || '';
      const studentId = studentObj?.student_id || '';
      const parentName = studentObj?.father_name || studentObj?.guardian_name || '';

      // Match Student search (Name or ID)
      if (searchStudent.trim()) {
        const sQuery = searchStudent.toLowerCase();
        const matchesName = studentName.toLowerCase().includes(sQuery);
        const matchesId = studentId.toLowerCase().includes(sQuery);
        if (!matchesName && !matchesId) return false;
      }

      // Match Class filter
      if (selectedClass) {
        // Match class either by ID or name
        const classObj = Array.isArray(classes) 
          ? classes.find(c => c && String(c.id) === String(selectedClass))
          : null;
        const className = classObj?.name || '';
        const invClassName = inv.class_name || '';
        if (
          String(studentObj?.current_class) !== String(selectedClass) && 
          String(studentObj?.current_class?.id) !== String(selectedClass) &&
          !invClassName.toLowerCase().includes(className.toLowerCase())
        ) {
          return false;
        }
      }

      // Match Parent search
      if (searchParent.trim()) {
        const pQuery = searchParent.toLowerCase();
        if (!parentName.toLowerCase().includes(pQuery)) return false;
      }

      // Match Status filter (all, paid, pending, defaulters)
      const balance = inv.balance_due !== undefined ? inv.balance_due : (Number(inv.amount || 0) - Number(inv.paid_amount || 0));
      const isDef = isDefaulter(inv);

      if (statusFilter === 'paid') {
        if (inv.status !== 'paid' && balance > 0) return false;
      } else if (statusFilter === 'pending') {
        // Pending = unpaid or partially paid and not yet a defaulter (or all pending)
        if (balance <= 0 || inv.status === 'paid') return false;
      } else if (statusFilter === 'defaulters') {
        if (!isDef) return false;
      }

      return true;
    });
  }, [invoices, students, classes, searchStudent, selectedClass, searchParent, statusFilter]);

  // Calculate summary stats dynamically based on filteredInvoices
  const stats = useMemo(() => {
    let totalInvoices = 0;
    let totalInvoicedAmount = 0;
    let totalPaid = 0;
    let totalPendingAmount = 0;
    let totalDefaulterAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let defaulterCount = 0;

    filteredInvoices.forEach(inv => {
      if (!inv) return;
      totalInvoices += 1;
      
      const totalAmt = inv.total_amount !== undefined && inv.total_amount !== null
        ? Number(inv.total_amount)
        : (Number(inv.amount || 0) + Number(inv.late_fee_amount || 0) - Number(inv.discount_amount || 0));
        
      const paidAmt = Number(inv.paid_amount || 0);
      const balance = inv.balance_due !== undefined && inv.balance_due !== null
        ? Number(inv.balance_due)
        : (totalAmt - paidAmt);

      totalInvoicedAmount += totalAmt;
      totalPaid += paidAmt;

      if (inv.status === 'paid' || balance <= 0) {
        paidCount += 1;
      } else if (isDefaulter(inv)) {
        defaulterCount += 1;
        totalDefaulterAmount += balance;
      } else {
        pendingCount += 1;
        totalPendingAmount += balance;
      }
    });

    return {
      totalInvoices,
      totalInvoicedAmount,
      totalPaid,
      totalPendingAmount,
      totalDefaulterAmount,
      paidCount,
      pendingCount,
      defaulterCount
    };
  }, [filteredInvoices]);

  const handleResetFilters = () => {
    setSearchStudent('');
    setSelectedClass('');
    setSearchParent('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-6 text-slate-800 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 text-purple-700">
          <div className="p-2.5 bg-purple-50 rounded-2xl text-purple-600 shadow-3xs">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Invoice List (clist)</h1>
            <p className="text-xs font-semibold text-slate-400">View, search, and filter student fee invoices and payment status</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-shadow">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Invoices</p>
            <h3 className="text-lg font-black text-slate-850 mt-0.5">{stats.totalInvoices}</h3>
            <p className="text-xs font-bold text-slate-500">Rs {formatCurrency(stats.totalInvoicedAmount)}</p>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-shadow">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Paid Invoices</p>
            <h3 className="text-lg font-black text-slate-850 mt-0.5">{stats.paidCount}</h3>
            <p className="text-xs font-bold text-emerald-600">Rs {formatCurrency(stats.totalPaid)}</p>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-shadow">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Pending Invoices</p>
            <h3 className="text-lg font-black text-slate-850 mt-0.5">{stats.pendingCount}</h3>
            <p className="text-xs font-bold text-amber-600">Rs {formatCurrency(stats.totalPendingAmount)}</p>
          </div>
        </div>

        {/* Defaulters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-shadow">
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">Defaulters</p>
            <h3 className="text-lg font-black text-slate-850 mt-0.5">{stats.defaulterCount}</h3>
            <p className="text-xs font-bold text-red-600">Rs {formatCurrency(stats.totalDefaulterAmount)}</p>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-purple-700 uppercase tracking-wider pb-2 border-b border-slate-100">
          <Filter className="w-4 h-4" />
          <span>Filters & Search Options</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Student */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Student Name / ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs"
              />
            </div>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Filter by Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Search Parent */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Parent / Guardian Name</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search parent..."
                value={searchParent}
                onChange={(e) => setSearchParent(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-3xs"
            >
              <option value="all">All Invoices</option>
              <option value="paid">Paid Invoices</option>
              <option value="pending">Pending Invoices</option>
              <option value="defaulters">Defaulters (Overdue)</option>
            </select>
          </div>
        </div>

        {(searchStudent || selectedClass || searchParent || statusFilter !== 'all') && (
          <div className="flex justify-end pt-2">
            <button 
              onClick={handleResetFilters} 
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold text-[10px] rounded-lg transition-all"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main List Table */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-3xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            <p className="text-xs text-slate-400 font-bold">Loading invoice records...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-sm font-extrabold text-slate-700">No invoices match your search filters.</p>
            <p className="text-xs text-slate-400 font-semibold">Try clearing filters or checking other classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-black text-slate-455 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Sr.</th>
                  <th className="py-3 px-4">Student Name & ID</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Pending</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.map((inv, idx) => {
                  const studentObj = students.find(s => String(s.id) === String(inv.student));
                  const studentName = studentObj?.full_name || inv.student_name || 'N/A';
                  const studentIdCode = studentObj?.student_id || 'N/A';
                  const className = studentObj?.current_class?.name || inv.class_name || 'N/A';
                  
                  const isDef = isDefaulter(inv);
                  const balance = inv.balance_due !== undefined ? inv.balance_due : (inv.amount - inv.paid_amount);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Sr. No */}
                      <td className="py-3.5 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                      
                      {/* Student Name */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-extrabold text-slate-800">{studentName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{studentIdCode}</p>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4 font-bold text-slate-500">{className}</td>

                      {/* Month */}
                      <td className="py-3.5 px-4 font-bold text-slate-655">{getInvoiceFeeMonth(inv)}</td>

                      {/* Invoice No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-655 uppercase tracking-tight">{inv.invoice_number}</td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        Rs {formatCurrency(inv.amount)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        Rs {formatCurrency(inv.paid_amount)}
                      </td>

                      {/* Pending Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                        Rs {formatCurrency(balance)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-bold">{formatDate(inv.due_date)}</td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isDef ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 border border-rose-100 text-rose-600">
                            <Clock className="w-3 h-3" /> Defaulter
                          </span>
                        ) : inv.status === 'paid' || balance <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : inv.status === 'partial' || (inv.paid_amount > 0 && balance > 0) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">
                            <AlertTriangle className="w-3 h-3" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500">
                            Unpaid
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/education/finance/fees-paid-slip?invoice_id=${inv.id}`)}
                            title="View Slip Details"
                            className="p-1.5 bg-purple-50 text-purple-650 hover:bg-purple-100 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {balance > 0 && (
                            <button
                              onClick={() => navigate(`/education/finance/collect-fees?student_id=${inv.student}`)}
                              title="Collect Due Payment"
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                            >
                              Collect
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
    </div>
  );
}
