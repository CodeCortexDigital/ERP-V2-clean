import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, Search, Printer, Calendar, Users, DollarSign, Wallet, FileText } from 'lucide-react';
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

export default function SalarySheetPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<SalaryPayment[]>([]);
  const [salaryMonth, setSalaryMonth] = useState('June 2026');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredTeachers = teachers.filter(teacher => {
    const s = searchQuery.toLowerCase();
    return (
      teacher.full_name.toLowerCase().includes(s) ||
      (teacher.id && teacher.id.toLowerCase().includes(s)) ||
      (teacher.designation && teacher.designation.toLowerCase().includes(s))
    );
  });

  // Calculate quick stats
  let totalLiabilities = 0;
  let totalDisbursed = 0;
  let totalPending = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  teachers.forEach(teacher => {
    const basic = teacher.monthlySalary ? Number(teacher.monthlySalary.toString().replace(/[^0-9]/g, '')) : 45000;
    totalLiabilities += basic;

    const paidRecord = salaries.find(s => 
      s.employee_id === teacher.id && 
      s.month.toLowerCase().trim() === salaryMonth.toLowerCase().trim()
    );

    if (paidRecord) {
      totalDisbursed += paidRecord.net_salary;
      paidCount++;
    } else {
      totalPending += basic;
      unpaidCount++;
    }
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
          <span className="text-slate-500 font-bold">Salary Sheet</span>
        </div>
      </div>

      {/* Control Filters Panel Card - Hidden on print */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SEARCH EMPLOYEE</label>
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-450" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <button
              onClick={handlePrint}
              className="w-full h-11 bg-[#5C53CD] hover:bg-[#4d45bd] text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Salary Sheet
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
          <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Salary Sheet for {salaryMonth}</h3>
        </div>
      </div>

      {/* Stats Dashboard Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4 print:pt-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL BUDGET</span>
          <span className="text-xl font-black text-slate-850 block">Rs {totalLiabilities.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold block">{teachers.length} registered employees</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL DISBURSED</span>
          <span className="text-xl font-black text-emerald-600 block">Rs {totalDisbursed.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold block">{paidCount} employees paid</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TOTAL PENDING</span>
          <span className="text-xl font-black text-amber-500 block">Rs {totalPending.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold block">{unpaidCount} employees unpaid</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs flex flex-col justify-between h-28">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">DISBURSEMENT RATE</span>
          <span className="text-xl font-black text-purple-750 block">
            {teachers.length > 0 ? Math.round((paidCount / teachers.length) * 100) : 0}%
          </span>
          <span className="text-[9px] text-slate-400 font-bold block">Payroll efficiency</span>
        </div>
      </div>

      {/* Main Sheet Grid Card */}
      <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0 print:pt-6 print:block print-section w-full">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
          <h3 className="font-extrabold text-sm text-[#1C1656] uppercase tracking-wider">Salary Disbursement Roll</h3>
          <span className="text-[10px] text-slate-450 font-bold">{filteredTeachers.length} staff members</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 print:border-none">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider select-none">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-right">Fixed Salary</th>
                <th className="py-3 px-4 text-right">Bonus</th>
                <th className="py-3 px-4 text-right">Deduction</th>
                <th className="py-3 px-4 text-right">Net Salary</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
              {filteredTeachers.map(teacher => {
                const paidRecord = salaries.find(s => 
                  s.employee_id === teacher.id && 
                  s.month.toLowerCase().trim() === salaryMonth.toLowerCase().trim()
                );
                
                const fixed = teacher.monthlySalary ? Number(teacher.monthlySalary.toString().replace(/[^0-9]/g, '')) : 45000;
                
                return (
                  <tr key={teacher.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500">{teacher.id?.slice(0, 8) || '250963'}</td>
                    <td className="py-2.5 px-4 font-black text-slate-800">{teacher.full_name}</td>
                    <td className="py-2.5 px-4 text-slate-555">{teacher.designation || 'Teacher'}</td>
                    <td className="py-2.5 px-4 text-right">Rs {fixed.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right text-emerald-600">
                      Rs {paidRecord ? paidRecord.allowances.toLocaleString() : '0'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-rose-500">
                      Rs {paidRecord ? paidRecord.deductions.toLocaleString() : '0'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900">
                      Rs {paidRecord ? paidRecord.net_salary.toLocaleString() : fixed.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        paidRecord ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {paidRecord ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center print:hidden">
                      {paidRecord ? (
                        <button
                          onClick={() => navigate('/education/salary/slips')}
                          className="text-[9px] font-bold text-[#5C53CD] hover:underline"
                        >
                          View Slip
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/education/salary/pay')}
                          className="text-[9px] font-bold text-rose-600 hover:underline"
                        >
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                    No matching staff members found.
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
