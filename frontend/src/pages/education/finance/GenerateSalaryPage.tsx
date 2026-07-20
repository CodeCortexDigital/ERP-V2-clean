import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Landmark, DollarSign, Users, CalendarDays, Plus, Printer, ArrowLeft, Search, User, Banknote, Wallet, CreditCard, Trash2 } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { extractListData } from '@/services/api';
import ledgerService from '@/services/ledger.service';

interface Employee {
  id: string;
  full_name: string;
  employee_id?: string;
  designation?: string;
  department?: string;
  monthly_salary?: number;      // ← YEH FIELD IMPORTANT HAI
  basic_salary?: number;        // ← ALTERNATIVE FIELD
  salary?: number;              // ← ALTERNATIVE FIELD
  joining_date?: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account?: string;
}

interface Salary {
  id: string;
  salary_number: string;
  employee_id: string;
  employee_name: string;
  employee_id_code: string;
  designation: string;
  department: string;
  month: string;
  due_date: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'unpaid' | 'paid' | 'partial';
  created_at: string;
  paid_amount: number;
  remaining_balance: number;
  payment_date: string | null;
  payment_method: string | null;
  bank_name: string | null;
  notes: string;
}

const getDepartmentForRole = (role: string) => {
  const r = (role || '').toLowerCase();
  if (r.includes('accountant') || r.includes('finance') || r.includes('bursar') || r.includes('cashier')) {
    return 'Finance';
  }
  if (r.includes('principal') || r.includes('manager') || r.includes('clerk') || r.includes('admin') || r.includes('management') || r.includes('office')) {
    return 'Administration';
  }
  if (r.includes('driver') || r.includes('peon') || r.includes('security') || r.includes('guard') || r.includes('clean') || r.includes('maid') || r.includes('support')) {
    return 'Support';
  }
  return 'Academic'; // Default
};

