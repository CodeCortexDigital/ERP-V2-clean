import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Eye, DollarSign, CreditCard,
  Calendar, Users, TrendingUp, AlertCircle, CheckCircle,
  XCircle, Download, Receipt, Search, Filter, X, Save,
  FileText, Mail, BarChart3, Settings, Clock, Award,
  Percent, Send, FileDown, PieChart, Activity, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from 'sonner';
import financeService from '@/services/finance.service';
import classService from '@/services/class.service';
import studentService from '@/services/student.service';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Advanced Features State
  const [installmentPlans, setInstallmentPlans] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [studentScholarships, setStudentScholarships] = useState<any[]>([]);
  const [lateFeeRules, setLateFeeRules] = useState<any[]>([]);
  const [transactionLogs, setTransactionLogs] = useState<any[]>([]);

  // Analytics State
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [defaulters, setDefaulters] = useState<any>(null);
  const [classCollection, setClassCollection] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);

  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formType, setFormType] = useState('fee');
  const [formData, setFormData] = useState({
    fee_name: '',
    class_ref: '',
    amount: '',
    due_date: '',
    academic_year: '2026-2027',
    is_recurring: false,
    frequency: 'monthly'
  });
  const [invoiceFormData, setInvoiceFormData] = useState({
    student_id: '',
    amount: '',
    due_date: '',
    description: ''
  });
  const [invoiceFilters, setInvoiceFilters] = useState({
    status: '',
    class_id: '',
    start_date: '',
    end_date: '',
    search: ''
  });
  const [feeSearch, setFeeSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [paymentFormData, setPaymentFormData] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: '',
    notes: ''
  });

  // Advanced Forms
  const [installmentPlanForm, setInstallmentPlanForm] = useState({
    name: '',
    total_amount: '',
    number_of_installments: '',
    frequency: 'monthly',
    start_date: '',
    description: ''
  });
  const [scholarshipForm, setScholarshipForm] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    eligibility_criteria: '',
    max_students: '',
    is_active: true
  });
  const [studentScholarshipForm, setStudentScholarshipForm] = useState({
    student_id: '',
    scholarship_id: '',
    awarded_date: '',
    notes: ''
  });
  const [lateFeeRuleForm, setLateFeeRuleForm] = useState({
    name: '',
    grace_period_days: '',
    fee_type: 'percentage',
    fee_value: '',
    max_fee_amount: '',
    is_active: true
  });

  useEffect(() => {
    fetchAllData();
    fetchClasses();
    fetchStudents();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        invoiceRes, paymentRes, summaryRes,
        installmentRes, scholarshipRes, studentScholarshipRes,
        lateFeeRes, logsRes, revenueRes, defaultersRes,
        classRes, forecastRes
      ] = await Promise.all([
        financeService.getInvoices(invoiceFilters),
        financeService.getPayments(),
        financeService.getSummary(),
        financeService.getInstallmentPlans(),
        financeService.getScholarships(),
        financeService.getStudentScholarships(),
        financeService.getLateFeeRules(),
        financeService.getTransactionLogs(),
        financeService.getMonthlyRevenueChart(),
        financeService.getDefaulterReport(),
        financeService.getClassWiseCollection(),
        financeService.getFinancialForecast()
      ]);

      setInvoices(invoiceRes.data || []);
      setPayments(paymentRes.data || []);
      setSummary(summaryRes.data);
      setInstallmentPlans(installmentRes.data || []);
      setScholarships(scholarshipRes.data || []);
      setStudentScholarships(studentScholarshipRes.data || []);
      setLateFeeRules(lateFeeRes.data || []);
      setTransactionLogs(logsRes.data || []);
      setMonthlyRevenue(revenueRes.data || []);
      setDefaulters(defaultersRes.data || []);
      setClassCollection(classRes.data || []);
      setForecast(forecastRes.data?.forecast || []);
      await fetchFeeStructures({ search: feeSearch });
    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll();
      setClasses(res.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchFeeStructures = async (params = {}) => {
    try {
      const res = await financeService.getFeeStructures(params);
      setFeeStructures(res.data || []);
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    }
  };

  const fetchInvoices = async (params = {}) => {
    try {
      const res = await financeService.getInvoices(params);
      setInvoices(res.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll();
      let studentsData = [];
      if (Array.isArray(res.data)) {
        studentsData = res.data;
      } else if (res.data?.results) {
        studentsData = res.data.results;
      }
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Fee Structure CRUD
  const handleCreateFeeStructure = async () => {
    if (!formData.fee_name || !formData.class_ref || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingItem) {
        await financeService.updateFeeStructure(editingItem.id, formData);
        toast.success('Fee structure updated');
      } else {
        await financeService.createFeeStructure(formData);
        toast.success('Fee structure created');
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        fee_name: '', class_ref: '', amount: '', due_date: '',
        academic_year: '2026-2027', is_recurring: false, frequency: 'monthly'
      });
      fetchAllData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleEditFeeStructure = (fee) => {
    setEditingItem(fee);
    setFormType('fee');
    setFormData({
      fee_name: fee.fee_name,
      class_ref: fee.class_ref?.id || fee.class_ref,
      amount: fee.amount,
      due_date: fee.due_date,
      academic_year: fee.academic_year,
      is_recurring: fee.is_recurring,
      frequency: fee.frequency
    });
    setShowForm(true);
  };

  const handleDeleteFeeStructure = async (id) => {
    if (!confirm('Delete this fee structure? This will also delete related invoices.')) return;
    try {
      await financeService.deleteFeeStructure(id);
      toast.success('Fee structure deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Invoice CRUD
  const handleCreateInvoice = async () => {
    if (!invoiceFormData.student_id || !invoiceFormData.amount || !invoiceFormData.due_date) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingItem) {
        await financeService.updateInvoice(editingItem.id, invoiceFormData);
        toast.success('Invoice updated');
      } else {
        await financeService.createInvoice(invoiceFormData);
        toast.success('Invoice created');
      }
      setShowForm(false);
      setEditingItem(null);
      setInvoiceFormData({ student_id: '', amount: '', due_date: '', description: '' });
      fetchAllData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingItem(invoice);
    setFormType('invoice');
    setInvoiceFormData({
      student_id: invoice.student?.id || invoice.student || invoice.student_id,
      amount: invoice.amount,
      due_date: invoice.due_date,
      description: invoice.description || ''
    });
    setShowForm(true);
  };

  const handleDeleteInvoice = async (id) => {
    if (!confirm('Delete this invoice? This will also delete related payments.')) return;
    try {
      await financeService.deleteInvoice(id);
      toast.success('Invoice deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleInvoiceFilterChange = (field, value) => {
    setInvoiceFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyInvoiceFilters = async () => {
    await fetchInvoices(invoiceFilters);
  };

  const clearInvoiceFilters = async () => {
    setInvoiceFilters({ status: '', class_id: '', start_date: '', end_date: '', search: '' });
    setInvoiceSearch('');
    await fetchInvoices();
  };

  const handleFeeSearch = async () => {
    setFeeSearch(feeSearch);
    await fetchFeeStructures({ search: feeSearch });
  };

  const handleInvoiceSearch = async () => {
    setInvoiceFilters(prev => ({ ...prev, search: invoiceSearch }));
    await fetchInvoices({ ...invoiceFilters, search: invoiceSearch });
  };

  const handleExportInvoicesCSV = async () => {
    try {
      const response = await financeService.exportInvoicesCSV(invoiceFilters);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoices_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoices exported successfully');
    } catch (error) {
      toast.error('Failed to export invoices');
    }
  };

  const handleExportPaymentsCSV = async () => {
    try {
      const response = await financeService.exportPaymentsCSV();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Payments exported successfully');
    } catch (error) {
      toast.error('Failed to export payments');
    }
  };

  // Payment CRUD
  const handleRecordPayment = async () => {
    if (!paymentFormData.invoice_id || !paymentFormData.amount) {
      toast.error('Please select invoice and enter amount');
      return;
    }
    try {
      await financeService.createPayment(paymentFormData);
      toast.success('Payment recorded');
      setShowForm(false);
      setPaymentFormData({ invoice_id: '', amount: '', payment_method: 'cash', transaction_id: '', notes: '' });
      fetchAllData();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleDeletePayment = async (id) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      await financeService.deletePayment(id);
      toast.success('Payment deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete payment');
    }
  };



  // Installment Plan CRUD
  const handleCreateInstallmentPlan = async () => {
    if (!installmentPlanForm.name || !installmentPlanForm.total_amount || !installmentPlanForm.number_of_installments) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingItem) {
        await financeService.updateInstallmentPlan(editingItem.id, installmentPlanForm);
        toast.success('Installment plan updated');
      } else {
        await financeService.createInstallmentPlan(installmentPlanForm);
        toast.success('Installment plan created');
      }
      setShowForm(false);
      setEditingItem(null);
      setInstallmentPlanForm({
        name: '', total_amount: '', number_of_installments: '',
        frequency: 'monthly', start_date: '', description: ''
      });
      fetchAllData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleEditInstallmentPlan = (plan) => {
    setEditingItem(plan);
    setFormType('installment');
    setInstallmentPlanForm({
      name: plan.name,
      total_amount: plan.total_amount,
      number_of_installments: plan.number_of_installments,
      frequency: plan.frequency,
      start_date: plan.start_date,
      description: plan.description
    });
    setShowForm(true);
  };

  const handleDeleteInstallmentPlan = async (id) => {
    if (!confirm('Delete this installment plan?')) return;
    try {
      await financeService.deleteInstallmentPlan(id);
      toast.success('Installment plan deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Scholarship CRUD
  const handleCreateScholarship = async () => {
    if (!scholarshipForm.name || !scholarshipForm.discount_value) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingItem) {
        await financeService.updateScholarship(editingItem.id, scholarshipForm);
        toast.success('Scholarship updated');
      } else {
        await financeService.createScholarship(scholarshipForm);
        toast.success('Scholarship created');
      }
      setShowForm(false);
      setEditingItem(null);
      setScholarshipForm({
        name: '', description: '', discount_type: 'percentage',
        discount_value: '', eligibility_criteria: '', max_students: '', is_active: true
      });
      fetchAllData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleEditScholarship = (scholarship) => {
    setEditingItem(scholarship);
    setFormType('scholarship');
    setScholarshipForm({
      name: scholarship.name,
      description: scholarship.description,
      discount_type: scholarship.discount_type,
      discount_value: scholarship.discount_value,
      eligibility_criteria: scholarship.eligibility_criteria,
      max_students: scholarship.max_students,
      is_active: scholarship.is_active
    });
    setShowForm(true);
  };

  const handleDeleteScholarship = async (id) => {
    if (!confirm('Delete this scholarship?')) return;
    try {
      await financeService.deleteScholarship(id);
      toast.success('Scholarship deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Student Scholarship CRUD
  const handleCreateStudentScholarship = async () => {
    if (!studentScholarshipForm.student_id || !studentScholarshipForm.scholarship_id) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingItem) {
        await financeService.updateStudentScholarship(editingItem.id, studentScholarshipForm);
        toast.success('Student scholarship updated');
      } else {
        await financeService.createStudentScholarship(studentScholarshipForm);
        toast.success('Student scholarship created');
      }
      setShowForm(false);
      setEditingItem(null);
      setStudentScholarshipForm({
        student_id: '', scholarship_id: '', awarded_date: '', notes: ''
      });
      fetchAllData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleEditStudentScholarship = (studentScholarship) => {
    setEditingItem(studentScholarship);
    setFormType('student-scholarship');
    setStudentScholarshipForm({
      student_id: studentScholarship.student_id,
      scholarship_id: studentScholarship.scholarship_id,
      awarded_date: studentScholarship.awarded_date,
      notes: studentScholarship.notes
    });
    setShowForm(true);
  };

  const handleDeleteStudentScholarship = async (id) => {
    if (!confirm('Delete this student scholarship?')) return;
    try {
      await financeService.deleteStudentScholarship(id);
      toast.success('Student scholarship deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Late Fee Rule CRUD
  const handleCreateLateFeeRule = async () => {
    if (!lateFeeRuleForm.name || !lateFeeRuleForm.grace_period_days || !lateFeeRuleForm.fee_value) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editingItem) {
        await financeService.updateLateFeeRule(editingItem.id, lateFeeRuleForm);
        toast.success('Late fee rule updated');
      } else {
        await financeService.createLateFeeRule(lateFeeRuleForm);
        toast.success('Late fee rule created');
      }
      setShowForm(false);
      setEditingItem(null);
      setLateFeeRuleForm({
        name: '', grace_period_days: '', fee_type: 'percentage',
        fee_value: '', max_fee_amount: '', is_active: true
      });
      fetchAllData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleEditLateFeeRule = (rule) => {
    setEditingItem(rule);
    setFormType('late-fee-rule');
    setLateFeeRuleForm({
      name: rule.name,
      grace_period_days: rule.grace_period_days,
      fee_type: rule.fee_type,
      fee_value: rule.fee_value,
      max_fee_amount: rule.max_fee_amount,
      is_active: rule.is_active
    });
    setShowForm(true);
  };

  const handleDeleteLateFeeRule = async (id) => {
    if (!confirm('Delete this late fee rule?')) return;
    try {
      await financeService.deleteLateFeeRule(id);
      toast.success('Late fee rule deleted');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Actions
  const handleCreateInstallments = async (invoiceId) => {
    try {
      await financeService.createInstallmentInvoice(invoiceId);
      toast.success('Installments created successfully');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to create installments');
    }
  };

  const handleApplyScholarship = async (invoiceId, scholarshipId) => {
    try {
      await financeService.applyScholarshipToInvoice(invoiceId, { scholarship_id: scholarshipId });
      toast.success('Scholarship applied successfully');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to apply scholarship');
    }
  };

  // PDF Generation
  const handleGenerateInvoicePDF = async (invoiceId) => {
    try {
      const response = await financeService.generateInvoicePDF(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleGenerateDefaulterReportPDF = async () => {
    try {
      const response = await financeService.generateDefaulterReportPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'defaulter_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Defaulter report PDF downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleGenerateMonthlyReportPDF = async () => {
    try {
      const response = await financeService.generateMonthlyFinanceReportPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'monthly_finance_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Monthly report PDF downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  // Email Communication
  const handleSendFeeReminder = async (invoiceId) => {
    try {
      await financeService.sendFeeReminder(invoiceId);
      toast.success('Fee reminder sent successfully');
    } catch (error) {
      toast.error('Failed to send reminder');
    }
  };

  const handleSendPaymentConfirmation = async (paymentId) => {
    try {
      await financeService.sendPaymentConfirmation(paymentId);
      toast.success('Payment confirmation sent successfully');
    } catch (error) {
      toast.error('Failed to send confirmation');
    }
  };

  const handleSendDefaulterNotice = async (invoiceId) => {
    try {
      await financeService.sendDefaulterNotice(invoiceId);
      toast.success('Defaulter notice sent successfully');
    } catch (error) {
      toast.error('Failed to send notice');
    }
  };

  const handleSendDefaulterWhatsAppNotice = async (invoiceId) => {
    try {
      await financeService.sendDefaulterWhatsAppNotice(invoiceId);
      toast.success('WhatsApp defaulter notice queued successfully');
    } catch (error) {
      toast.error('Failed to queue WhatsApp notice');
    }
  };

  const handleBulkSendReminders = async () => {
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').map(inv => inv.id);
    if (overdueInvoices.length === 0) {
      toast.error('No overdue invoices found');
      return;
    }
    try {
      await financeService.bulkSendReminders({ invoice_ids: overdueInvoices });
      toast.success(`Reminders sent to ${overdueInvoices.length} students`);
    } catch (error) {
      toast.error('Failed to send bulk reminders');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid': return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'overdue': return <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</Badge>;
      case 'issued': return <Badge variant="warning">Issued</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method) => {
    const methods = {
      cash: '💰 Cash',
      bank_transfer: '🏦 Bank Transfer',
      credit_card: '💳 Credit Card',
      cheque: '📝 Cheque',
      online: '🌐 Online'
    };
    return methods[method] || method;
  };

  const getDiscountTypeBadge = (type) => {
    return type === 'percentage' ? <Badge variant="info">📊 %</Badge> : <Badge variant="success">💵 $</Badge>;
  };

  const getFeeTypeBadge = (type) => {
    return type === 'percentage' ? <Badge variant="warning">📈 %</Badge> : <Badge variant="danger">💰 $</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Finance Management</h1>
          <p className="text-gray-500">Complete financial management system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setFormType('fee'); setEditingItem(null); setFormData({ fee_name: '', class_ref: '', amount: '', due_date: '', academic_year: '2026-2027', is_recurring: false, frequency: 'monthly' }); setShowForm(true); }} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Fee Structure
          </Button>
          <Button onClick={() => { setFormType('invoice'); setEditingItem(null); setInvoiceFormData({ student_id: '', amount: '', due_date: '', description: '' }); setShowForm(true); }} size="sm" variant="outline">
            <Receipt className="w-4 h-4 mr-2" /> Invoice
          </Button>
          <Button onClick={handleBulkSendReminders} size="sm" variant="outline">
            <Send className="w-4 h-4 mr-2" /> Bulk Reminders
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600" /><span className="text-xs text-gray-600">Total Amount</span></div>
            <p className="text-xl font-bold text-blue-700">${summary.total_amount?.toFixed(2) || 0}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-gray-600">Collected</span></div>
            <p className="text-xl font-bold text-green-700">${summary.total_paid?.toFixed(2) || 0}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-xs text-gray-600">Balance Due</span></div>
            <p className="text-xl font-bold text-red-700">${summary.balance_due?.toFixed(2) || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-600" /><span className="text-xs text-gray-600">Collection Rate</span></div>
            <p className="text-xl font-bold text-purple-700">{summary.collection_rate || 0}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="fee-structures">💰 Fees</TabsTrigger>
          <TabsTrigger value="invoices">📄 Invoices</TabsTrigger>
          <TabsTrigger value="payments">💳 Payments</TabsTrigger>
          <TabsTrigger value="installments">📅 Installments</TabsTrigger>
          <TabsTrigger value="scholarships">🎓 Scholarships</TabsTrigger>
          <TabsTrigger value="late-fees">⚠️ Late Fees</TabsTrigger>
          <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
          <TabsTrigger value="reports">📋 Reports</TabsTrigger>
          <TabsTrigger value="communication">📧 Communication</TabsTrigger>
          <TabsTrigger value="audit">🔍 Audit</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Students:</span>
                    <span className="font-semibold">{students.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Invoices:</span>
                    <span className="font-semibold">{invoices.filter(i => i.status !== 'paid').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overdue:</span>
                    <span className="font-semibold text-red-600">{defaulters.total_defaulters || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scholarships:</span>
                    <span className="font-semibold">{studentScholarships.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monthlyRevenue.slice(-3).map((month, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{month.month}</span>
                      <span className="font-semibold">${month.revenue}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactionLogs.slice(0, 5).map((log, index) => (
                    <div key={index} className="text-sm">
                      <div className="font-medium">{log.action.replace('_', ' ')}</div>
                      <div className="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fee Structures Tab */}
        <TabsContent value="fee-structures">
          <div className="flex flex-col gap-4 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Fee Structures</h2>
            <Button onClick={() => { setFormType('fee'); setEditingItem(null); setFormData({ fee_name: '', class_ref: '', amount: '', due_date: '', academic_year: '2026-2027', is_recurring: false, frequency: 'monthly' }); setShowForm(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Fee Structure
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Input value={feeSearch} onChange={(e) => setFeeSearch(e.target.value)} placeholder="Search fee structures..." className="min-w-[240px]" />
            <select className="border rounded-lg px-3 py-2" value={''} onChange={(e) => fetchFeeStructures({ search: feeSearch, class_id: e.target.value })}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button onClick={handleFeeSearch} size="sm" variant="outline">Search</Button>
            <Button onClick={() => { setFeeSearch(''); fetchFeeStructures(); }} size="sm" variant="outline">Reset</Button>
          </div>
        </div>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Fee Name</th>
                  <th className="p-3 text-left">Class</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-left">Recurring</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeStructures.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No fee structures created</td></tr>
                ) : (
                  feeStructures.map((fee) => (
                    <tr key={fee.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{fee.fee_name}</td>
                      <td className="p-3">{fee.class_name || fee.class_ref}</td>
                      <td className="p-3 font-semibold text-green-600">${fee.amount}</td>
                      <td className="p-3">{fee.due_date}</td>
                      <td className="p-3">{fee.is_recurring ? `✅ ${fee.frequency}` : '❌ No'}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEditFeeStructure(fee)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteFeeStructure(fee.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                       </td>
                     </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <div className="flex gap-2">
                <Button onClick={() => { setFormType('invoice'); setEditingItem(null); setInvoiceFormData({ student_id: '', amount: '', due_date: '', description: '' }); setShowForm(true); }} size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Create Invoice
                </Button>
                <Button onClick={handleGenerateDefaulterReportPDF} size="sm" variant="outline">
                  <FileDown className="w-4 h-4 mr-2" /> Defaulter Report
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5 items-end">
              <Input value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="Search invoices..." className="min-w-[240px]" />
              <select className="border rounded-lg px-3 py-2" value={invoiceFilters.status} onChange={(e) => handleInvoiceFilterChange('status', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="issued">Issued</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="border rounded-lg px-3 py-2" value={invoiceFilters.class_id} onChange={(e) => handleInvoiceFilterChange('class_id', e.target.value)}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Input type="date" value={invoiceFilters.start_date} onChange={(e) => handleInvoiceFilterChange('start_date', e.target.value)} />
              <Input type="date" value={invoiceFilters.end_date} onChange={(e) => handleInvoiceFilterChange('end_date', e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInvoiceSearch} size="sm" variant="outline">Search</Button>
              <Button onClick={applyInvoiceFilters} size="sm" variant="outline">Apply Filters</Button>
              <Button onClick={clearInvoiceFilters} size="sm" variant="outline">Reset</Button>
            </div>
          </div>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Invoice #</th>
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Paid</th>
                  <th className="p-3 text-left">Due Date</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No invoices generated</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="p-3">{inv.student_name}</td>
                      <td className="p-3">${inv.amount}</td>
                      <td className="p-3">${inv.paid_amount || 0}</td>
                      <td className="p-3">{inv.due_date}</td>
                      <td className="p-3">{getStatusBadge(inv.status)}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleGenerateInvoicePDF(inv.id)} className="p-1 text-purple-600 hover:bg-purple-100 rounded" title="Download PDF">
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleSendFeeReminder(inv.id)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Send Reminder">
                            <Mail className="w-4 h-4" />
                          </button>
                          {inv.status === 'overdue' && (
                            <>
                              <button onClick={() => handleSendDefaulterNotice(inv.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Send Notice">
                                <AlertCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleSendDefaulterWhatsAppNotice(inv.id)} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded" title="Send WhatsApp Notice">
                                <Zap className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(inv.status === 'issued' || inv.status === 'overdue') && (
                            <button onClick={() => { setFormType('payment'); setPaymentFormData({ invoice_id: inv.id, amount: String(inv.amount - (inv.paid_amount || 0)), payment_method: 'cash', transaction_id: '', notes: '' }); setShowForm(true); }} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Record Payment">
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleEditInvoice(inv)} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInvoice(inv.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Payments</h2>
            <Button onClick={() => { setFormType('payment'); setShowForm(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Method</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No payments recorded</td></tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{payment.invoice_number}</td>
                      <td className="p-3">{payment.student_name}</td>
                      <td className="p-3 font-semibold text-green-600">${payment.amount}</td>
                      <td className="p-3">{payment.payment_date}</td>
                      <td className="p-3">{getPaymentMethodBadge(payment.payment_method)}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleSendPaymentConfirmation(payment.id)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Send Confirmation">
                            <Mail className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeletePayment(payment.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Installments Tab */}
        <TabsContent value="installments">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Installment Plans</h2>
            <Button onClick={() => { setFormType('installment'); setEditingItem(null); setInstallmentPlanForm({ name: '', total_amount: '', number_of_installments: '', frequency: 'monthly', start_date: '', description: '' }); setShowForm(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Create Plan
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Plan Name</th>
                  <th className="p-3 text-left">Total Amount</th>
                  <th className="p-3 text-left">Installments</th>
                  <th className="p-3 text-left">Frequency</th>
                  <th className="p-3 text-left">Start Date</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {installmentPlans.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500">No installment plans created</td></tr>
                ) : (
                  installmentPlans.map((plan) => (
                    <tr key={plan.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{plan.name}</td>
                      <td className="p-3 font-semibold text-green-600">${plan.total_amount}</td>
                      <td className="p-3">{plan.number_of_installments}</td>
                      <td className="p-3">{plan.frequency}</td>
                      <td className="p-3">{plan.start_date}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEditInstallmentPlan(plan)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteInstallmentPlan(plan.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Scholarships Tab */}
        <TabsContent value="scholarships">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Scholarships & Student Scholarships</h2>
            <div className="flex gap-2">
              <Button onClick={() => { setFormType('scholarship'); setEditingItem(null); setScholarshipForm({ name: '', description: '', discount_type: 'percentage', discount_value: '', eligibility_criteria: '', max_students: '', is_active: true }); setShowForm(true); }} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Scholarship
              </Button>
              <Button onClick={() => { setFormType('student-scholarship'); setEditingItem(null); setStudentScholarshipForm({ student_id: '', scholarship_id: '', awarded_date: '', notes: '' }); setShowForm(true); }} size="sm" variant="outline">
                <Award className="w-4 h-4 mr-2" /> Award Scholarship
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scholarships */}
            <div>
              <h3 className="text-md font-semibold mb-3">Available Scholarships</h3>
              <div className="space-y-3">
                {scholarships.map((scholarship) => (
                  <div key={scholarship.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{scholarship.name}</h4>
                        <p className="text-sm text-gray-600">{scholarship.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getDiscountTypeBadge(scholarship.discount_type)}
                          <span className="text-sm font-semibold">
                            {scholarship.discount_type === 'percentage' ? `${scholarship.discount_value}%` : `$${scholarship.discount_value}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditScholarship(scholarship)} className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteScholarship(scholarship.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Scholarships */}
            <div>
              <h3 className="text-md font-semibold mb-3">Awarded Scholarships</h3>
              <div className="space-y-3">
                {studentScholarships.map((studentScholarship) => (
                  <div key={studentScholarship.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{studentScholarship.student_name}</h4>
                        <p className="text-sm text-gray-600">{studentScholarship.scholarship_name}</p>
                        <p className="text-xs text-gray-500">Awarded: {studentScholarship.awarded_date}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditStudentScholarship(studentScholarship)} className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteStudentScholarship(studentScholarship.id)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Late Fees Tab */}
        <TabsContent value="late-fees">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Late Fee Rules</h2>
            <Button onClick={() => { setFormType('late-fee-rule'); setEditingItem(null); setLateFeeRuleForm({ name: '', grace_period_days: '', fee_type: 'percentage', fee_value: '', max_fee_amount: '', is_active: true }); setShowForm(true); }} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Add Rule
            </Button>
          </div>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Rule Name</th>
                  <th className="p-3 text-left">Grace Period</th>
                  <th className="p-3 text-left">Fee Type</th>
                  <th className="p-3 text-left">Fee Value</th>
                  <th className="p-3 text-left">Max Fee</th>
                  <th className="p-3 text-left">Active</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lateFeeRules.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No late fee rules configured</td></tr>
                ) : (
                  lateFeeRules.map((rule) => (
                    <tr key={rule.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{rule.name}</td>
                      <td className="p-3">{rule.grace_period_days} days</td>
                      <td className="p-3">{getFeeTypeBadge(rule.fee_type)}</td>
                      <td className="p-3">{rule.fee_type === 'percentage' ? `${rule.fee_value}%` : `$${rule.fee_value}`}</td>
                      <td className="p-3">{rule.max_fee_amount ? `$${rule.max_fee_amount}` : '-'}</td>
                      <td className="p-3">{rule.is_active ? '✅' : '❌'}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEditLateFeeRule(rule)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteLateFeeRule(rule.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Monthly Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monthlyRevenue.map((month) => (
                    <div key={month.month} className="flex justify-between items-center">
                      <span className="text-sm">{month.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: `${Math.min((month.revenue / 10000) * 100, 100)}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold">${month.revenue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Class-wise Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {classCollection.map((cls) => (
                    <div key={cls.class_name} className="flex justify-between items-center">
                      <span className="text-sm">{cls.class_name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: `${cls.collection_rate}%`}}></div>
                        </div>
                        <span className="text-sm font-semibold">{cls.collection_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {forecast.map((f) => (
                    <div key={f.month} className="flex justify-between items-center">
                      <span className="text-sm">{f.month}</span>
                      <span className="text-sm font-semibold text-blue-600">${f.forecasted_revenue}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Defaulters Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Defaulters:</span>
                    <span className="font-semibold text-red-600">{defaulters.total_defaulters || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount Due:</span>
                    <span className="font-semibold">${defaulters.total_amount_due?.toFixed(2) || 0}</span>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Top Defaulters:</h4>
                    <div className="space-y-1">
                      {defaulters.defaulters?.slice(0, 5).map((defaulter, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{defaulter.student_name}</span>
                          <span className="text-red-600">${defaulter.amount_due}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button onClick={handleGenerateDefaulterReportPDF} className="w-full" variant="outline">
                    <FileDown className="w-4 h-4 mr-2" />
                    Defaulter Report PDF
                  </Button>
                  <Button onClick={handleGenerateMonthlyReportPDF} className="w-full" variant="outline">
                    <FileDown className="w-4 h-4 mr-2" />
                    Monthly Report PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button onClick={handleExportInvoicesCSV} className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Invoices CSV
                  </Button>
                  <Button onClick={handleExportPaymentsCSV} className="w-full" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Payments CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button onClick={handleBulkSendReminders} className="w-full" variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    Send Bulk Reminders
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Zap className="w-4 h-4 mr-2" />
                    Generate All Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Communication Tab */}
        <TabsContent value="communication">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">📧 Fee Payment Reminder</h4>
                    <p className="text-sm text-gray-600">Send polite reminders for upcoming due dates</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">✅ Payment Confirmation</h4>
                    <p className="text-sm text-gray-600">Confirm successful payment receipt</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">⚠️ Defaulter Notice</h4>
                    <p className="text-sm text-gray-600">Formal notice for overdue payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Communication Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button onClick={handleBulkSendReminders} className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Bulk Fee Reminders
                  </Button>
                  <div className="text-sm text-gray-600">
                    <p>• Automatically sends to all students with overdue invoices</p>
                    <p>• Includes payment instructions and due dates</p>
                    <p>• Tracks communication history</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Transaction Audit Log</h2>
          </div>
          <div className="overflow-x-auto border rounded-xl bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Timestamp</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Model</th>
                  <th className="p-3 text-left">User</th>
                  <th className="p-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {transactionLogs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500">No audit logs available</td></tr>
                ) : (
                  transactionLogs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={log.action.includes('delete') ? 'danger' : log.action.includes('create') ? 'success' : 'warning'}>
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">{log.model_name}</td>
                      <td className="p-3">{log.user_name || 'System'}</td>
                      <td className="p-3 text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">School Name</label>
                    <Input placeholder="Enter school name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Due Date Grace Period</label>
                    <Input type="number" placeholder="Days" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Auto-send Reminders</label>
                    <select className="w-full border rounded-lg px-3 py-2">
                      <option>Disabled</option>
                      <option>7 days before due date</option>
                      <option>3 days before due date</option>
                      <option>On due date</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  Default Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Default Late Fee (%)</label>
                    <Input type="number" placeholder="2.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Grace Period (Days)</label>
                    <Input type="number" placeholder="7" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Academic Year</label>
                    <Input placeholder="2026-2027" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {formType === 'fee' ? (editingItem ? 'Edit Fee Structure' : 'Add Fee Structure') :
                 formType === 'invoice' ? (editingItem ? 'Edit Invoice' : 'Create Invoice') :
                 formType === 'payment' ? 'Record Payment' :
                 formType === 'installment' ? (editingItem ? 'Edit Installment Plan' : 'Create Installment Plan') :
                 formType === 'scholarship' ? (editingItem ? 'Edit Scholarship' : 'Create Scholarship') :
                 formType === 'student-scholarship' ? (editingItem ? 'Edit Student Scholarship' : 'Award Scholarship') :
                 formType === 'late-fee-rule' ? (editingItem ? 'Edit Late Fee Rule' : 'Create Late Fee Rule') :
                 'Form'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }}><X className="w-5 h-5" /></button>
            </div>

            {/* Fee Structure Form */}
            {formType === 'fee' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Fee Name *" value={formData.fee_name} onChange={(e) => setFormData({...formData, fee_name: e.target.value})} />
                  <select className="w-full border rounded-lg px-3 py-2" value={formData.class_ref} onChange={(e) => setFormData({...formData, class_ref: e.target.value})}>
                    <option value="">Select Class *</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Amount *" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                  <Input type="date" placeholder="Due Date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.is_recurring} onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})} />
                    Recurring Fee
                  </label>
                  {formData.is_recurring && (
                    <select className="border rounded-lg px-3 py-2" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})}>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  )}
                </div>
                <Button onClick={handleCreateFeeStructure} className="w-full">{editingItem ? 'Update' : 'Create'} Fee Structure</Button>
              </div>
            )}

            {/* Invoice Form */}
            {formType === 'invoice' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full border rounded-lg px-3 py-2" value={invoiceFormData.student_id} onChange={(e) => setInvoiceFormData({...invoiceFormData, student_id: e.target.value})}>
                    <option value="">Select Student *</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
                  </select>
                  <Input type="number" placeholder="Amount *" value={invoiceFormData.amount} onChange={(e) => setInvoiceFormData({...invoiceFormData, amount: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" placeholder="Due Date *" value={invoiceFormData.due_date} onChange={(e) => setInvoiceFormData({...invoiceFormData, due_date: e.target.value})} />
                  <div></div>
                </div>
                <textarea placeholder="Description" className="w-full border rounded-lg px-3 py-2" rows={3} value={invoiceFormData.description} onChange={(e) => setInvoiceFormData({...invoiceFormData, description: e.target.value})} />
                <Button onClick={handleCreateInvoice} className="w-full">{editingItem ? 'Update' : 'Create'} Invoice</Button>
              </div>
            )}

            {/* Payment Form */}
            {formType === 'payment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full border rounded-lg px-3 py-2" value={paymentFormData.invoice_id} onChange={(e) => setPaymentFormData({...paymentFormData, invoice_id: e.target.value})}>
                    <option value="">Select Invoice *</option>
                    {invoices.filter(i => i.status !== 'paid').map(i => <option key={i.id} value={i.id}>{i.invoice_number} - ${i.amount} ({i.student_name})</option>)}
                  </select>
                  <Input type="number" placeholder="Amount *" value={paymentFormData.amount} onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full border rounded-lg px-3 py-2" value={paymentFormData.payment_method} onChange={(e) => setPaymentFormData({...paymentFormData, payment_method: e.target.value})}>
                    <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option><option value="cheque">Cheque</option><option value="online">Online</option>
                  </select>
                  <Input placeholder="Transaction ID" value={paymentFormData.transaction_id} onChange={(e) => setPaymentFormData({...paymentFormData, transaction_id: e.target.value})} />
                </div>
                <textarea placeholder="Notes" className="w-full border rounded-lg px-3 py-2" rows={2} value={paymentFormData.notes} onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})} />
                <Button onClick={handleRecordPayment} className="w-full">Record Payment</Button>
              </div>
            )}

            {/* Installment Plan Form */}
            {formType === 'installment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Plan Name *" value={installmentPlanForm.name} onChange={(e) => setInstallmentPlanForm({...installmentPlanForm, name: e.target.value})} />
                  <Input type="number" placeholder="Total Amount *" value={installmentPlanForm.total_amount} onChange={(e) => setInstallmentPlanForm({...installmentPlanForm, total_amount: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Number of Installments *" value={installmentPlanForm.number_of_installments} onChange={(e) => setInstallmentPlanForm({...installmentPlanForm, number_of_installments: e.target.value})} />
                  <select className="w-full border rounded-lg px-3 py-2" value={installmentPlanForm.frequency} onChange={(e) => setInstallmentPlanForm({...installmentPlanForm, frequency: e.target.value})}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" placeholder="Start Date *" value={installmentPlanForm.start_date} onChange={(e) => setInstallmentPlanForm({...installmentPlanForm, start_date: e.target.value})} />
                  <div></div>
                </div>
                <textarea placeholder="Description" className="w-full border rounded-lg px-3 py-2" rows={2} value={installmentPlanForm.description} onChange={(e) => setInstallmentPlanForm({...installmentPlanForm, description: e.target.value})} />
                <Button onClick={handleCreateInstallmentPlan} className="w-full">{editingItem ? 'Update' : 'Create'} Installment Plan</Button>
              </div>
            )}

            {/* Scholarship Form */}
            {formType === 'scholarship' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Scholarship Name *" value={scholarshipForm.name} onChange={(e) => setScholarshipForm({...scholarshipForm, name: e.target.value})} />
                  <select className="w-full border rounded-lg px-3 py-2" value={scholarshipForm.discount_type} onChange={(e) => setScholarshipForm({...scholarshipForm, discount_type: e.target.value})}>
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder={`Discount Value * (${scholarshipForm.discount_type === 'percentage' ? '%' : '$'})`} value={scholarshipForm.discount_value} onChange={(e) => setScholarshipForm({...scholarshipForm, discount_value: e.target.value})} />
                  <Input type="number" placeholder="Max Students" value={scholarshipForm.max_students} onChange={(e) => setScholarshipForm({...scholarshipForm, max_students: e.target.value})} />
                </div>
                <textarea placeholder="Eligibility Criteria" className="w-full border rounded-lg px-3 py-2" rows={2} value={scholarshipForm.eligibility_criteria} onChange={(e) => setScholarshipForm({...scholarshipForm, eligibility_criteria: e.target.value})} />
                <textarea placeholder="Description" className="w-full border rounded-lg px-3 py-2" rows={2} value={scholarshipForm.description} onChange={(e) => setScholarshipForm({...scholarshipForm, description: e.target.value})} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={scholarshipForm.is_active} onChange={(e) => setScholarshipForm({...scholarshipForm, is_active: e.target.checked})} />
                  Active Scholarship
                </label>
                <Button onClick={handleCreateScholarship} className="w-full">{editingItem ? 'Update' : 'Create'} Scholarship</Button>
              </div>
            )}

            {/* Student Scholarship Form */}
            {formType === 'student-scholarship' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full border rounded-lg px-3 py-2" value={studentScholarshipForm.student_id} onChange={(e) => setStudentScholarshipForm({...studentScholarshipForm, student_id: e.target.value})}>
                    <option value="">Select Student *</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
                  </select>
                  <select className="w-full border rounded-lg px-3 py-2" value={studentScholarshipForm.scholarship_id} onChange={(e) => setStudentScholarshipForm({...studentScholarshipForm, scholarship_id: e.target.value})}>
                    <option value="">Select Scholarship *</option>
                    {scholarships.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name} ({s.discount_type === 'percentage' ? `${s.discount_value}%` : `$${s.discount_value}`})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" placeholder="Awarded Date *" value={studentScholarshipForm.awarded_date} onChange={(e) => setStudentScholarshipForm({...studentScholarshipForm, awarded_date: e.target.value})} />
                  <div></div>
                </div>
                <textarea placeholder="Notes" className="w-full border rounded-lg px-3 py-2" rows={2} value={studentScholarshipForm.notes} onChange={(e) => setStudentScholarshipForm({...studentScholarshipForm, notes: e.target.value})} />
                <Button onClick={handleCreateStudentScholarship} className="w-full">{editingItem ? 'Update' : 'Award'} Scholarship</Button>
              </div>
            )}

            {/* Late Fee Rule Form */}
            {formType === 'late-fee-rule' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Rule Name *" value={lateFeeRuleForm.name} onChange={(e) => setLateFeeRuleForm({...lateFeeRuleForm, name: e.target.value})} />
                  <Input type="number" placeholder="Grace Period (Days) *" value={lateFeeRuleForm.grace_period_days} onChange={(e) => setLateFeeRuleForm({...lateFeeRuleForm, grace_period_days: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full border rounded-lg px-3 py-2" value={lateFeeRuleForm.fee_type} onChange={(e) => setLateFeeRuleForm({...lateFeeRuleForm, fee_type: e.target.value})}>
                    <option value="percentage">Percentage Fee</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                  <Input type="number" placeholder={`Fee Value * (${lateFeeRuleForm.fee_type === 'percentage' ? '%' : '$'})`} value={lateFeeRuleForm.fee_value} onChange={(e) => setLateFeeRuleForm({...lateFeeRuleForm, fee_value: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" placeholder="Max Fee Amount ($)" value={lateFeeRuleForm.max_fee_amount} onChange={(e) => setLateFeeRuleForm({...lateFeeRuleForm, max_fee_amount: e.target.value})} />
                  <div></div>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={lateFeeRuleForm.is_active} onChange={(e) => setLateFeeRuleForm({...lateFeeRuleForm, is_active: e.target.checked})} />
                  Active Rule
                </label>
                <Button onClick={handleCreateLateFeeRule} className="w-full">{editingItem ? 'Update' : 'Create'} Late Fee Rule</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Payment Button */}
      {activeTab === 'invoices' && invoices.filter(i => i.status !== 'paid').length > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button onClick={() => { setFormType('payment'); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 rounded-full shadow-lg">
            <CreditCard className="w-5 h-5 mr-2" /> Record Payment
          </Button>
        </div>
      )}
    </div>
  );
}
