import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Eye, DollarSign, CreditCard, 
  Calendar, Users, TrendingUp, AlertCircle, CheckCircle,
  XCircle, Download, Receipt, Search, Filter, X, Save
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
  const [activeTab, setActiveTab] = useState('fee-structures');
  const [feeStructures, setFeeStructures] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  
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
  const [paymentFormData, setPaymentFormData] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchAllData();
    fetchClasses();
    fetchStudents();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [feeRes, invoiceRes, paymentRes, summaryRes] = await Promise.all([
        financeService.getFeeStructures(),
        financeService.getInvoices(),
        financeService.getPayments(),
        financeService.getSummary()
      ]);
      setFeeStructures(feeRes.data || []);
      setInvoices(invoiceRes.data || []);
      setPayments(paymentRes.data || []);
      setSummary(summaryRes.data);
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
      class_ref: fee.class_ref,
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
      student_id: invoice.student,
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
          <p className="text-gray-500">Manage fee structures, invoices, and payments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setFormType('fee'); setEditingItem(null); setFormData({ fee_name: '', class_ref: '', amount: '', due_date: '', academic_year: '2026-2027', is_recurring: false, frequency: 'monthly' }); setShowForm(true); }} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add Fee Structure
          </Button>
          <Button onClick={() => { setFormType('invoice'); setEditingItem(null); setInvoiceFormData({ student_id: '', amount: '', due_date: '', description: '' }); setShowForm(true); }} size="sm" variant="outline">
            <Receipt className="w-4 h-4 mr-2" /> Create Invoice
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fee-structures">💰 Fee Structures</TabsTrigger>
          <TabsTrigger value="invoices">📄 Invoices</TabsTrigger>
          <TabsTrigger value="payments">💳 Payments</TabsTrigger>
        </TabsList>

        {/* Fee Structures Tab */}
        <TabsContent value="fee-structures">
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
                          <button onClick={() => handleEditInvoice(inv)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
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
                        <button onClick={() => handleDeletePayment(payment.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {formType === 'fee' ? (editingItem ? 'Edit Fee Structure' : 'Add Fee Structure') : 
                 formType === 'invoice' ? (editingItem ? 'Edit Invoice' : 'Create Invoice') : 
                 'Record Payment'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); }}><X className="w-5 h-5" /></button>
            </div>
            
            {formType === 'fee' && (
              <div className="space-y-4">
                <Input placeholder="Fee Name *" value={formData.fee_name} onChange={(e) => setFormData({...formData, fee_name: e.target.value})} />
                <select className="w-full border rounded-lg px-3 py-2" value={formData.class_ref} onChange={(e) => setFormData({...formData, class_ref: e.target.value})}>
                  <option value="">Select Class *</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="number" placeholder="Amount *" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                <Input type="date" placeholder="Due Date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_recurring} onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})} /> Recurring</label>
                <Button onClick={handleCreateFeeStructure} className="w-full">{editingItem ? 'Update' : 'Create'} Fee Structure</Button>
              </div>
            )}
            
            {formType === 'invoice' && (
              <div className="space-y-4">
                <select className="w-full border rounded-lg px-3 py-2" value={invoiceFormData.student_id} onChange={(e) => setInvoiceFormData({...invoiceFormData, student_id: e.target.value})}>
                  <option value="">Select Student *</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
                </select>
                <Input type="number" placeholder="Amount *" value={invoiceFormData.amount} onChange={(e) => setInvoiceFormData({...invoiceFormData, amount: e.target.value})} />
                <Input type="date" placeholder="Due Date *" value={invoiceFormData.due_date} onChange={(e) => setInvoiceFormData({...invoiceFormData, due_date: e.target.value})} />
                <textarea placeholder="Description" className="w-full border rounded-lg px-3 py-2" rows={3} value={invoiceFormData.description} onChange={(e) => setInvoiceFormData({...invoiceFormData, description: e.target.value})} />
                <Button onClick={handleCreateInvoice} className="w-full">{editingItem ? 'Update' : 'Create'} Invoice</Button>
              </div>
            )}
            
            {formType === 'payment' && (
              <div className="space-y-4">
                <select className="w-full border rounded-lg px-3 py-2" value={paymentFormData.invoice_id} onChange={(e) => setPaymentFormData({...paymentFormData, invoice_id: e.target.value})}>
                  <option value="">Select Invoice *</option>
                  {invoices.filter(i => i.status !== 'paid').map(i => <option key={i.id} value={i.id}>{i.invoice_number} - ${i.amount} ({i.student_name})</option>)}
                </select>
                <Input type="number" placeholder="Amount *" value={paymentFormData.amount} onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})} />
                <select className="w-full border rounded-lg px-3 py-2" value={paymentFormData.payment_method} onChange={(e) => setPaymentFormData({...paymentFormData, payment_method: e.target.value})}>
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option><option value="cheque">Cheque</option><option value="online">Online</option>
                </select>
                <Input placeholder="Transaction ID" value={paymentFormData.transaction_id} onChange={(e) => setPaymentFormData({...paymentFormData, transaction_id: e.target.value})} />
                <Button onClick={handleRecordPayment} className="w-full">Record Payment</Button>
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
