import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, MinusCircle } from 'lucide-react';

export default function AddExpensePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [expenseHeads, setExpenseHeads] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('account_heads');
    if (saved) {
      try {
        const allHeads = JSON.parse(saved);
        setExpenseHeads(allHeads.filter((h: any) => h.type === 'Expense'));
      } catch (e) {}
    } else {
      setExpenseHeads([
        { id: 'h-2', name: 'Electricity Bill', type: 'Expense' },
        { id: 'h-4', name: 'Staff Salaries', type: 'Expense' }
      ]);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error('Date is required');
      return;
    }
    if (!description.trim() || description === '-- Select type --') {
      toast.error('Please select an Expense Description / Head');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid Amount');
      return;
    }

    setLoading(true);
    try {
      const savedTransactions = localStorage.getItem('finance_transactions');
      const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
      
      const newTransaction = {
        id: `tx-${Date.now()}`,
        date,
        description: description.trim(),
        amount: parseFloat(amount),
        type: 'Expense'
      };

      transactions.push(newTransaction);
      localStorage.setItem('finance_transactions', JSON.stringify(transactions));
      toast.success('Expense transaction added successfully!');
      
      // Reset fields
      setDescription('');
      setAmount('');
    } catch (err) {
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Wallet className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Accounts</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Add Expense</span>
        </div>
      </div>

      {/* Main Box - Add Expense form */}
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
            -
          </div>
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Add Expense</h3>
        </div>

        <p className="text-[10px] text-rose-500 font-bold tracking-wide">* Required fields</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">DATE *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">DESCRIPTION *</label>
            <select
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            >
              <option value="">-- Select type --</option>
              {expenseHeads.map(head => (
                <option key={head.id} value={head.name}>{head.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">AMOUNT *</label>
            <input
              type="number"
              step="0.01"
              placeholder="Expense Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
            >
              <MinusCircle className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
