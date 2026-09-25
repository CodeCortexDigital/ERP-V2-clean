import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import portal, { Family } from '@/services/portal.service';
import FamilyBillingCard from '@/components/finance/FamilyBillingCard';
import { formatMoney } from '@/utils/currency';

/** Parent portal: the family account (statement, pay online) and what each child owes. */
export default function ParentFeesPage() {
  const [family, setFamily] = useState<Family | null>(null);
  useEffect(() => { portal.family().then(setFamily).catch(() => setFamily(null)); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black text-slate-900 flex items-center gap-2"><Wallet size={18} className="text-blue-600" /> Fees & billing</h1>
      {family && family.children.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1.5">Child</th><th>Class</th><th className="text-right">Balance</th><th className="text-right">Overdue</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {family.children.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 font-semibold">{c.full_name}</td><td>{c.class_name}</td>
                  <td className="text-right font-bold">{formatMoney(c.balance)}</td>
                  <td className={`text-right ${c.overdue_fees ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>{formatMoney(c.overdue_fees)}</td>
                </tr>
              ))}
              <tr className="font-black"><td className="py-2">Family total</td><td /><td className="text-right">{formatMoney(family.totals.balance)}</td><td className="text-right">{formatMoney(family.totals.overdue_fees)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
      <FamilyBillingCard />
    </div>
  );
}
