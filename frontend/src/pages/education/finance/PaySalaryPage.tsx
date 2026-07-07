import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, CreditCard, ArrowLeft, Check, Printer, Calendar, User, Banknote } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';

interface SalaryPayment {
  id: string;
  employee_id: string;
  employee_name: string;
  month: string;
  basic_salary: number;
  allowances: number; // bonus
  deductions: number;
  net_salary: number;
  status: 'paid';
  paid_date: string;
}

export default function PaySalaryPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [salaryMonth, setSalaryMonth] = useState('June 2026');
  const [paymentDate, setPaymentDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // yyyy-mm-dd
  });
  const [salaryBasic, setSalaryBasic] = useState(0);
  const [salaryBonus, setSalaryBonus] = useState(0);
  const [salaryDeduction, setSalaryDeduction] = useState(0);

  // Success state
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [activeSlip, setActiveSlip] = useState<SalaryPayment | null>(null);

  useEffect(() => {
    fetchTeachersList();
  }, []);

  const fetchTeachersList = async () => {
    try {
      const res = await teacherService.getAll().catch(() => ({ data: [] }));
      const rawTeachers = extractListData<any>(res.data || []);
      const customTeachers = JSON.parse(localStorage.getItem('custom_teachers') || '[]');
      const allTeachers = [...rawTeachers, ...customTeachers];
      setTeachers(allTeachers);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = teachers.filter(t => 
      t.full_name.toLowerCase().includes(val.toLowerCase()) ||
      (t.id && t.id.toLowerCase().includes(val.toLowerCase()))
    );
    setSuggestions(filtered.slice(0, 5));
  };

  const handleSelectTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setSearchQuery(teacher.full_name);
    setSuggestions([]);

    const basic = teacher.monthlySalary ? Number(teacher.monthlySalary.toString().replace(/[^0-9]/g, '')) : 45000;
    setSalaryBasic(basic);
    setSalaryBonus(0);
    setSalaryDeduction(0);
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) {
      toast.error('Please select an employee first');
      return;
    }
    
    // Check if already paid
    const savedSalaries = JSON.parse(localStorage.getItem('custom_salaries') || '[]');
    const isPaid = savedSalaries.some((s: any) => 
      s.employee_id === selectedTeacher.id && 
      s.month.toLowerCase().trim() === salaryMonth.toLowerCase().trim()
    );

    if (isPaid) {
      toast.error(`${selectedTeacher.full_name} is already paid for ${salaryMonth}.`);
      return;
    }

    setShowForm(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;
    setLoading(true);
    try {
      const netSalary = salaryBasic + salaryBonus - salaryDeduction;
      
      const newPayment: SalaryPayment = {
        id: `sal-${Date.now()}`,
        employee_id: selectedTeacher.id,
        employee_name: selectedTeacher.full_name,
        month: salaryMonth,
        basic_salary: salaryBasic,
        allowances: salaryBonus,
        deductions: salaryDeduction,
        net_salary: netSalary,
        status: 'paid',
        paid_date: paymentDate
      };

      // Save to database
      const savedSalaries = localStorage.getItem('custom_salaries');
      const salaries = savedSalaries ? JSON.parse(savedSalaries) : [];
      salaries.push(newPayment);
      localStorage.setItem('custom_salaries', JSON.stringify(salaries));

      // Save to accounts ledger
      const savedTxs = localStorage.getItem('finance_transactions');
      const transactions = savedTxs ? JSON.parse(savedTxs) : [];
      const newTx = {
        id: `tx-sal-${Date.now()}`,
        date: paymentDate,
        description: `Salary Paid to ${selectedTeacher.full_name} (${salaryMonth})`,
        amount: netSalary,
        type: 'Expense' as const
      };
      transactions.push(newTx);
      localStorage.setItem('finance_transactions', JSON.stringify(transactions));

      toast.success(`Salary of Rs ${netSalary} paid to ${selectedTeacher.full_name} successfully!`);
      setActiveSlip(newPayment);
      setPaymentConfirmed(true);
    } catch (e) {
      toast.error('Failed to submit salary payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedTeacher(null);
    setSearchQuery('');
    setShowForm(false);
    setPaymentConfirmed(false);
    setActiveSlip(null);
  };

  const netSalaryCalculated = salaryBasic + salaryBonus - salaryDeduction;

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

      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5C53CD]">
          <CreditCard className="w-4 h-4 text-[#5C53CD]" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Salary</span>
          <span>&gt;</span>
          <span className="text-slate-500 cursor-pointer hover:underline" onClick={handleReset}>Pay Salary</span>
          {showForm && (
            <>
              <span>&gt;</span>
              <span className="text-slate-500 font-bold">Employee</span>
            </>
          )}
        </div>
      </div>

      {/* PRINT-ONLY SECTION */}
      {activeSlip && (
        <div className="hidden print:block print-section w-full text-slate-800 font-sans p-6 bg-white space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">
              🎓
            </div>
            <h2 className="text-2xl font-black tracking-wide text-slate-800">eSkooly</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
            <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com | info@eskooly.com</p>
            <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Salary Payment Slip</h3>
          </div>

          <div className="grid grid-cols-2 gap-6 border-y border-slate-200 py-4 text-[10px] font-bold">
            <div className="space-y-1.5">
              <p className="text-slate-400">Employee Name: <strong className="text-slate-800">{activeSlip.employee_name}</strong></p>
              <p className="text-slate-400">Employee ID: <strong className="text-slate-800">{activeSlip.employee_id}</strong></p>
              <p className="text-slate-400">Month: <strong className="text-slate-800">{activeSlip.month}</strong></p>
            </div>
            <div className="space-y-1.5 text-right">
              <p className="text-slate-400">Slip No: <strong className="text-slate-800">{activeSlip.id}</strong></p>
              <p className="text-slate-400">Payment Date: <strong className="text-slate-800">{activeSlip.paid_date}</strong></p>
            </div>
          </div>

          <table className="w-full text-[10px] border-collapse border border-slate-350">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700">
                <th className="p-2 border-r border-slate-350 text-left">Description</th>
                <th className="p-2 text-right">Amount (Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2 border-r border-slate-200">BASIC SALARY</td>
                <td className="p-2 text-right">{activeSlip.basic_salary.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-200">ALLOWANCES</td>
                <td className="p-2 text-right">+{activeSlip.allowances.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-200">DEDUCTIONS</td>
                <td className="p-2 text-right">-{activeSlip.deductions.toLocaleString()}</td>
              </tr>
              <tr className="font-black bg-slate-100">
                <td className="p-2 border-r border-slate-200 text-left">NET SALARY PAID</td>
                <td className="p-2 text-right">Rs {activeSlip.net_salary.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="grid grid-cols-2 pt-12 text-[10px] font-bold text-slate-600">
            <div className="space-y-8">
              <p>Employee Signature: ______________________</p>
            </div>
            <div className="text-right pt-8">
              <p>Accounts Department Signature</p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN SCREEN SECTION (Hidden on print) */}
      <div className="print:hidden">
        {paymentConfirmed && activeSlip ? (
          /* SUCCESS SLIP VIEW */
          <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl border border-slate-150 shadow-sm space-y-6">
            <div className="p-4 rounded-xl border flex items-center gap-2.5 text-xs font-black shadow-3xs uppercase tracking-wider bg-[#D1FAE5] border-[#A7F3D0] text-[#059669]">
              <Check className="w-5 h-5 shrink-0 bg-emerald-600 text-white rounded-full p-0.5" />
              <span>Salary Disbursed Successfully</span>
            </div>

            <div className="border border-slate-150 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between border-b pb-2 text-xs font-bold">
                <span className="text-slate-400">EMPLOYEE NAME</span>
                <span className="text-slate-800">{activeSlip.employee_name}</span>
              </div>
              <div className="flex justify-between border-b pb-2 text-xs font-bold">
                <span className="text-slate-400">SALARY MONTH</span>
                <span className="text-slate-800">{activeSlip.month}</span>
              </div>
              <div className="flex justify-between border-b pb-2 text-xs font-bold">
                <span className="text-slate-400">NET DISBURSED</span>
                <span className="text-emerald-600 font-extrabold">Rs {activeSlip.net_salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">PAID DATE</span>
                <span className="text-slate-800">{activeSlip.paid_date}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handlePrintSlip}
                className="px-6 py-2.5 bg-[#5C53CD] hover:bg-[#4d45bd] text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Print Slip
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Back to Search
              </button>
            </div>
          </div>
        ) : showForm && selectedTeacher ? (
          /* DETAILED SALARY DISBURSEMENT FORM - Replicates Screenshot 2 exactly */
          <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* Top Employee Profile Box Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#5C53CD] text-white flex items-center justify-center font-bold text-lg shadow-inner">
                  {selectedTeacher.profile_pic ? (
                    <img src={selectedTeacher.profile_pic} alt={selectedTeacher.full_name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-[#1C1656] text-sm">{selectedTeacher.full_name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    ID #{selectedTeacher.id?.slice(0, 6) || '256963'} | {selectedTeacher.designation || 'Principal'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1"
              >
                ← Back
              </button>
            </div>

            {/* Bottom details form double columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Form Box */}
              <div className="bg-white p-8 rounded-3xl border border-slate-150 shadow-sm lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-[#1C1656]">
                  <CreditCard className="w-5 h-5" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">Salary Details</h4>
                </div>

                <form onSubmit={handleSubmitPayment} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">SALARY MONTH *</label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={salaryMonth}
                          onChange={(e) => setSalaryMonth(e.target.value)}
                          required
                          placeholder="June 2026"
                          className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                        />
                        <Calendar className="absolute right-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">PAYMENT DATE *</label>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          required
                          className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">FIXED SALARY *</label>
                      <input
                        type="number"
                        value={salaryBasic || ''}
                        onChange={(e) => setSalaryBasic(Number(e.target.value))}
                        required
                        className="w-full h-11 px-4 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">BONUS</label>
                      <input
                        type="number"
                        value={salaryBonus || ''}
                        onChange={(e) => setSalaryBonus(Number(e.target.value))}
                        className="w-full h-11 px-4 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black tracking-wider text-slate-400 uppercase mb-2">DEDUCTION</label>
                      <input
                        type="number"
                        value={salaryDeduction || ''}
                        onChange={(e) => setSalaryDeduction(Number(e.target.value))}
                        className="w-full h-11 px-4 rounded-xl border border-slate-205 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all shadow-4xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-[#5C53CD] hover:bg-[#4d45bd] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4.5 w-4.5 border-b-2 border-white" />
                      ) : (
                        '✓ Submit Salary'
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Side Net Salary Summary Box */}
              <div className="bg-white p-6 rounded-2xl border-l-4 border-l-[#5C53CD] border border-slate-150 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">NET SALARY</span>
                  <span className="text-2xl font-black text-[#5C53CD] block">
                    Rs {netSalaryCalculated.toLocaleString()}
                  </span>
                </div>
                <div className="text-[#5C53CD]/15">
                  <Banknote className="w-12 h-12" />
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* SEARCH/SELECT EMPLOYEE CARD - Matches first screenshot exactly */
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-3xl border border-slate-150 shadow-sm space-y-6 text-center">
            
            <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#5C53CD] mx-auto shadow-inner">
              <Search className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-800">Select Employee</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
                Search by employee ID, name, or role to proceed with salary payment.
              </p>
            </div>

            <form onSubmit={handleProceed} className="space-y-4 max-w-md mx-auto pt-2 relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee.."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                />
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-50 text-left">
                  {suggestions.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTeacher(t)}
                      className="p-3 hover:bg-purple-50/50 cursor-pointer text-xs font-semibold text-slate-700 flex justify-between items-center"
                    >
                      <span>{t.full_name}</span>
                      <span className="text-[10px] text-slate-450 font-bold bg-slate-50 px-2.5 py-0.5 rounded-full">
                        {t.designation || 'Teacher'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-8 py-3 bg-[#5C53CD] hover:bg-[#4d45bd] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  → Proceed
                </button>
              </div>
            </form>

          </div>
        )}
      </div>

    </div>
  );
}
