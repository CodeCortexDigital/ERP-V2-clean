import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, Printer, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import ledgerService from '@/services/ledger.service';
import financeService from '@/services/finance.service';

interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
}

export default function AccountStatementPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReferences, setShowReferences] = useState(false);
  const [dateRange, setDateRange] = useState('Jun 1, 2026 - Jun 30, 2026');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const [ledgerRes, invoicesRes] = await Promise.all([
        ledgerService.getLedgerEntries().catch(() => ({ data: [] })),
        financeService.getInvoices({ status: 'all' }).catch(() => ({ data: [] }))
      ]);

      const ledgerEntries = ledgerRes.data || [];
      const invoiceEntries = Array.isArray(invoicesRes.data) ? invoicesRes.data : (invoicesRes.data as any)?.results || [];

      const txs: Transaction[] = ledgerEntries.map((e: any) => ({
        id: e.id,
        date: e.date ? String(e.date).substring(0, 10) : new Date().toISOString().substring(0, 10),
        description: e.description || e.account_head_name || 'Ledger Entry',
        amount: Math.abs(Number(e.amount || 0)),
        type: e.type === 'income' ? 'Income' : 'Expense'
      }));

      invoiceEntries.forEach((inv: any) => {
        const paidAmt = Number(inv.paid_amount ?? (inv.status === 'paid' ? inv.total_amount : 0));
        if (paidAmt > 0) {
          const studentName = inv.student_name || inv.student?.full_name || 'Student';
          const monthStr = inv.month || 'Fee Collection';
          txs.push({
            id: `inv-${inv.id}`,
            date: inv.issue_date ? String(inv.issue_date).substring(0, 10) : (inv.created_at ? String(inv.created_at).substring(0, 10) : new Date().toISOString().substring(0, 10)),
            description: `Fee Collection - ${studentName} (${monthStr})`,
            amount: paidAmt,
            type: 'Income'
          });
        }
      });

      setTransactions(txs);
    } catch (err) {
      console.log('Error fetching ledger entries');
      setTransactions([]);
    }
  };

  const handleResetBalance = async () => {
    if (!confirm('Are you sure you want to reset all statement records? This will clear all transactions.')) return;
    try {
      const response = await ledgerService.getLedgerEntries();
      for (const entry of response.data || []) {
        await ledgerService.deleteLedgerEntry(entry.id);
      }
      setTransactions([]);
      toast.success('Ledger statement reset successfully!');
    } catch (err) {
      toast.error('Failed to reset statement');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this statement entry?')) return;
    try {
      await ledgerService.deleteLedgerEntry(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Statement record deleted');
    } catch (err) {
      toast.error('Failed to delete entry');
    }
  };

  const handleExport = (type: string) => {
    toast.success(`${type} export started!`);
  };

  // Sort chronologically to compute correct running balance
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filtered transactions
  const filteredTransactions = sortedTransactions.filter(t => {
    const query = searchTerm.toLowerCase();
    return (
      t.description.toLowerCase().includes(query) ||
      t.date.includes(query) ||
      t.type.toLowerCase().includes(query)
    );
  });

  // Calculate Running Net Balance & Map Rows
  let currentRunning = 0;
  const ledgerRows = filteredTransactions.map(t => {
    if (t.type === 'Income') {
      currentRunning += t.amount;
    } else {
      currentRunning -= t.amount;
    }
    return {
      ...t,
      runningBalance: currentRunning
    };
  });

  // Totals calculations
  const totalIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
  const netMarginVal = totalIncome - totalExpense;

  // Percentage Calculations for circular gauges
  const totalSum = totalIncome + totalExpense;
  const incomePercent = totalSum > 0 ? Math.round((totalIncome / totalSum) * 100) : 100;
  const expensePercent = totalSum > 0 ? Math.round((totalExpense / totalSum) * 100) : 0;
  const netMarginPercent = totalIncome > 0 ? Math.round((netMarginVal / totalIncome) * 100) : 100;

  // Sparkline chart paths generator
  const generateSparklinePath = (type: 'Income' | 'Expense') => {
    const points = filteredTransactions.filter(t => t.type === type);
    if (points.length === 0) return 'M 0 45 L 300 45';
    
    const dailyMap: Record<string, number> = {};
    points.forEach(p => {
      dailyMap[p.date] = (dailyMap[p.date] || 0) + p.amount;
    });
    
    const sortedDays = Object.keys(dailyMap).sort();
    if (sortedDays.length === 1) {
      return `M 0 30 L 300 20`;
    }

    const width = 280;
    const height = 50;
    const maxVal = Math.max(...Object.values(dailyMap)) || 1;
    
    const coordinates = sortedDays.map((day, idx) => {
      const x = (idx / (sortedDays.length - 1)) * width;
      const amount = dailyMap[day];
      const y = height - (amount / maxVal) * (height - 15) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${coordinates.join(' L ')}`;
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Wallet className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Accounts</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Account Statement</span>
        </div>
      </div>

      {/* 1. FINANCIAL OVERVIEW CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-purple-700 text-sm">📊</span>
            <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Financial Overview</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">01 Jun 2026 - 30 Jun 2026</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Gauges Column */}
          <div className="flex justify-around items-center col-span-1 gap-4">
            
            {/* Income gauge */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-20 h-20 rounded-full border-4 border-emerald-400 flex items-center justify-center font-black text-emerald-600 text-xs shadow-2xs">
                {incomePercent}%
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Income</p>
              <p className="text-xs font-black text-emerald-600 mt-1">Rs {totalIncome.toLocaleString()}</p>
            </div>

            {/* Expense gauge */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-20 h-20 rounded-full border-4 border-rose-350 flex items-center justify-center font-black text-rose-500 text-xs shadow-2xs">
                {expensePercent}%
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Expense</p>
              <p className="text-xs font-black text-rose-500 mt-1">Rs {totalExpense.toLocaleString()}</p>
            </div>

            {/* Net Margin gauge */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-20 h-20 rounded-full border-4 border-purple-400 flex items-center justify-center font-black text-purple-650 text-xs shadow-2xs">
                {netMarginPercent}%
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Net Margin</p>
              <p className="text-xs font-black text-purple-650 mt-1">Rs {netMarginVal.toLocaleString()}</p>
            </div>

          </div>

          {/* Daily Income Sparkline Column */}
          <div className="col-span-1 border-l border-slate-100 pl-4 space-y-2">
            <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">Daily Income</p>
            <div className="h-16 w-full bg-slate-50/50 rounded-xl border border-slate-100/50 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full p-2" viewBox="0 0 300 50">
                <path
                  d={generateSparklinePath('Income')}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Daily Expense Sparkline Column */}
          <div className="col-span-1 border-l border-slate-100 pl-4 space-y-2">
            <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">Daily Expense</p>
            <div className="h-16 w-full bg-slate-50/50 rounded-xl border border-slate-100/50 flex items-center justify-center relative overflow-hidden">
              <svg className="w-full h-full p-2" viewBox="0 0 300 50">
                <path
                  d={generateSparklinePath('Expense')}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

        </div>
      </div>

      {/* 2. CONTROLS BAR CARD */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs cursor-pointer"
          >
            <option value="Jun 1, 2026 - Jun 30, 2026">Jun 1, 2026 - Jun 30, 2026</option>
            <option value="All Time">All Time Statement</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto md:justify-end">
          {/* Reference Switch Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Show References</span>
            <button
              onClick={() => setShowReferences(!showReferences)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${showReferences ? 'bg-purple-600' : 'bg-slate-200'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${showReferences ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <button
            onClick={handleResetBalance}
            className="flex items-center gap-1.5 h-10 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Balance
          </button>

          <button
            onClick={handleResetBalance}
            className="h-10 w-10 flex items-center justify-center border border-rose-200 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. STATEMENT RECORDS TABLE CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 pb-2">
            <Wallet className="w-5 h-5 text-purple-700" />
            <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Statement Records</h2>
          </div>

          {/* Export Actions & Search */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-100 gap-1 text-[11px] font-bold">
              <button onClick={() => handleExport('Copy')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">Copy</button>
              <button onClick={() => handleExport('CSV')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">CSV</button>
              <button onClick={() => handleExport('Excel')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">Excel</button>
              <button onClick={() => handleExport('PDF')} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all">PDF</button>
              <button onClick={() => window.print()} className="px-2.5 py-1 bg-[#4C469D] text-white rounded-lg hover:bg-[#3d387d] transition-all flex items-center gap-1"><Printer className="w-3 h-3" /> Print</button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-44 font-semibold text-slate-650 transition-all shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Ledger table matching Code Cortex mockup */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Expense</th>
                <th className="py-3 px-4 text-right">Income</th>
                <th className="py-3 px-4 text-right">Net Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.length > 0 ? (
                ledgerRows.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-500">{t.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {t.description} {showReferences && <span className="text-[10px] text-slate-400 block font-normal">Ref: {t.id}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-505">
                      {t.type === 'Expense' ? `Rs ${t.amount.toLocaleString()}` : 'Rs 0'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      {t.type === 'Income' ? `Rs ${t.amount.toLocaleString()}` : 'Rs 0'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-blue-600">
                      Rs {t.runningBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs"
                        title="Delete statement entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    No statement records found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/50 font-black border-t border-slate-100">
                <td className="py-4 px-4 text-right" colSpan={2}>Totals</td>
                <td className="py-4 px-4 text-right text-rose-500">Rs {totalExpense.toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-emerald-600">Rs {totalIncome.toLocaleString()}</td>
                <td className="py-4 px-4 text-right text-blue-600">Rs {netMarginVal.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer Entry stats */}
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pt-4 border-t border-slate-5">
          <div>
            Showing 1 to {ledgerRows.length} of {ledgerRows.length} entries
          </div>
        </div>

      </div>
    </div>
  );
}
