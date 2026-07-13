import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, Search, Printer, Calendar, TrendingUp, AlertCircle, CheckCircle, Wallet, Users } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';

interface SalaryPayment {
  id: string;
  employee_id: string;
  employee_name: string;
  month: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'paid';
  paid_date: string;
}

export default function SalaryReportPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [salaryMonth, setSalaryMonth] = useState('June 2026');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const rawTeachers = extractListData<any>(tRes.data || []);
      const customTeachers = JSON.parse(localStorage.getItem('custom_teachers') || '[]');
      
      // De-duplicate by ID (in case a custom teacher has same ID as DB teacher)
      const uniqueTeachersMap = new Map<string, any>();
      rawTeachers.forEach((t: any) => {
        if (t.id) uniqueTeachersMap.set(String(t.id), t);
      });
      customTeachers.forEach((t: any) => {
        if (t.id) uniqueTeachersMap.set(String(t.id), t);
      });
      const allTeachers = Array.from(uniqueTeachersMap.values());
      setTeachers(allTeachers);

      const savedSalaries = localStorage.getItem('custom_salaries');
      if (savedSalaries) {
        setSalaries(JSON.parse(savedSalaries));
      } else {
        setSalaries([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const matchingSalaries = salaries.filter(s => s.month.toLowerCase().trim() === salaryMonth.toLowerCase().trim());
  const totalSalariesPaid = matchingSalaries.reduce((sum, s) => sum + s.net_salary, 0);

  let totalBudget = 0;
  teachers.forEach(teacher => {
    const basic = teacher.monthlySalary ? Number(teacher.monthlySalary.toString().replace(/[^0-9]/g, '')) : 45000;
    totalBudget += basic;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0 print:m-0">
      
      {/* Dynamic Print CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: auto;
            margin: 5mm;
          }
          body * {
            visibility: hidden;
          }
          .print-section, .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />

      {/* Top Breadcrumb Bar - Hidden on print */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-750">
          <Landmark className="w-4 h-4 text-purple-750" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Salary</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Salary Report</span>
        </div>
      </div>

      {/* Control Filters Panel Card - Hidden on print */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SALARY MONTH</label>
            <input
              type="text"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              placeholder="June 2026"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
            />
          </div>

          <div>
            <button
              onClick={handlePrint}
              className="w-full h-11 bg-[#5C53CD] hover:bg-[#4d45bd] text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Salary Report
            </button>
          </div>
        </div>
      </div>

      {/* Print View Header Section */}
      <div className="hidden print:block print-section w-full text-slate-800 font-sans p-6 bg-white space-y-4">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">
            🎓
          </div>
          <h2 className="text-2xl font-black tracking-wide text-slate-850">eSkooly</h2>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
          <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com</p>
          <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Salary Report for {salaryMonth}</h3>
        </div>
      </div>

      {/* Stats Dashboard Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4 print:pt-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL REGISTERED BUDGET</span>
          <span className="text-xl font-black text-slate-850 block">Rs {totalBudget.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold block">{teachers.length} registered employees</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL DISBURSED SALARIES</span>
          <span className="text-xl font-black text-emerald-600 block">Rs {totalSalariesPaid.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold block">{matchingSalaries.length} transactions paid</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PENDING DISBURSEMENTS</span>
          <span className="text-xl font-black text-rose-500 block">Rs {(totalBudget - totalSalariesPaid > 0 ? totalBudget - totalSalariesPaid : 0).toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold block">Remaining liability</span>
        </div>
      </div>

      {/* Main Report Table Sheet */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0 print:pt-6 print:block print-section w-full">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
          <h3 className="font-extrabold text-sm text-[#1C1656] uppercase tracking-wider">Salary Payments Ledger</h3>
          <span className="text-[10px] text-slate-455 font-bold">{matchingSalaries.length} vouchers</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 print:border-none">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider select-none">
                <th className="py-3 px-4">Voucher ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Disbursed Month</th>
                <th className="py-3 px-4 text-right">Basic Salary</th>
                <th className="py-3 px-4 text-right">Allowances</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Net Amount Paid</th>
                <th className="py-3 px-4 text-center">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
              {matchingSalaries.map(sal => (
                <tr key={sal.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-500">{sal.id}</td>
                  <td className="py-2.5 px-4 font-black text-slate-800">{sal.employee_name}</td>
                  <td className="py-2.5 px-4 text-slate-600">{sal.month}</td>
                  <td className="py-2.5 px-4 text-right">Rs {sal.basic_salary.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">Rs {sal.allowances.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right text-rose-500">Rs {sal.deductions.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900">Rs {sal.net_salary.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-center text-slate-400">{sal.paid_date}</td>
                </tr>
              ))}
              {matchingSalaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No salary disburse vouchers recorded for {salaryMonth}.
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
