import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, PlusCircle } from 'lucide-react';

export default function AddIncomePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [incomeHeads, setIncomeHeads] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('account_heads');
    if (saved) {
      try {
        const allHeads = JSON.parse(saved);
        setIncomeHeads(allHeads.filter((h: any) => h.type === 'Income'));
      } catch (e) {}
    } else {
      setIncomeHeads([
        { id: 'h-1', name: 'Tuition Fee', type: 'Income' },
        { id: 'h-3', name: 'Admission Fee', type: 'Income' }
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
      toast.error('Please select an Income Description / Head');
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
        type: 'Income'
      };

      transactions.push(newTransaction);
      localStorage.setItem('finance_transactions', JSON.stringify(transactions));
      toast.success('Income transaction added successfully!');
      
      // Reset fields
      setDescription('');
      setAmount('');
    } catch (err) {
      toast.error('Failed to add income');
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
          <span className="text-slate-500 font-bold">Add Income</span>
        </div>
      </div>

      {/* Main Box - Add Income form matching reference */}
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
            +
          </div>
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Add Income</h3>
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
              {incomeHeads.map(head => (
                <option key={head.id} value={head.name}>{head.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">AMOUNT *</label>
            <input
              type="number"
              step="0.01"
              placeholder="Income Amount"
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
              className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-purple-650 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
            >
              <PlusCircle className="w-4 h-4" /> Add Income
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
