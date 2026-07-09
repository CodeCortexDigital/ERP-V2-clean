import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, Trash2, ShieldAlert, CheckSquare, Square, Filter } from 'lucide-react';
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
  fine_after_due_date: number;
  bank_name: string;
  status: 'unpaid' | 'paid';
  description: string;
  created_at: string;
  paid_amount?: number;
  remaining_balance?: number;
}

export default function DeleteFeesPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feeMonth, setFeeMonth] = useState('June 2026');
  const [filterClass, setFilterClass] = useState('All Classes');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const sRes = await studentService.getAll().catch(() => ({ data: [] }));
      const rawStudents = extractListData<any>(sRes.data || []);
      setStudents(rawStudents);

      const res = await financeService.getInvoices().catch(() => ({ data: [] }));
      setInvoices(extractListData<any>(res.data || []));
    } catch (e) {
      console.error(e);
    }
  };

  // Filter invoices matching month & class
  const filteredInvoices = invoices.filter(inv => {
    const isMonthMatch = inv.fee_month.toLowerCase().trim() === feeMonth.toLowerCase().trim();
    if (!isMonthMatch) return false;

    const isClassMatch = filterClass === 'All Classes' || inv.class_name.toLowerCase().trim() === filterClass.toLowerCase().trim();
    return isClassMatch;
  });

  const uniqueClasses: string[] = [];
  invoices.forEach(inv => {
    if (inv.class_name && !uniqueClasses.includes(inv.class_name)) {
      uniqueClasses.push(inv.class_name);
    }
  });

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(inv => inv.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one invoice to delete');
      return;
    }

    const confirmDel = window.confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected generated invoice(s)? This action cannot be undone.`);
    if (!confirmDel) return;

    setLoading(true);
    try {
      await Promise.all(selectedIds.map(id => financeService.deleteInvoice(id).catch(() => undefined)));
      const updated = invoices.filter(inv => !selectedIds.includes(inv.id));
      setInvoices(updated);
      setSelectedIds([]);
      toast.success(`Successfully deleted ${selectedIds.length} invoice(s)!`);
    } catch (e) {
      toast.error('Failed to delete invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllMatching = async () => {
    if (filteredInvoices.length === 0) {
      toast.info('No invoices found matching criteria');
      return;
    }

    const confirmDel = window.confirm(`DANGER: Are you sure you want to permanently delete ALL ${filteredInvoices.length} invoices matching ${feeMonth} - ${filterClass}?`);
    if (!confirmDel) return;

    setLoading(true);
    try {
      const matchingIds = filteredInvoices.map(inv => inv.id);
      await Promise.all(matchingIds.map(id => financeService.deleteInvoice(id).catch(() => undefined)));
      const updated = invoices.filter(inv => !matchingIds.includes(inv.id));
      setInvoices(updated);
      setSelectedIds([]);
      toast.success(`Successfully deleted all ${filteredInvoices.length} matching invoices!`);
    } catch (e) {
      toast.error('Failed to delete invoices');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Fees</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Delete Fees Invoices</span>
        </div>
      </div>

      {/* Warning Box */}
      <div className="bg-rose-50 border border-rose-150 p-4 rounded-2xl flex items-start gap-3 text-rose-800">
        <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm text-rose-900 uppercase tracking-wide">Danger Zone</h4>
          <p className="text-xs leading-relaxed font-semibold text-rose-700">
            Deleting invoices permanently removes them from the database. Unpaid, paid, and partial collection records associated with these invoices will be removed. Please proceed with caution.
          </p>
        </div>
      </div>

      {/* Control Filter Panel Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEES MONTH</label>
            <input
              type="text"
              value={feeMonth}
              onChange={(e) => {
                setFeeMonth(e.target.value);
                setSelectedIds([]);
              }}
              placeholder="June 2026"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">CLASS</label>
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setSelectedIds([]);
              }}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            >
              <option value="All Classes">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={loading || selectedIds.length === 0}
              className="flex-1 h-11 bg-rose-650 hover:bg-rose-750 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
            </button>
            <button
              onClick={handleDeleteAllMatching}
              disabled={loading || filteredInvoices.length === 0}
              className="h-11 px-4 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Delete All Matching"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>

      {/* Main List Sheet */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Matching Invoices ({filteredInvoices.length})</h3>
          {filteredInvoices.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
            >
              {selectedIds.length === filteredInvoices.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider select-none">
                <th className="py-3.5 px-5 w-12 text-center">
                  <button onClick={handleToggleSelectAll}>
                    {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-purple-700" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-350" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-5">Invoice #</th>
                <th className="py-3.5 px-5">Student Name</th>
                <th className="py-3.5 px-5">Reg Code</th>
                <th className="py-3.5 px-5">Class</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
                <th className="py-3.5 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
              {filteredInvoices.map(inv => {
                const isSelected = selectedIds.includes(inv.id);
                return (
                  <tr key={inv.id} className={`hover:bg-slate-50/30 transition-colors ${isSelected ? 'bg-purple-50/20' : ''}`}>
                    <td className="py-3 px-5 text-center">
                      <button onClick={() => handleToggleSelectOne(inv.id)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-700" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-350" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-5 text-slate-500 font-bold">{inv.invoice_number}</td>
                    <td className="py-3 px-5 font-black text-slate-800">{inv.student_name}</td>
                    <td className="py-3 px-5 text-slate-500">{inv.student_id_code}</td>
                    <td className="py-3 px-5 text-slate-600">{inv.class_name}</td>
                    <td className="py-3 px-5 text-right font-bold text-slate-700">Rs {inv.amount.toLocaleString()}</td>
                    <td className="py-3 px-5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No matching invoices found to delete.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
