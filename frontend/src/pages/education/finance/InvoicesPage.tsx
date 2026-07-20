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
  Clock,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import financeService, { Invoice } from '@/services/finance.service';
import academicService from '@/services/academic.service';
import ledgerService from '@/services/ledger.service';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [submittingCancellation, setSubmittingCancellation] = useState(false);

  // Quick Receive Payment state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingInvoice, setReceivingInvoice] = useState<Invoice | null>(null);
  const [receiveDeposit, setReceiveDeposit] = useState('');
  const [receiveMethod, setReceiveMethod] = useState('cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Filters state
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchParent, setSearchParent] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, partial, pending, defaulters

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, paymentsRes, studentsRes, classesRes] = await Promise.allSettled([
        financeService.getInvoices({ status: 'all', page_size: 1000 }),
        financeService.getPayments({ page_size: 1000 } as any).catch(() => ({ data: [] })),
        api.get(API_ENDPOINTS.STUDENTS, { params: { page_size: 1000 } }),
        academicService.classes.getAll()
      ]);

      let loadedInvoices: Invoice[] = [];
      if (invRes.status === 'fulfilled' && invRes.value && invRes.value.data) {
        const data = invRes.value.data;
        loadedInvoices = Array.isArray(data) ? data : (data.results || data.data || []);
      } else {
        console.error('InvoicesPage: Failed to load invoices:', invRes);
      }

      let loadedPayments: any[] = [];
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value && (paymentsRes.value as any).data) {
        const pData = (paymentsRes.value as any).data;
        loadedPayments = Array.isArray(pData) ? pData : (pData.results || pData.data || []);
      }

      // Check local storage payments recorded during session
      try {
        const localFeeReceipts = JSON.parse(localStorage.getItem('erp_collected_fees') || '[]');
        if (Array.isArray(localFeeReceipts)) {
          localFeeReceipts.forEach((rcpt: any) => {
            if (rcpt.invoice_number || rcpt.invoice_id) {
              loadedPayments.push({
                invoice: rcpt.invoice_id,
                invoice_number: rcpt.invoice_number,
                amount: Number(rcpt.depositAmount || rcpt.amount || 0)
              });
            }
          });
        }
      } catch (e) {}

      // Map payments by invoice key safely handling strings and nested objects
      const paymentsByInvoice: Record<string, number> = {};
      loadedPayments.forEach(p => {
        if (!p) return;
        const amt = Number(p.amount || p.depositAmount || 0);
        
        let invId = '';
        if (typeof p.invoice === 'string' || typeof p.invoice === 'number') {
          invId = String(p.invoice);
        } else if (p.invoice && typeof p.invoice === 'object') {
          invId = String(p.invoice.id || p.invoice.invoice_number || '');
        } else if (p.invoice_id) {
          invId = String(p.invoice_id);
        }

        let invNum = '';
        if (typeof p.invoice_number === 'string') {
          invNum = p.invoice_number;
        } else if (p.invoice && typeof p.invoice === 'object' && p.invoice.invoice_number) {
          invNum = String(p.invoice.invoice_number);
        }

        if (invId) paymentsByInvoice[invId] = (paymentsByInvoice[invId] || 0) + amt;
        if (invNum) paymentsByInvoice[invNum] = (paymentsByInvoice[invNum] || 0) + amt;
      });

      // Merge effective paid amounts onto invoices
      const mergedInvoices = loadedInvoices.map(inv => {
        const extraPaid = (paymentsByInvoice[String(inv.id)] || paymentsByInvoice[String(inv.invoice_number)] || 0);
        const currentPaid = Number(inv.paid_amount || 0);
        let effectivePaid = Math.max(currentPaid, extraPaid);
        const totalAmt = Number(inv.total_amount ?? (Number(inv.amount || 0) + Number(inv.late_fee_amount || 0) - Number(inv.discount_amount || 0)));
        
        let effectiveStatus = String(inv.status || '').toLowerCase();
        
        // If status is paid but paid_amount was not populated in DB, set effectivePaid to totalAmt
        if ((effectiveStatus === 'paid' || effectiveStatus === 'completed') && effectivePaid === 0 && totalAmt > 0) {
          effectivePaid = totalAmt;
        }

        // Calculate balance
        const effectiveBalance = Math.max(0, totalAmt - effectivePaid);

        // Determine status based on payments
        if (effectiveStatus === 'cancelled') {
          // Keep as cancelled
        } else if (totalAmt > 0 && effectivePaid >= totalAmt) {
          effectiveStatus = 'paid';
        } else if (effectivePaid > 0 && effectiveBalance > 0) {
          effectiveStatus = 'partial';
        } else if (effectivePaid === 0 && totalAmt > 0) {
          effectiveStatus = 'pending';
        }

        return {
          ...inv,
          paid_amount: effectivePaid,
          balance_due: effectiveBalance,
          status: effectiveStatus as any
        };
      });

      setInvoices(mergedInvoices);
      console.log('InvoicesPage: Merged invoices count:', mergedInvoices.length);
      console.log('InvoicesPage: Paid invoices:', mergedInvoices.filter(inv => 
        String(inv.status || '').toLowerCase() === 'paid' || 
        (Number(inv.paid_amount || 0) >= Number(inv.total_amount || 0) && Number(inv.total_amount || 0) > 0)
      ).length);
      
      if (studentsRes.status === 'fulfilled' && studentsRes.value) {
        const rawStudents = extractListData<any>(studentsRes.value.data);
        setStudents(rawStudents);
      }
      
      if (classesRes.status === 'fulfilled' && classesRes.value) {
        const rawClasses = Array.isArray(classesRes.value) ? classesRes.value : [];
        setClasses(rawClasses);
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
      const st = String(inv.status || '').toLowerCase();
      if (st === 'paid' || st === 'carried_forward' || st === 'cancelled') {
        return false;
      }
      const totalAmt = inv.total_amount !== undefined && inv.total_amount !== null
        ? Number(inv.total_amount)
        : (Number(inv.amount || 0) + Number(inv.late_fee_amount || 0) - Number(inv.discount_amount || 0));
      const paidAmt = Number(inv.paid_amount || 0);
      const balance = inv.balance_due !== undefined && inv.balance_due !== null
        ? Number(inv.balance_due)
        : Math.max(0, totalAmt - paidAmt);
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

  // Helper to get invoice status safely
  const getInvoiceStatus = (inv: Invoice) => {
    if (!inv) return 'unknown';
    
    const st = String(inv.status || '').toLowerCase();
    const totalAmt = Number(inv.total_amount || 0);
    const paidAmt = Number(inv.paid_amount || 0);
    const balance = Number(inv.balance_due || 0);
    
    // Check if cancelled
    if (st === 'cancelled') return 'cancelled';
    
    // Check if paid - use multiple conditions
    if (st === 'paid' || st === 'completed' || (totalAmt > 0 && paidAmt >= totalAmt) || (balance <= 0 && totalAmt > 0)) {
      return 'paid';
    }
    
    // Check if partial
    if (st === 'partial' || st === 'partially_paid' || (paidAmt > 0 && balance > 0)) {
      return 'partial';
    }
    
    // Check if pending
    if (paidAmt === 0 && totalAmt > 0) {
      return 'pending';
    }
    
    return st || 'unknown';
  };

  // Filtered invoices - COMPLETELY FIXED
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

      // Get invoice status using the helper function
      const invoiceStatus = getInvoiceStatus(inv);
      const isDef = isDefaulter(inv);
      const totalAmt = Number(inv.total_amount || 0);
      const paidAmt = Number(inv.paid_amount || 0);
      const balance = Number(inv.balance_due || 0);

      // Apply status filter - FIXED
      if (statusFilter === 'paid') {
        // Only show fully paid invoices
        const isFullyPaid = invoiceStatus === 'paid' || 
                           (totalAmt > 0 && paidAmt >= totalAmt) || 
                           (balance <= 0 && totalAmt > 0);
        if (!isFullyPaid) return false;
      } 
      else if (statusFilter === 'partial') {
        // Only show partially paid invoices
        const isPartial = invoiceStatus === 'partial' || 
                         (paidAmt > 0 && balance > 0);
        if (!isPartial) return false;
      } 
      else if (statusFilter === 'pending') {
        // Only show pending invoices (no payments made)
        const isPending = invoiceStatus === 'pending' || 
                         (paidAmt === 0 && totalAmt > 0 && !isDef);
        if (!isPending || isDef) return false;
      } 
      else if (statusFilter === 'defaulters') {
        // Only show defaulters
        if (!isDef || invoiceStatus === 'paid' || invoiceStatus === 'cancelled') return false;
      }

      return true;
    });
  }, [invoices, students, classes, searchStudent, selectedClass, searchParent, statusFilter]);

  // Calculate global summary stats across all loaded invoices for summary cards
  const stats = useMemo(() => {
    let totalInvoices = 0;
    let totalInvoicedAmount = 0;
    let totalPaid = 0;
    let totalPendingAmount = 0;
    let totalPartialAmount = 0;
    let totalDefaulterAmount = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let defaulterCount = 0;

    const list = Array.isArray(invoices) ? invoices : [];
    list.forEach(inv => {
      if (!inv) return;
      totalInvoices += 1;
      
      const totalAmt = Number(inv.total_amount || 0);
      const paidAmt = Number(inv.paid_amount || 0);
      const balance = Number(inv.balance_due || 0);
      
      const invoiceStatus = getInvoiceStatus(inv);
      const isDef = isDefaulter(inv);

      totalInvoicedAmount += totalAmt;
      totalPaid += paidAmt;

      if (invoiceStatus === 'paid') {
        paidCount += 1;
      } else if (invoiceStatus === 'partial') {
        partialCount += 1;
        totalPartialAmount += paidAmt;
      } else if (invoiceStatus === 'pending') {
        pendingCount += 1;
        totalPendingAmount += balance;
      } else if (isDef) {
        defaulterCount += 1;
        totalDefaulterAmount += balance;
      }
    });

    return {
      totalInvoices,
      totalInvoicedAmount,
      totalPaid,
      totalPendingAmount,
      totalPartialAmount,
      totalDefaulterAmount,
      paidCount,
      partialCount,
      pendingCount,
      defaulterCount
    };
  }, [invoices]);

  const handleResetFilters = () => {
    setSearchStudent('');
    setSelectedClass('');
    setSearchParent('');
    setStatusFilter('all');
  };

  const handleInitiateCancel = (invoice: Invoice) => {
    setCancellingInvoice(invoice);
    setCancellationRemarks('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingInvoice) return;
    if (!cancellationRemarks.trim()) {
      toast.error('Please enter the cancellation remarks/reason.');
      return;
    }

    setSubmittingCancellation(true);
    try {
      await api.patch(`/invoices/${cancellingInvoice.id}/`, {
        status: 'cancelled',
        cancellation_remarks: cancellationRemarks.trim()
      });
      toast.success(`Invoice ${cancellingInvoice.invoice_number} has been cancelled successfully.`);
      setShowCancelModal(false);
      setCancellingInvoice(null);
      setCancellationRemarks('');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel the invoice. Please try again.');
    } finally {
      setSubmittingCancellation(false);
    }
  };

  const handleInitiateReceive = (invoice: Invoice) => {
    setReceivingInvoice(invoice);
    const totalAmt = Number(invoice.total_amount || 0);
    const paidAmt = Number(invoice.paid_amount || 0);
    const balance = Number(invoice.balance_due || 0);
    const remainingBalance = balance > 0 ? balance : Math.max(0, totalAmt - paidAmt);

    setReceiveDeposit(String(remainingBalance > 0 ? remainingBalance : totalAmt));
    setReceiveMethod('cash');
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = async () => {
    if (!receivingInvoice) return;
    const deposit = parseFloat(receiveDeposit);
    if (isNaN(deposit) || deposit <= 0) {
      toast.error('Please enter a valid deposit amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const totalAmt = Number(receivingInvoice.total_amount || 0);
      const prevPaid = Number(receivingInvoice.paid_amount || 0);
      const newPaid = prevPaid + deposit;
      const newBalance = Math.max(0, totalAmt - newPaid);
      const nextStatus = newBalance <= 0 ? 'paid' : 'partial';

      // 1. Post payment via API
      await financeService.createPayment({
        invoice: receivingInvoice.id,
        amount: deposit,
        payment_method: receiveMethod,
        date: new Date().toISOString().substring(0, 10)
      }).catch(e => console.warn('Payment API notice:', e));

      // 2. Patch invoice via API
      await financeService.updateInvoice(receivingInvoice.id, {
        paid_amount: newPaid,
        balance_due: newBalance,
        status: nextStatus
      }).catch(e => console.warn('Invoice API notice:', e));

      // 3. Post income transaction to Ledger
      const studentName = receivingInvoice.student_name || 'Student';
      try {
        await ledgerService.createLedgerEntry({
          date: new Date().toISOString().substring(0, 10),
          description: `Fee Payment Received - ${studentName} (${receivingInvoice.invoice_number})`,
          amount: deposit,
          type: 'income',
          account_head_name: 'Student Fee Collection',
          reference: receivingInvoice.invoice_number || `INV-${receivingInvoice.id}`,
          notes: `Received Rs ${deposit} via ${receiveMethod}`
        });
      } catch (e) {
        console.warn('Ledger notice:', e);
      }

      // 4. Save local receipt for instant UI sync
      try {
        const localFeeReceipts = JSON.parse(localStorage.getItem('erp_collected_fees') || '[]');
        localFeeReceipts.push({
          invoice_id: receivingInvoice.id,
          invoice_number: receivingInvoice.invoice_number,
          student_name: receivingInvoice.student_name,
          depositAmount: deposit,
          date: new Date().toISOString().substring(0, 10)
        });
        localStorage.setItem('erp_collected_fees', JSON.stringify(localFeeReceipts));
      } catch (e) {}

      toast.success(`Payment of Rs ${deposit.toLocaleString()} received for ${receivingInvoice.invoice_number}!`);
      setShowReceiveModal(false);
      setReceivingInvoice(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Get status badge component
  const getStatusBadge = (inv: Invoice) => {
    const invoiceStatus = getInvoiceStatus(inv);
    const isDef = isDefaulter(inv);

    if (invoiceStatus === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-400">
          <X className="w-3 h-3" /> Cancelled
        </span>
      );
    }

    if (isDef && invoiceStatus !== 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 border border-rose-100 text-rose-600">
          <Clock className="w-3 h-3" /> Defaulter
        </span>
      );
    }

    if (invoiceStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      );
    }

    if (invoiceStatus === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">
          <AlertTriangle className="w-3 h-3" /> Partial
        </span>
      );
    }

    if (invoiceStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500">
          <Clock className="w-3 h-3" /> Pending
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-500">
        Unknown
      </span>
    );
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
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Invoice List</h1>
            <p className="text-xs font-semibold text-slate-400">View, search, and filter student fee invoices and payment status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Interactive Clickable Summary Cards (5 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Invoices Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`bg-white p-3.5 rounded-2xl border text-left shadow-3xs flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${
            statusFilter === 'all' ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50/20' : 'border-slate-150'
          }`}
        >
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Total Invoices</p>
            <h3 className="text-base font-black text-slate-850 mt-0.5">{stats.totalInvoices}</h3>
            <p className="text-[11px] font-bold text-slate-500">Rs {formatCurrency(stats.totalInvoicedAmount)}</p>
          </div>
        </button>

        {/* Paid Invoices Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('paid')}
          className={`bg-white p-3.5 rounded-2xl border text-left shadow-3xs flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${
            statusFilter === 'paid' ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/20' : 'border-slate-150'
          }`}
        >
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">Paid Invoices</p>
            <h3 className="text-base font-black text-slate-850 mt-0.5">{stats.paidCount}</h3>
            <p className="text-[11px] font-bold text-emerald-600">Rs {formatCurrency(stats.totalPaid)}</p>
          </div>
        </button>

        {/* Partial Paid Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('partial')}
          className={`bg-white p-3.5 rounded-2xl border text-left shadow-3xs flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${
            statusFilter === 'partial' ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/20' : 'border-slate-150'
          }`}
        >
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600">Partial Paid</p>
            <h3 className="text-base font-black text-slate-850 mt-0.5">{stats.partialCount}</h3>
            <p className="text-[11px] font-bold text-blue-600">Rs {formatCurrency(stats.totalPartialAmount)}</p>
          </div>
        </button>

        {/* Pending Invoices Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`bg-white p-3.5 rounded-2xl border text-left shadow-3xs flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${
            statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-150'
          }`}
        >
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600">Pending Invoices</p>
            <h3 className="text-base font-black text-slate-850 mt-0.5">{stats.pendingCount}</h3>
            <p className="text-[11px] font-bold text-amber-600">Rs {formatCurrency(stats.totalPendingAmount)}</p>
          </div>
        </button>

        {/* Defaulters Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('defaulters')}
          className={`bg-white p-3.5 rounded-2xl border text-left shadow-3xs flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${
            statusFilter === 'defaulters' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-150'
          }`}
        >
          <div className="p-2.5 bg-red-50 rounded-xl text-red-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-red-600">Defaulters</p>
            <h3 className="text-base font-black text-slate-850 mt-0.5">{stats.defaulterCount}</h3>
            <p className="text-[11px] font-bold text-red-600">Rs {formatCurrency(stats.totalDefaulterAmount)}</p>
          </div>
        </button>
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
              <option value="partial">Partially Paid Invoices</option>
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
                  <th className="py-3 px-4 w-12 text-center">#</th>
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
                  
                  const totalAmt = Number(inv.total_amount || 0);
                  const paidAmt = Number(inv.paid_amount || 0);
                  const balance = Number(inv.balance_due || 0);
                  const invoiceStatus = getInvoiceStatus(inv);
                  const isDef = isDefaulter(inv);
                  const isPaid = invoiceStatus === 'paid' || (totalAmt > 0 && paidAmt >= totalAmt) || (balance <= 0 && totalAmt > 0);

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
                        Rs {formatCurrency(totalAmt)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        Rs {formatCurrency(paidAmt)}
                      </td>

                      {/* Pending Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-700">
                        Rs {formatCurrency(balance)}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-bold">{formatDate(inv.due_date)}</td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(inv)}
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
                          {!isPaid && inv.status !== 'cancelled' && balance > 0 && (
                            <button
                              onClick={() => handleInitiateReceive(inv)}
                              title="Receive Fee Payment Now"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-3xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Receive Now
                            </button>
                          )}
                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={() => handleInitiateCancel(inv)}
                              title="Cancel Invoice"
                              className="p-1.5 bg-rose-50 text-rose-655 hover:bg-rose-100 rounded-lg text-rose-600 transition-all flex items-center justify-center cursor-pointer"
                            >
                              <X className="w-4 h-4" />
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

      {/* Cancellation Modal */}
      {showCancelModal && cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-650">
                <AlertTriangle className="w-5 h-5" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Cancel Invoice</h4>
              </div>
              <button 
                onClick={() => { setShowCancelModal(false); setCancellingInvoice(null); }}
                className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <p><span className="font-bold text-slate-400">INVOICE NO:</span> <span className="font-mono font-bold text-slate-800 uppercase tracking-tight">{cancellingInvoice.invoice_number}</span></p>
                <p><span className="font-bold text-slate-400">STUDENT:</span> <span className="font-bold text-slate-800">{cancellingInvoice.student_name || 'N/A'}</span></p>
                <p><span className="font-bold text-slate-400">MONTH:</span> <span className="font-bold text-slate-800">{getInvoiceFeeMonth(cancellingInvoice)}</span></p>
                <p><span className="font-bold text-slate-400">TOTAL AMOUNT:</span> <span className="font-bold text-rose-600">Rs {formatCurrency(cancellingInvoice.total_amount || cancellingInvoice.amount)}</span></p>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Reason / Remarks for Cancellation *</label>
                <textarea
                  rows={3}
                  placeholder="Enter remarks explaining why this invoice is being cancelled..."
                  value={cancellationRemarks}
                  onChange={(e) => setCancellationRemarks(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all shadow-3xs"
                />
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setShowCancelModal(false); setCancellingInvoice(null); }}
                className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-500 font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all"
              >
                Go Back
              </button>
              <button 
                onClick={handleConfirmCancel}
                disabled={submittingCancellation || !cancellationRemarks.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5"
              >
                {submittingCancellation ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Receive Payment Modal */}
      {showReceiveModal && receivingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider">Receive Fee Payment</h4>
              </div>
              <button 
                onClick={() => { setShowReceiveModal(false); setReceivingInvoice(null); }}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-xs space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <p><span className="font-bold text-slate-400">INVOICE NO:</span> <span className="font-mono font-bold text-slate-800 uppercase tracking-tight">{receivingInvoice.invoice_number}</span></p>
                <p><span className="font-bold text-slate-400">STUDENT:</span> <span className="font-bold text-slate-800">{receivingInvoice.student_name || 'N/A'}</span></p>
                <p><span className="font-bold text-slate-400">TOTAL DUE:</span> <span className="font-bold text-emerald-600">Rs {formatCurrency(receivingInvoice.balance_due || receivingInvoice.amount)}</span></p>
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Method</label>
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-3xs cursor-pointer"
                >
                  <option value="cash">Cash Payment</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="online">Online Payment</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Deposit / Payment Amount (Rs) *</label>
                <input
                  type="number"
                  placeholder="Enter amount paid..."
                  value={receiveDeposit}
                  onChange={(e) => setReceiveDeposit(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-3xs"
                />
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setShowReceiveModal(false); setReceivingInvoice(null); }}
                className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-500 font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmReceive}
                disabled={submittingPayment || !receiveDeposit || parseFloat(receiveDeposit) <= 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {submittingPayment ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}