import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, CreditCard, ArrowLeft, Printer, FileText, Ban, User } from 'lucide-react';
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

export default function SalaryPaidSlipPage() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [proceedClicked, setProceedClicked] = useState(false);

  // Salaries list found
  const [teacherSalaries, setTeacherSalaries] = useState<SalaryPayment[]>([]);

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
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) {
      toast.error('Please select an employee first');
      return;
    }

    setLoading(true);
    try {
      const savedSalaries = localStorage.getItem('custom_salaries');
      if (savedSalaries) {
        const parsed: SalaryPayment[] = JSON.parse(savedSalaries);
        const filtered = parsed.filter(s => s.employee_id === selectedTeacher.id);
        
        // Sort by date latest first
        filtered.sort((a, b) => new Date(b.paid_date).getTime() - new Date(a.paid_date).getTime());
        setTeacherSalaries(filtered);
      } else {
        setTeacherSalaries([]);
      }
      setProceedClicked(true);
    } catch (err) {
      toast.error('Failed to search records');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedTeacher(null);
    setSearchQuery('');
    setProceedClicked(false);
    setTeacherSalaries([]);
  };

  // Get latest slip for details display
  const latestSlip = teacherSalaries[0];

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12 print:bg-white print:p-0 print:m-0">
      
      {/* Dynamic Print CSS - Replicates eSkooly print slip with profile image (Image 2) */}
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
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5C53CD]">
          <CreditCard className="w-4 h-4 text-[#5C53CD]" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Salary</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Salary Slip</span>
        </div>
      </div>

      {/* PRINT SLIP TEMPLATE SECTION (Image 2) */}
      {selectedTeacher && latestSlip && (
        <div className="hidden print:block print-section w-full text-slate-800 font-sans p-6 bg-white space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl mx-auto font-black shadow-sm">
              🎓
            </div>
            <h2 className="text-2xl font-black tracking-wide text-slate-850">eSkooly</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">"YOUR SCHOOL SOFTWARE"</p>
            <p className="text-[9px] font-bold text-slate-400">+923460004443 | www.eskooly.com | info@eskooly.com</p>
            <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest pt-2">Salary Slip</h3>
          </div>

          <div className="flex items-center gap-6 border-y border-slate-200 py-3 text-[10px] font-bold">
            {/* Left aligned round profile picture */}
            <div className="w-16 h-16 rounded-full border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center font-black text-purple-650 text-xs">
              {selectedTeacher.profile_pic ? (
                <img src={selectedTeacher.profile_pic} alt={selectedTeacher.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-350" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 flex-1">
              <div className="space-y-1">
                <p className="text-slate-450">Employee ID: <strong className="text-slate-850">{selectedTeacher.id?.slice(0, 8) || '250963'}</strong></p>
                <p className="text-slate-450">Employee Role: <strong className="text-slate-850">{selectedTeacher.designation || 'Principal'}</strong></p>
                <p className="text-slate-450">Employee Name: <strong className="text-slate-850">{selectedTeacher.full_name}</strong></p>
              </div>
              <div className="space-y-1">
                <p className="text-slate-450">Salary Month: <strong className="text-slate-850">{latestSlip.month}</strong></p>
                <p className="text-slate-450">Date of Receiving: <strong className="text-slate-850">{latestSlip.paid_date}</strong></p>
                <p className="text-slate-450">Basic Amount: <strong className="text-slate-850">Rs {latestSlip.basic_salary.toLocaleString()}</strong></p>
                <p className="text-slate-450">Deduction Amount: <strong className="text-slate-850">Rs {latestSlip.deductions.toLocaleString()}</strong></p>
                <p className="text-slate-450">Net Salary Paid: <strong className="text-[#5C53CD] font-black">Rs {latestSlip.net_salary.toLocaleString()}</strong></p>
              </div>
            </div>
          </div>

          {/* Salaries Record Of Table */}
          <div className="space-y-2">
            <h4 className="text-center font-black text-xs text-slate-850 tracking-wide uppercase">Salaries Record Of {selectedTeacher.full_name}</h4>
            <table className="w-full text-[10px] border-collapse border border-slate-350">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 font-bold text-slate-700 text-left">
                  <th className="p-2 border-r border-slate-300">Sr#</th>
                  <th className="p-2 border-r border-slate-300">Salary Month</th>
                  <th className="p-2 border-r border-slate-300">Date</th>
                  <th className="p-2 border-r border-slate-300">Bonus</th>
                  <th className="p-2 border-r border-slate-300">Deductions</th>
                  <th className="p-2 text-right">Net Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {teacherSalaries.map((sal, idx) => (
                  <tr key={sal.id}>
                    <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200">{sal.month}</td>
                    <td className="p-2 border-r border-slate-200">{sal.paid_date}</td>
                    <td className="p-2 border-r border-slate-200">{sal.allowances}</td>
                    <td className="p-2 border-r border-slate-200">{sal.deductions}</td>
                    <td className="p-2 text-right font-bold">Rs {sal.net_salary.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 pt-16 text-[9px] font-bold text-slate-500">
            <div className="space-y-12">
              <p>Prepared By: <strong className="text-slate-800">eSkooly</strong></p>
              <p>Checked By: ___________________________</p>
            </div>
            <div className="text-right pt-20">
              <p>Accounts Department Signature</p>
              <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">eSkooly</p>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN SECTION (Hidden on print) */}
      <div className="print:hidden">
        {proceedClicked && selectedTeacher ? (
          teacherSalaries.length === 0 ? (
            /* NO RECORDS SCREEN */
            <div className="space-y-6 max-w-5xl mx-auto">
              
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={handleReset}
                  className="h-10 px-5 border border-slate-250 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1 bg-white shadow-3xs"
                >
                  ← Back
                </button>
                <button
                  disabled
                  className="h-10 px-5 bg-purple-100 text-purple-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5 shadow-xs uppercase tracking-wider"
                >
                  Print detailed receipt
                </button>
                <button
                  disabled
                  className="h-10 px-5 border border-slate-200 bg-slate-50 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5 shadow-3xs"
                >
                  Thermal Receipt
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-16 text-center flex flex-col items-center justify-center space-y-4 min-h-[360px]">
                <div className="relative w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 shadow-inner">
                  <CreditCard className="w-8 h-8" />
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                    ✕
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-[#1C1656] tracking-tight pt-2">No Salary Record.</h3>
              </div>
            </div>
          ) : (
            /* SALARY SLIP DETAILS SCREEN - Matches Screenshot 1 exactly */
            <div className="space-y-6 max-w-4xl mx-auto">
              
              {/* Top right buttons panel */}
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={handleReset}
                  className="h-10 px-5 border border-slate-250 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1 bg-white shadow-3xs"
                >
                  ← Back
                </button>
                <button
                  onClick={handlePrint}
                  className="h-10 px-5 bg-[#5C53CD] hover:bg-[#4d45bd] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm uppercase tracking-wider transition-all"
                >
                  Print detailed receipt
                </button>
                <button
                  onClick={handlePrint}
                  className="h-10 px-5 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#5C53CD] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-3xs"
                >
                  Thermal Receipt
                </button>
              </div>

              {/* Centered Profile Slip Info Sheet Card (Screenshot 1) */}
              <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-12 flex flex-col items-center space-y-6">
                
                {/* Round Profile Picture */}
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center font-black text-purple-650 text-2xl shadow-inner">
                  {selectedTeacher.profile_pic ? (
                    <img src={selectedTeacher.profile_pic} alt={selectedTeacher.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-300" />
                  )}
                </div>

                {/* Name */}
                <h3 className="text-xl font-extrabold text-[#5C53CD] tracking-tight">{selectedTeacher.full_name}</h3>

                {/* Details List */}
                <div className="w-full max-w-xs space-y-2.5 text-xs font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registration/ID :</span>
                    <span>{selectedTeacher.id?.slice(0, 8) || '250963'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type :</span>
                    <span>{selectedTeacher.designation || 'Principal'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Salary Month:</span>
                    <span>{latestSlip.month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date of Receiving:</span>
                    <span>{latestSlip.paid_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bonus:</span>
                    <span>Rs {latestSlip.allowances}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deduction:</span>
                    <span>Rs {latestSlip.deductions}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-black text-slate-900">
                    <span className="text-slate-500">Net Paid:</span>
                    <span>Rs {latestSlip.net_salary.toLocaleString()}</span>
                  </div>
                </div>

              </div>
            </div>
          )
        ) : (
          /* FIRST SCREEN (SELECT EMPLOYEE) */
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-3xl border border-slate-150 shadow-sm space-y-6 text-center">
            
            <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#5C53CD] mx-auto shadow-inner">
              <FileText className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-800">Select Employee</h3>
              <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
                Search by employee ID, name, or role to view or print the salary slip.
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