export default function GenerateSalaryPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedSalaries, setGeneratedSalaries] = useState<Salary[] | null>(null);
  const [banks, setBanks] = useState<any[]>([]);

  // Form states
  const [salaryMonth, setSalaryMonth] = useState(() => {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [notes, setNotes] = useState('');
  const [bankName, setBankName] = useState('');

  // Credit & Unpaid Salary states
  const [unpaidSalaries, setUnpaidSalaries] = useState<any[]>([]);
  const [pendingCredits, setPendingCredits] = useState<any[]>([]);
  const [creditType, setCreditType] = useState('Bonus');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Employee[]>([]);

  // Bulk generate states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  // Clear single employee specific state when bulkMode is toggled
  useEffect(() => {
    if (bulkMode) {
      setSelectedEmployee('');
      setSearchQuery('');
      setUnpaidSalaries([]);
      setPendingCredits([]);
      setAllowances('0');
      setBasicSalary('');
    }
  }, [bulkMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teachers/employees
      const tRes = await teacherService.getAll().catch(() => ({ data: [] }));
      const rawTeachers = extractListData<any>(tRes.data || []);

      // Map to Employee format using backend data only
      const employeesList: Employee[] = rawTeachers.map((t: any) => {
        const role = t.designation || t.role || 'Teacher';
        const dept = t.department || getDepartmentForRole(role);
        const salary = Number(t.monthly_salary) || Number(t.basic_salary) || Number(t.salary) || Number(t.pay) || 0;
        
        return {
          id: t.id,
          full_name: t.full_name,
          employee_id: t.employee_id || t.id,
          designation: role,
          department: dept,
          monthly_salary: salary,
          basic_salary: salary,
          salary: salary,
          joining_date: t.joining_date || t.created_at,
          phone: t.phone || t.phone_number,
          email: t.email,
          bank_name: t.bank_name || '',
          bank_account: t.bank_account || ''
        };
      });

      setEmployees(employeesList);
      setBankName('HBL');
    } catch (e) {
      console.error(e);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // Search handler
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = employees.filter(e => 
      e.full_name.toLowerCase().includes(val.toLowerCase()) ||
      (e.employee_id && e.employee_id.toLowerCase().includes(val.toLowerCase()))
    );
    setSuggestions(filtered.slice(0, 5));
  };

  // FIXED: Auto-populate salary when employee is selected and fetch pending credits/unpaid salaries
  const handleSelectEmployee = async (emp: Employee) => {
    setSelectedEmployee(emp.id);
    setSearchQuery(`${emp.full_name} (${emp.employee_id || 'N/A'})`);
    setSuggestions([]);
    
    // Auto-populate basic salary from employee record
    const salaryAmount = emp.monthly_salary || 0;
    if (salaryAmount > 0) {
      setBasicSalary(String(salaryAmount));
      toast.success(`Salary Rs ${salaryAmount.toLocaleString()} loaded for ${emp.full_name}`);
    } else {
      setBasicSalary('');
      toast.warning(`No salary record found for ${emp.full_name}. Please enter manually.`);
    }

    // Load unpaid payslips from API
    try {
      const payslipRes = await ledgerService.getPayslips({ employee_id: emp.id, status: 'pending' });
      const unpaidPayslips = (payslipRes.data || []).map((p: any) => ({
        id: p.id,
        employee_id: p.employee,
        month: p.month,
        net_salary: p.net_salary,
        status: p.status
      }));
      setUnpaidSalaries(unpaidPayslips);
    } catch (err) {
      setUnpaidSalaries([]);
    }

    // Load pending credits from API
    try {
      const creditRes = await ledgerService.getEmployeeCredits({ employee_id: emp.id });
      const pendingCreditsList = (creditRes.data || []).filter((c: any) => !c.is_settled);
      setPendingCredits(pendingCreditsList);

      // Auto-apply pending credits to allowances/bonus field
      const totalCredits = pendingCreditsList.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
      setAllowances(String(totalCredits));
    } catch (err) {
      setPendingCredits([]);
    }
  };

  const calculateNetSalary = () => {
    const basic = parseFloat(basicSalary) || 0;
    const allowancesVal = parseFloat(allowances) || 0;
    const deductionsVal = parseFloat(deductions) || 0;
    return basic + allowancesVal - deductionsVal;
  };

  const getMonthValue = (monthYear: string) => {
    if (!monthYear) return '';
    try {
      const d = new Date(`${monthYear} 1`);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const formatMonthValue = (yearMonth: string) => {
    if (!yearMonth) return '';
    try {
      const [year, month] = yearMonth.split('-');
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('en-US', {
        month: 'long',
      });
      return `${monthName} ${year}`;
    } catch {
      return '';
    }
  };

  const handleAddCredit = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }
    const amountVal = parseFloat(creditAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const apiType = creditType.toLowerCase();
      let finalType: 'advance' | 'bonus' | 'loan' | 'deduction' = 'bonus';
      if (apiType === 'advance') finalType = 'advance';
      else if (apiType === 'loan') finalType = 'loan';
      else if (apiType === 'deduction') finalType = 'deduction';
      else finalType = 'bonus';

      await ledgerService.createEmployeeCredit({
        employee: selectedEmployee,
        type: finalType,
        amount: amountVal,
        date: new Date().toISOString().split('T')[0],
        description: creditDescription,
        is_settled: false
      });

      toast.success(`Rs ${amountVal.toLocaleString()} credit/bonus allotted to employee!`);

      // Reset inputs
      setCreditAmount('');
      setCreditDescription('');

      // Reload pending credits
      const creditRes = await ledgerService.getEmployeeCredits({ employee_id: selectedEmployee });
      const pendingCreditsList = (creditRes.data || []).filter((c: any) => !c.is_settled);
      setPendingCredits(pendingCreditsList);

      // Update allowances
      const totalCredits = pendingCreditsList.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
      setAllowances(String(totalCredits));
    } catch (err) {
      toast.error('Failed to add credit');
    }
  };

  const handleDeleteCredit = async (creditId: string) => {
    try {
      await ledgerService.deleteEmployeeCredit(creditId);
      toast.success('Credit removed successfully');

      // Reload pending credits
      const creditRes = await ledgerService.getEmployeeCredits({ employee_id: selectedEmployee });
      const pendingCreditsList = (creditRes.data || []).filter((c: any) => !c.is_settled);
      setPendingCredits(pendingCreditsList);

      // Update allowances
      const totalCredits = pendingCreditsList.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
      setAllowances(String(totalCredits));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const generatedList: Salary[] = [];

      if (bulkMode) {
        // Generate for all employees or by department
        let targetEmployees = employees;
        if (selectedDepartment !== 'All') {
          targetEmployees = employees.filter(e => e.department === selectedDepartment);
        }

        for (const emp of targetEmployees) {
          // Check if salary already exists for this month via API
          const existingRes = await ledgerService.getPayslips({ employee_id: emp.id, month: salaryMonth });
          if (existingRes.data && existingRes.data.length > 0) {
            continue;
          }

          const basic = emp.monthly_salary || emp.basic_salary || emp.salary || 0;
          const allowancesVal = parseFloat(allowances) || 0;
          const deductionsVal = parseFloat(deductions) || 0;
          const netSalary = basic + allowancesVal - deductionsVal;

          // Create payslip via API
          const payslipRes = await ledgerService.createPayslip({
            employee: emp.id,
            month: salaryMonth,
            basic_salary: basic,
            allowances: allowancesVal,
            deductions: deductionsVal,
            net_salary: netSalary,
            paid_amount: 0,
            status: 'pending',
            payment_method: 'bank_transfer',
            notes: notes
          });

          const newSalary: Salary = {
            id: payslipRes.data?.id || `sal-${Date.now()}-${emp.id}`,
            salary_number: `SAL-${Date.now().toString().slice(-6)}-${emp.id.slice(-3)}`,
            employee_id: emp.id,
            employee_name: emp.full_name,
            employee_id_code: emp.employee_id || emp.id,
            designation: emp.designation || 'Teacher',
            department: emp.department || 'Academic',
            month: salaryMonth,
            due_date: dueDate,
            basic_salary: basic,
            allowances: allowancesVal,
            deductions: deductionsVal,
            net_salary: netSalary,
            status: 'unpaid',
            created_at: new Date().toISOString(),
            paid_amount: 0,
            remaining_balance: netSalary,
            payment_date: null,
            payment_method: null,
            bank_name: bankName,
            notes: notes
          };

          generatedList.push(newSalary);
        }

        toast.success(`${generatedList.length} salary slips generated successfully!`);
      } else {
        // Single employee
        if (!selectedEmployee) {
          toast.error('Please select an employee');
          setLoading(false);
          return;
        }

        const emp = employees.find(e => e.id === selectedEmployee);
        if (!emp) {
          toast.error('Employee not found');
          setLoading(false);
          return;
        }

        // Check if salary already exists
        const existingRes = await ledgerService.getPayslips({ employee_id: emp.id, month: salaryMonth });
        if (existingRes.data && existingRes.data.length > 0) {
          toast.error(`Salary already generated for ${emp.full_name} for ${salaryMonth}`);
          setLoading(false);
          return;
        }

        const basic = parseFloat(basicSalary) || emp.monthly_salary || emp.basic_salary || emp.salary || 0;
        const allowancesVal = parseFloat(allowances) || 0;
        const deductionsVal = parseFloat(deductions) || 0;
        const netSalary = basic + allowancesVal - deductionsVal;

        // Create payslip via API
        const payslipRes = await ledgerService.createPayslip({
          employee: emp.id,
          month: salaryMonth,
          basic_salary: basic,
          allowances: allowancesVal,
          deductions: deductionsVal,
          net_salary: netSalary,
          paid_amount: 0,
          status: 'pending',
          payment_method: 'bank_transfer',
          notes: notes
        });

        const newSalary: Salary = {
          id: payslipRes.data?.id || `sal-${Date.now()}`,
          salary_number: `SAL-${Date.now().toString().slice(-6)}`,
          employee_id: emp.id,
          employee_name: emp.full_name,
          employee_id_code: emp.employee_id || emp.id,
          designation: emp.designation || 'Teacher',
          department: emp.department || 'Academic',
          month: salaryMonth,
          due_date: dueDate,
          basic_salary: basic,
          allowances: allowancesVal,
          deductions: deductionsVal,
          net_salary: netSalary,
          status: 'unpaid',
          created_at: new Date().toISOString(),
          paid_amount: 0,
          remaining_balance: netSalary,
          payment_date: null,
          payment_method: null,
          bank_name: bankName,
          notes: notes
        };

        generatedList.push(newSalary);
        toast.success(`Salary generated for ${emp.full_name} successfully!`);
      }

      // Save generated salaries to localStorage for real-time visibility across all views
      try {
        const existingLocal = JSON.parse(localStorage.getItem('erp_generated_payslips') || '[]');
        const merged = [...generatedList, ...existingLocal.filter((e: any) => !generatedList.some((g: any) => g.id === e.id || (g.employee_id === e.employee_id && g.month === e.month)))];
        localStorage.setItem('erp_generated_payslips', JSON.stringify(merged));
        localStorage.setItem('custom_salaries', JSON.stringify(merged));
      } catch (err) {}

      setGeneratedSalaries(generatedList);

      // Clear local states
      setPendingCredits([]);
      setUnpaidSalaries([]);

    } catch (e) {
      toast.error('Failed to generate salary');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepartments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  if (generatedSalaries) {
    return (
      <div className="space-y-6 bg-slate-50 min-h-screen p-6 text-slate-800 pb-12 print:bg-white print:p-0">
        <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
          <button
            onClick={() => setGeneratedSalaries(null)}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Generator
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all uppercase tracking-wider"
          >
            <Printer className="w-4 h-4" /> Print Salary Slips
          </button>
        </div>

        <div className="space-y-8">
          {generatedSalaries.map((sal) => (
            <SalarySlipCard key={sal.id} salary={sal} banks={banks} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Landmark className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Finance</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Generate Salary</span>
        </div>
      </div>

      {/* Main Form */}
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8">
        
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-7 h-7 rounded-full bg-purple-950 text-white flex items-center justify-center text-xs font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-slate-800 text-sm">Generate Salary</h2>
        </div>

        <form onSubmit={handleGenerateSalary} className="space-y-6">
          {/* Month & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Salary Month *</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="month"
                  value={getMonthValue(salaryMonth)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const formatted = formatMonthValue(e.target.value);
                    setSalaryMonth(formatted);
                  }}
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Bulk Mode Toggle */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkMode}
                onChange={(e) => setBulkMode(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              Bulk Generate for All Employees
            </label>
            {bulkMode && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="All">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}
          </div>

          {/* Employee Selection with Search */}
          {!bulkMode && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Select Employee *</label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type employee name or ID..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                    />
                  </div>
                  
                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-50">
                      {suggestions.map(emp => {
                        const salaryDisplay = emp.monthly_salary || emp.basic_salary || emp.salary || 0;
                        return (
                          <div
                            key={emp.id}
                            onClick={() => handleSelectEmployee(emp)}
                            className="p-3 hover:bg-purple-50/50 cursor-pointer text-xs font-semibold text-slate-700 flex justify-between items-center"
                          >
                            <span>{emp.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full">
                              {emp.designation} {salaryDisplay > 0 && `| Rs ${salaryDisplay.toLocaleString()}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedEmployee && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80">
                  {/* Unpaid Salaries & Credits Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Unpaid Pending Salaries</h4>
                      {unpaidSalaries.length === 0 ? (
                        <p className="text-xs text-slate-500 font-medium bg-white p-3 rounded-xl border border-slate-100">No unpaid pending salaries.</p>
                      ) : (
                        <div className="space-y-2 max-h-36 overflow-y-auto">
                          {unpaidSalaries.map((s: any) => (
                            <div key={s.id} className="flex justify-between items-center bg-white px-3.5 py-2.5 rounded-xl border border-slate-100 text-xs">
                              <span className="font-semibold text-slate-700">{s.month}</span>
                              <span className="font-black text-rose-600">Rs {s.net_salary.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Pending Credits & Bonuses</h4>
                      {pendingCredits.length === 0 ? (
                        <p className="text-xs text-slate-500 font-medium bg-white p-3 rounded-xl border border-slate-100">No pending credits or bonuses.</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="space-y-2 max-h-36 overflow-y-auto">
                            {pendingCredits.map((c: any) => (
                              <div key={c.id} className="flex justify-between items-center bg-white px-3.5 py-2 rounded-xl border border-slate-100 text-xs">
                                <div className="flex flex-col">
                                  <span className="font-black text-purple-950">{c.type}</span>
                                  {c.description && <span className="text-[10px] text-slate-400 font-medium">{c.description}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-emerald-600">Rs {Number(c.amount).toLocaleString()}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCredit(c.id)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold p-2.5 rounded-lg flex items-center justify-between border border-emerald-100">
                            <span>Total applied to Allowances:</span>
                            <span>Rs {pendingCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Credit Form */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Allot Credit / Bonus</h4>
                      
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Credit Type</label>
                          <select
                            value={creditType}
                            onChange={(e) => setCreditType(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="Bonus">Bonus</option>
                            <option value="Arrears">Arrears</option>
                            <option value="Allowance">Allowance</option>
                            <option value="Overtime">Overtime</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description / Reason</label>
                        <input
                          type="text"
                          placeholder="e.g. Eid Bonus, Overtime"
                          value={creditDescription}
                          onChange={(e) => setCreditDescription(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCredit}
                      className="w-full h-9 bg-purple-950 hover:bg-purple-900 text-white font-bold text-xs rounded-lg shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Allot Credit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Salary Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Basic Salary *</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                required={!bulkMode}
                placeholder="Enter basic salary"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Allowances</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Deductions</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Net Salary Preview */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex justify-between items-center">
            <span className="text-xs font-bold text-purple-700">Net Salary:</span>
            <span className="text-xl font-black text-purple-700">
              Rs {calculateNetSalary().toLocaleString()}
            </span>
          </div>

          {/* Bank & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Bank Name</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              >
                {banks.map((b: any) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {bulkMode ? `Generate ${selectedDepartment === 'All' ? 'All' : selectedDepartment} Salaries` : 'Generate Salary'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Salary Slip Component
function SalarySlipCard({ salary, banks }: { salary: Salary; banks: any[] }) {
  const bankObj = banks.find((b: any) => b.name === salary.bank_name) || {
    name: salary.bank_name || 'HBL',
    accountNumber: '343546535356565',
    branchAddress: 'efref45y5hghtg'
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs print:border-slate-300 print:shadow-none max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-800">Salary Slip</h2>
        <p className="text-[10px] text-slate-400 font-bold">Code Cortex - Employee Salary Statement</p>
      </div>

      {/* Employee Details */}
      <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 text-[11px] font-semibold">
        <div>
          <p className="text-slate-400">Employee Name</p>
          <p className="text-slate-800 font-black">{salary.employee_name}</p>
        </div>
        <div>
          <p className="text-slate-400">Employee ID</p>
          <p className="text-slate-800 font-black">{salary.employee_id_code}</p>
        </div>
        <div>
          <p className="text-slate-400">Designation</p>
          <p className="text-slate-800">{salary.designation}</p>
        </div>
        <div>
          <p className="text-slate-400">Department</p>
          <p className="text-slate-800">{salary.department}</p>
        </div>
        <div>
          <p className="text-slate-400">Month</p>
          <p className="text-slate-800">{salary.month}</p>
        </div>
        <div>
          <p className="text-slate-400">Salary #</p>
          <p className="text-slate-800">{salary.salary_number}</p>
        </div>
      </div>

      {/* Salary Breakdown */}
      <div className="py-4">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 font-bold text-slate-500">
              <td className="py-2">Particulars</td>
              <td className="py-2 text-right">Amount</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2">Basic Salary</td>
              <td className="py-2 text-right font-semibold">Rs {salary.basic_salary.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-2">Allowances</td>
              <td className="py-2 text-right font-semibold text-emerald-600">Rs {salary.allowances.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-2">Deductions</td>
              <td className="py-2 text-right font-semibold text-rose-600">Rs {salary.deductions.toLocaleString()}</td>
            </tr>
            <tr className="font-bold border-t-2 border-slate-300">
              <td className="py-2 text-purple-700">Net Salary</td>
              <td className="py-2 text-right text-purple-700 text-lg">Rs {salary.net_salary.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank Details */}
      <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-500">
        <p>Bank: {bankObj.name}</p>
        <p>Account: {bankObj.accountNumber}</p>
        <p>Due Date: {new Date(salary.due_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</p>
      </div>

      {/* Status Badge */}
      <div className="mt-4 text-center">
        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
          salary.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
          salary.status === 'partial' ? 'bg-amber-50 text-amber-700' :
          'bg-rose-50 text-rose-700'
        }`}>
          {salary.status === 'paid' ? '✅ Paid' : salary.status === 'partial' ? '⚠️ Partial' : '❌ Unpaid'}
        </span>
      </div>
    </div>
  );
}