import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, Plus, Trash2, Edit3, Save, ArrowLeft } from 'lucide-react';

interface AccountHead {
  id: string;
  name: string;
  type: 'Income' | 'Expense';
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
}

export default function ChartOfAccountsPage() {
  const navigate = useNavigate();
  const [heads, setHeads] = useState<AccountHead[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [headName, setHeadName] = useState('');
  const [headType, setHeadType] = useState<'' | 'Income' | 'Expense'>('');

  useEffect(() => {
    fetchHeads();
    fetchTransactions();
  }, []);

  const fetchTransactions = () => {
    const saved = localStorage.getItem('finance_transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.log('Error parsing finance transactions');
      }
    }
  };

  // Total collected/spent per account head (matched by name + type)
  const headTotal = (h: AccountHead) =>
    transactions
      .filter(t => t.type === h.type && t.description.trim().toLowerCase() === h.name.trim().toLowerCase())
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalIncome = transactions
    .filter(t => t.type === 'Income')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const fetchHeads = () => {
    const saved = localStorage.getItem('account_heads');
    if (saved) {
      try {
        setHeads(JSON.parse(saved));
      } catch (e) {
        console.log('Error parsing account heads');
      }
    } else {
      // Default placeholder accounts matching eSkooly
      const defaultHeads: AccountHead[] = [
        { id: 'h-1', name: 'Tuition Fee', type: 'Income' },
        { id: 'h-2', name: 'Electricity Bill', type: 'Expense' },
        { id: 'h-3', name: 'Admission Fee', type: 'Income' },
        { id: 'h-4', name: 'Staff Salaries', type: 'Expense' }
      ];
      setHeads(defaultHeads);
      localStorage.setItem('account_heads', JSON.stringify(defaultHeads));
    }
  };

  const handleSaveHead = () => {
    if (!headName.trim()) {
      toast.error('Please enter Head Name');
      return;
    }
    if (!headType) {
      toast.error('Please select Head Type');
      return;
    }

    let updatedHeads: AccountHead[] = [];

    if (editingId) {
      updatedHeads = heads.map(h => h.id === editingId ? {
        id: h.id,
        name: headName.trim(),
        type: headType
      } : h);
      setEditingId(null);
      toast.success('Account Head updated successfully!');
    } else {
      const newHead: AccountHead = {
        id: `head-${Date.now()}`,
        name: headName.trim(),
        type: headType
      };
      updatedHeads = [...heads, newHead];
      toast.success('Account Head added successfully!');
    }

    setHeads(updatedHeads);
    localStorage.setItem('account_heads', JSON.stringify(updatedHeads));
    
    // Reset Form
    setHeadName('');
    setHeadType('');
  };

  const handleEditClick = (h: AccountHead) => {
    setEditingId(h.id);
    setHeadName(h.name);
    setHeadType(h.type);
  };

  const handleDeleteClick = (id: string) => {
    if (!confirm('Are you sure you want to delete this Account Head?')) return;
    const updated = heads.filter(h => h.id !== id);
    setHeads(updated);
    localStorage.setItem('account_heads', JSON.stringify(updated));
    toast.success('Account Head deleted successfully');
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Wallet className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Accounts</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Chart of Accounts</span>
        </div>
      </div>

      {/* Summary Cards: Auto-tracked from finance ledger */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Income</p>
          <p className="text-xl font-black text-emerald-600 mt-1.5">Rs {totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Expense</p>
          <p className="text-xl font-black text-rose-500 mt-1.5">Rs {totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Net Balance</p>
          <p className={`text-xl font-black mt-1.5 ${netBalance >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>Rs {netBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Grid: Left Add/Edit Form & Right Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Form Box: Add Account Head */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4.5 h-4.5 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
              {editingId ? 'Update Account Head' : 'Add Account Head'}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">HEAD NAME *</label>
              <input
                type="text"
                placeholder="e.g. Electricity Bill"
                value={headName}
                onChange={(e) => setHeadName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">HEAD TYPE *</label>
              <select
                value={headType}
                onChange={(e) => setHeadType(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              >
                <option value="">-- Select type --</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            <button
              onClick={handleSaveHead}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" /> {editingId ? 'Update Head' : 'Save Head'}
            </button>

            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setHeadName('');
                  setHeadType('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-all"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Right Table Box: Account Heads List */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-20">ID</th>
                  <th className="py-3 px-4">Name Of Head</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heads.length > 0 ? (
                  heads.map((h, index) => (
                    <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-500">
                        {String(index + 1).padStart(3, '0')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-850">{h.name}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${h.type === 'Income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {h.type}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-black ${h.type === 'Income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                        Rs {headTotal(h).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(h)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-2xs"
                            title="Edit Account Head"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(h.id)}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-2xs"
                            title="Delete Account Head"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                      No account heads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
