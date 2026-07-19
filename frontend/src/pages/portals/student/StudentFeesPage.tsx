import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowLeft, Loader2, Printer } from 'lucide-react';
import financeService from '@/services/finance.service';
import studentService from '@/services/student.service';
import { useAuth } from '@/contexts/AuthContext';
import authService from '@/services/auth.service';
import api from '@/services/api';

type Fee = { id: string; amount: number; month: string; status: string; issueDate?: string };

const val = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));
const formatFeeMonth = (inv: any) => {
  const d = inv.issue_date || inv.created_at || inv.month;
  if (!d) return 'General';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(inv.month || 'General');
  return dt.toLocaleString('default', { month: 'short', year: 'numeric' });
};
const feeStatusLabel = (inv: any) => {
  const s = String(inv.status || '').toLowerCase();
  if (s.includes('paid')) return 'Paid';
  if (s.includes('partial')) return 'Partial';
  if (s.includes('overdue') || s.includes('due')) return 'Overdue';
  return 'Pending';
};

// Fetch the backend's print-ready HTML receipt and render it in a new tab for printing.
const printInvoice = async (id: string) => {
  try {
    const res = await api.get(`/auth/finance/invoices/${id}/receipt/`);
    const html = res.data?.html_content ?? res.data;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Please allow pop-ups to print the receipt.');
      return;
    }
    win.document.open();
    win.document.write(typeof html === 'string' ? html : JSON.stringify(html, null, 2));
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 250);
  } catch (e) {
    console.error('Failed to open receipt', e);
    alert('Could not open the receipt. Please try again.');
  }
};

export default function StudentFeesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, due: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const me = await studentService.resolveMe(user);
        if (!me) {
          if (active) setError('Student profile not found for this account.');
          return;
        }
        const res = await financeService.getInvoices({ student_id: me.id }).catch(() => ({ data: [] as any[] }));
        const all: any[] = Array.isArray(res?.data) ? res.data : (res?.data?.results || []);
        const mine = all.filter((inv) =>
          String(inv.student) === String(me.id) ||
          String(inv.student_id) === String(me.id) ||
          (inv.student && String(inv.student.id) === String(me.id))
        );
        mine.sort((a, b) =>
          new Date(b.created_at || b.issue_date || 0).getTime() - new Date(a.created_at || a.issue_date || 0).getTime()
        );
        const mapped: Fee[] = mine.map((inv) => ({
          id: String(inv.id),
          amount: Number(inv.total_amount ?? inv.amount ?? 0),
          month: formatFeeMonth(inv),
          status: feeStatusLabel(inv),
          issueDate: inv.issue_date || inv.created_at,
        }));
        if (active) {
          setFees(mapped);
          const total = mapped.reduce((s, f) => s + f.amount, 0);
          const paid = mapped.filter((f) => f.status === 'Paid').reduce((s, f) => s + f.amount, 0);
          setTotals({ total, paid, due: total - paid });
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to load fees.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const statusStyle = (s: string) =>
    s === 'Paid' ? 'bg-emerald-100 text-emerald-700'
    : s === 'Partial' ? 'bg-amber-100 text-amber-700'
    : s === 'Overdue' ? 'bg-rose-100 text-rose-700'
    : 'bg-slate-200 text-slate-600';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Wallet size={16} className="text-blue-600" /> Fee History
        </h3>
        <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
          <ArrowLeft size={13} /> Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[['Total', totals.total, 'text-slate-700'], ['Paid', totals.paid, 'text-emerald-600'], ['Due', totals.due, 'text-rose-600']].map(
          ([label, val, cls]) => (
            <div key={label as string} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className={`text-lg font-black ${cls}`}>{(val as number).toLocaleString()}</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label as string}</p>
            </div>
          )
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading fees…
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl p-4">{error}</div>
      ) : fees.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No fee records found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <span>Period</span><span>Amount</span><span>Status</span><span></span>
          </div>
          {fees.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 text-xs border-b border-slate-50 items-center">
              <span className="font-bold text-slate-700">{f.month}</span>
              <span className="font-black text-slate-700">{f.amount.toLocaleString()}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusStyle(f.status)}`}>{f.status}</span>
              <button
                onClick={() => printInvoice(f.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                title="Print invoice"
              >
                <Printer size={13} /> Print
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
