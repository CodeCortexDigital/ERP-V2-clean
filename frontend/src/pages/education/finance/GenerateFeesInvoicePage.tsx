import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wallet, User, Calendar, CreditCard, Shield, Landmark, CalendarDays } from 'lucide-react';
import studentService from '@/services/student.service';
import academicService from '@/services/academic.service';
import financeService from '@/services/finance.service';
import { extractListData } from '@/services/api';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        }
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

export default function GenerateFeesInvoicePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'student' | 'class' | 'family'>('student');
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [feeMonth, setFeeMonth] = useState(() => new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().split('T')[0]; });
  const [fine, setFine] = useState('0');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedStudentSearch, setSelectedStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  
  // Fee amount with previous balance
  const [feeAmount, setFeeAmount] = useState('');
  const [previousBalance, setPreviousBalance] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);

  // Copy checkboxes
  const [bankCopy, setBankCopy] = useState(true);
  const [studentCopy, setStudentCopy] = useState(true);
  const [instituteCopy, setInstituteCopy] = useState(true);

  // Auto-complete suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [generatedInvoices, setGeneratedInvoices] = useState<any[] | null>(null);
  const [checkedStructureIds, setCheckedStructureIds] = useState<string[]>([]);

  const getFeeAmountForClass = (classIdOrName: string) => {
    if (!classIdOrName) return '';
    const clsObj = classes.find(c => 
      String(c.id) === String(classIdOrName) || 
      c.name.trim().toLowerCase() === classIdOrName.trim().toLowerCase()
    );
    if (!clsObj) return '';

    const tuitionFee = feeStructures.find(fs => 
      String(fs.class_ref) === String(clsObj.id) && 
      (fs.fee_name || '').toUpperCase() === 'MONTHLY TUITION FEE'
    );
    if (tuitionFee) return String(tuitionFee.amount);

    const monthlyFee = feeStructures.find(fs => 
      String(fs.class_ref) === String(clsObj.id) && 
      String(fs.frequency).toLowerCase() === 'monthly'
    );
    if (monthlyFee) return String(monthlyFee.amount);

    const anyFee = feeStructures.find(fs => 
      String(fs.class_ref) === String(clsObj.id)
    );
    if (anyFee) return String(anyFee.amount);

    return '';
  };

  const activeStructures = useMemo(() => {
    let targetClassIds: string[] = [];
    
    if (activeTab === 'student') {
      if (selectedStudent) {
        const sClass = selectedStudent.class_name || selectedStudent.current_class_name || selectedStudent.current_class || '';
        const clsObj = classes.find(c => 
          String(c.id) === String(sClass) || 
          c.name.trim().toLowerCase() === sClass.trim().toLowerCase()
        );
        if (clsObj) targetClassIds.push(clsObj.id);
      }
    } else if (activeTab === 'class') {
      if (selectedClass) {
        const clsObj = classes.find(c => c.name.trim().toLowerCase() === selectedClass.trim().toLowerCase());
        if (clsObj) targetClassIds.push(clsObj.id);
      }
    } else if (activeTab === 'family') {
      if (selectedFamily) {
        const sanitizeFamilyName = (name: string) => name.toLowerCase().replace(/[\s\-_]/g, '').trim();
        const familyStudents = students.filter(s => {
          const sFam = s.select_family || s.guardian_name || '';
          return sanitizeFamilyName(sFam) === sanitizeFamilyName(selectedFamily);
        });
        familyStudents.forEach(s => {
          const sClass = s.class_name || s.current_class_name || s.current_class || '';
          const clsObj = classes.find(c => 
            String(c.id) === String(sClass) || 
            c.name.trim().toLowerCase() === sClass.trim().toLowerCase()
          );
          if (clsObj && !targetClassIds.includes(clsObj.id)) {
            targetClassIds.push(clsObj.id);
          }
        });
      }
    }

    if (targetClassIds.length === 0) return [];
    
    return feeStructures.filter(fs => targetClassIds.includes(String(fs.class_ref)));
  }, [activeTab, selectedStudent, selectedClass, selectedFamily, classes, feeStructures, students]);

  const calculateBreakdownForClass = (classIdOrName: string) => {
    const breakdown = {
      tuition: 0,
      admission: 0,
      registration: 0,
      art: 0,
      transport: 0,
      books: 0,
      uniform: 0,
      others: 0
    };

    if (!classIdOrName) {
      breakdown.tuition = parseFloat(feeAmount || '0');
      return breakdown;
    }

    const clsObj = classes.find(c => 
      String(c.id) === String(classIdOrName) || 
      c.name.trim().toLowerCase() === classIdOrName.trim().toLowerCase()
    );
    if (!clsObj) {
      breakdown.tuition = parseFloat(feeAmount || '0');
      return breakdown;
    }

    const classStructures = feeStructures.filter(fs => 
      String(fs.class_ref) === String(clsObj.id) &&
      checkedStructureIds.includes(fs.id)
    );

    if (classStructures.length === 0) {
      breakdown.tuition = parseFloat(feeAmount || '0');
      return breakdown;
    }

    classStructures.forEach(fs => {
      const name = (fs.fee_name || '').toUpperCase();
      const amt = Number(fs.amount);
      if (name.includes('TUITION') || name.includes('MONTHLY')) {
        breakdown.tuition += amt;
      } else if (name.includes('ADMISSION')) {
        breakdown.admission += amt;
      } else if (name.includes('REGISTRATION')) {
        breakdown.registration += amt;
      } else if (name.includes('ART')) {
        breakdown.art += amt;
      } else if (name.includes('TRANSPORT')) {
        breakdown.transport += amt;
      } else if (name.includes('BOOKS')) {
        breakdown.books += amt;
      } else if (name.includes('UNIFORM')) {
        breakdown.uniform += amt;
      } else {
        breakdown.others += amt;
      }
    });

    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const manualTotal = parseFloat(feeAmount || '0');
    if (manualTotal > 0 && Math.abs(sum - manualTotal) > 0.01) {
      const otherSum = sum - breakdown.tuition;
      breakdown.tuition = Math.max(0, manualTotal - otherSum);
    }

    return breakdown;
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeStructures.length > 0) {
      setCheckedStructureIds(activeStructures.map(fs => fs.id));
    } else {
      setCheckedStructureIds([]);
    }
  }, [activeStructures]);

  useEffect(() => {
    if (activeStructures.length === 0) return;
    const total = activeStructures
      .filter(fs => checkedStructureIds.includes(fs.id))
      .reduce((sum, fs) => sum + Number(fs.amount), 0);
    setFeeAmount(total > 0 ? String(total) : '');
  }, [checkedStructureIds, activeStructures]);

  // Calculate previous balance from backend invoices
  const calculatePreviousBalance = async (studentId: string, currentFeeMonth: string) => {
    try {
      const res = await financeService.getInvoices({ student: studentId }).catch(() => ({ data: [] }));
      const parsed = extractListData<any>(res.data || []);
      const pending = parsed.filter((inv: any) =>
        inv.student === studentId &&
        inv.remaining_balance !== undefined &&
        inv.remaining_balance !== null &&
        inv.remaining_balance > 0 &&
        inv.fee_month !== currentFeeMonth
      );
      const total = pending.reduce((sum: number, inv: any) => sum + (inv.remaining_balance || 0), 0);
      return { total, pending };
    } catch (e) {
      return { total: 0, pending: [] };
    }
  };

  // Check previous balance when student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setPreviousBalance(0);
      setPendingInvoices([]);
      return;
    }

    let cancelled = false;
    const loadPreviousBalance = async () => {
      const { total, pending } = await calculatePreviousBalance(selectedStudent.id, feeMonth);
      if (!cancelled) {
        setPreviousBalance(total);
        setPendingInvoices(pending);
        if (total > 0) {
          toast.info(`Previous balance: Rs ${total.toLocaleString()} from ${pending.length} pending invoice(s)`);
        }
      }
    };

    loadPreviousBalance();
    return () => { cancelled = true; };
  }, [selectedStudent, feeMonth]);

  const fetchData = async () => {
    try {
      const [sRes, cRes, fsRes] = await Promise.all([
        studentService.getAll().catch(() => ({ data: [] })),
        academicService.getClasses().catch(() => ({ data: [] })),
        financeService.getFeeStructures().catch(() => ({ data: [] }))
      ]);

      const rawStudents = extractListData<any>(sRes.data || []);
      const rawClasses = extractListData<any>(cRes.data || []);
      const rawFeeStructures = extractListData<any>(fsRes.data || []);

      setFeeStructures(rawFeeStructures);

      const classMap = new Map<string, any>();
      
      rawClasses.forEach((cls: any) => {
        classMap.set(cls.id, {
          ...cls,
          tuition_fee: cls.tuition_fee !== undefined && cls.tuition_fee !== null ? Number(cls.tuition_fee) : 0
        });
      });

      const combinedClasses = Array.from(classMap.values());

      const deletedClassIds: string[] = JSON.parse(localStorage.getItem('deleted_class_ids') || '[]');
      
      const uniqueClasses = combinedClasses
        .filter(c => !deletedClassIds.includes(c.id))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
        .filter((c, idx, self) =>
          self.findIndex(sc => sc.name.toLowerCase() === c.name.toLowerCase()) === idx
        )
        .map(c => ({
          ...c,
          tuition_fee: c.tuition_fee !== undefined && c.tuition_fee !== null ? Number(c.tuition_fee) : 0
        }));

      setClasses(uniqueClasses);

      if (!selectedClass && uniqueClasses.length > 0) {
        setSelectedClass(uniqueClasses[0].name);
        const firstClsId = uniqueClasses[0].id;
        const tuitionFee = rawFeeStructures.find((fs: any) => 
          String(fs.class_ref) === String(firstClsId) && 
          (fs.fee_name || '').toUpperCase() === 'MONTHLY TUITION FEE'
        );
        if (tuitionFee) {
          setFeeAmount(String(tuitionFee.amount));
        } else {
          const anyFee = rawFeeStructures.find((fs: any) => String(fs.class_ref) === String(firstClsId));
          setFeeAmount(anyFee ? String(anyFee.amount) : '');
        }
      }

      const defaultStudents = [
        { id: 'std-1', student_id: '001', full_name: 'Sundas', class_name: 'Grade 1-A' }
      ];
      setStudents(rawStudents.length > 0 ? rawStudents : defaultStudents);

      const savedBanks = localStorage.getItem('bank_details');
      if (savedBanks) {
        try {
          const parsed = JSON.parse(savedBanks);
          setBanks(parsed);
          if (parsed.length > 0) {
            setSelectedBank(parsed[0].name);
          }
        } catch (e) {}
      } else {
        const defaultBanks = [{ id: 'b-1', name: 'HBL' }, { id: 'b-2', name: 'Meezan Bank' }];
        setBanks(defaultBanks);
        setSelectedBank('HBL');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    }
  };

  const handleStudentSearchChange = (val: string) => {
    setSelectedStudentSearch(val);
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = students.filter(s => 
      s.full_name.toLowerCase().includes(val.toLowerCase()) ||
      (s.student_id && s.student_id.toLowerCase().includes(val.toLowerCase()))
    );
    setSuggestions(filtered.slice(0, 5));
  };

  const handleSelectSuggestion = (s: any) => {
    setSelectedStudent(s);
    setSelectedStudentSearch(`${s.full_name} (${s.student_id || 'N/A'})`);
    setSuggestions([]);

    const studentClass = s.class_name || s.current_class_name || s.current_class || '';
    const cls = classes.find(c => c.name.trim().toLowerCase() === studentClass.trim().toLowerCase());

    if (cls) {
      const amt = getFeeAmountForClass(cls.id);
      setFeeAmount(amt);
    } else {
      setFeeAmount('');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) {
      toast.error('Please select a bank');
      return;
    }

    if (!feeAmount || isNaN(parseFloat(feeAmount)) || parseFloat(feeAmount) <= 0) {
      toast.error('Please enter a valid fee amount');
      return;
    }

    setLoading(true);
    try {
      const generatedList: any[] = [];

      if (activeTab === 'student') {
        if (!selectedStudent) {
          toast.error('Please select a student');
          setLoading(false);
          return;
        }

        const { total: prevBal, pending } = await calculatePreviousBalance(selectedStudent.id, feeMonth);
        const currentFee = parseFloat(feeAmount);
        const totalAmount = currentFee + prevBal;

        const classStr = selectedStudent.class_name || selectedStudent.current_class_name || selectedStudent.current_class || '';
        const breakdown = calculateBreakdownForClass(classStr);
        const checkedStructures = activeStructures.filter(fs => checkedStructureIds.includes(fs.id));
        const structuresLabel = checkedStructures.map(fs => `${fs.fee_name}`).join(', ');
        const customDesc = structuresLabel 
          ? `Fee Submission for ${feeMonth} (${structuresLabel}) of Student ID:- ${selectedStudent.student_id || '001'}`
          : `Fee Submission for ${feeMonth} of Student ID:- ${selectedStudent.student_id || '001'}`;

        const newInv = {
          id: `inv-${Date.now()}`,
          invoice_number: `INV-${Date.now().toString().slice(-6)}`,
          student: selectedStudent.id,
          student_name: selectedStudent.full_name,
          student_id_code: selectedStudent.student_id || '001',
          class_name: selectedStudent.class_name || selectedStudent.current_class_name || 'Grade 1-A',
          fee_month: feeMonth,
          due_date: dueDate,
          amount: currentFee,
          previous_balance: prevBal,
          total_amount: totalAmount,
          fine_after_due_date: parseFloat(fine || '0'),
          bank_name: selectedBank,
          status: 'unpaid',
          description: customDesc,
          copies: { bank: bankCopy, student: studentCopy, institute: instituteCopy },
          created_at: new Date().toISOString(),
          remaining_balance: totalAmount,
          paid_amount: 0,
          pending_invoice_ids: pending.map((p: any) => p.id),
          transferred_from: pending.length > 0 ? pending.map((p: any) => p.invoice_number).join(', ') : undefined,
          breakdown: breakdown
        };

        generatedList.push(newInv);
      } else if (activeTab === 'class') {
        if (!selectedClass) {
          toast.error('Please select a class');
          setLoading(false);
          return;
        }

        const sanitizeClassName = (name: string) => {
          return name.toLowerCase().replace(/[\s\-_]/g, '').trim();
        };

        const classStudents = students.filter(s => {
          const sClass = s.class_name || s.current_class_name || s.current_class || s.class_ref || '';
          return sanitizeClassName(sClass) === sanitizeClassName(selectedClass);
        });

        if (classStudents.length === 0) {
          toast.error('No students found in the selected class');
          setLoading(false);
          return;
        }

        const checkedStructures = activeStructures.filter(fs => checkedStructureIds.includes(fs.id));
        const structuresLabel = checkedStructures.map(fs => `${fs.fee_name}`).join(', ');
        const getCustomDesc = (sid: string) => structuresLabel 
          ? `Fee Submission for ${feeMonth} (${structuresLabel}) of Student ID:- ${sid}`
          : `Fee Submission for ${feeMonth} of Student ID:- ${sid}`;

        const breakdown = calculateBreakdownForClass(selectedClass);

        for (const [idx, student] of classStudents.entries()) {
          const { total: prevBal, pending } = await calculatePreviousBalance(student.id, feeMonth);
          const currentFee = parseFloat(feeAmount);
          const totalAmount = currentFee + prevBal;
          const sid = student.student_id || '001';

          const newInv = {
            id: `inv-${Date.now()}-${idx}`,
            invoice_number: `INV-${(Date.now() + idx).toString().slice(-6)}`,
            student: student.id,
            student_name: student.full_name,
            student_id_code: student.student_id || '001',
            class_name: selectedClass,
            fee_month: feeMonth,
            due_date: dueDate,
            amount: currentFee,
            previous_balance: prevBal,
            total_amount: totalAmount,
            fine_after_due_date: parseFloat(fine || '0'),
            bank_name: selectedBank,
            status: 'unpaid',
            description: getCustomDesc(sid),
            copies: { bank: bankCopy, student: studentCopy, institute: instituteCopy },
            created_at: new Date().toISOString(),
            remaining_balance: totalAmount,
            paid_amount: 0,
            pending_invoice_ids: pending.map((p: any) => p.id),
            transferred_from: pending.length > 0 ? pending.map((p: any) => p.invoice_number).join(', ') : undefined,
            breakdown: breakdown
          };
          generatedList.push(newInv);
        }
      } else if (activeTab === 'family') {
        if (!selectedFamily) {
          toast.error('Please select family/guardian');
          setLoading(false);
          return;
        }

        const sanitizeFamilyName = (name: string) => {
          return name.toLowerCase().replace(/[\s\-_]/g, '').trim();
        };

        const familyStudents = students.filter(s => {
          const sFam = s.select_family || s.guardian_name || '';
          return sanitizeFamilyName(sFam) === sanitizeFamilyName(selectedFamily);
        });

        if (familyStudents.length === 0) {
          toast.error('No students found for the selected family');
          setLoading(false);
          return;
        }

        const checkedStructures = activeStructures.filter(fs => checkedStructureIds.includes(fs.id));
        const structuresLabel = checkedStructures.map(fs => `${fs.fee_name}`).join(', ');
        const getCustomDesc = (sid: string) => structuresLabel 
          ? `Fee Submission for ${feeMonth} (${structuresLabel}) of Student ID:- ${sid}`
          : `Fee Submission for ${feeMonth} of Student ID:- ${sid}`;

        for (const [idx, student] of familyStudents.entries()) {
          const { total: prevBal, pending } = await calculatePreviousBalance(student.id, feeMonth);
          const currentFee = parseFloat(feeAmount);
          const totalAmount = currentFee + prevBal;

          const sClass = student.class_name || student.current_class_name || student.current_class || '';
          const breakdown = calculateBreakdownForClass(sClass);
          const sid = student.student_id || '001';

          const newInv = {
            id: `inv-${Date.now()}-${idx}`,
            invoice_number: `INV-${(Date.now() + idx).toString().slice(-6)}`,
            student: student.id,
            student_name: student.full_name,
            student_id_code: student.student_id || '001',
            class_name: student.class_name || student.current_class_name || 'Grade 1-A',
            fee_month: feeMonth,
            due_date: dueDate,
            amount: currentFee,
            previous_balance: prevBal,
            total_amount: totalAmount,
            fine_after_due_date: parseFloat(fine || '0'),
            bank_name: selectedBank,
            status: 'unpaid',
            description: getCustomDesc(sid),
            copies: { bank: bankCopy, student: studentCopy, institute: instituteCopy },
            created_at: new Date().toISOString(),
            remaining_balance: totalAmount,
            paid_amount: 0,
            pending_invoice_ids: pending.map((p: any) => p.id),
            transferred_from: pending.length > 0 ? pending.map((p: any) => p.invoice_number).join(', ') : undefined,
            breakdown: breakdown
          };
          generatedList.push(newInv);
        }
      }

      const failedToCreate: any[] = [];
      const backendCreatedInvoices: any[] = [];
      
      try {
        await Promise.all(generatedList.map(async (inv) => {
          try {
            const res = await financeService.createInvoice({
              student: inv.student,
              amount: inv.amount,
              opening_balance: inv.previous_balance,
              discount_amount: inv.discount_amount || 0,
              due_date: inv.due_date,
              description: inv.description,
              invoice_month: inv.fee_month ? `${inv.fee_month}-01` : undefined,
              breakdown: inv.breakdown,
              late_fee_amount: inv.fine_after_due_date,
            });
            
            if (res && res.data) {
              const created = res.data;
              backendCreatedInvoices.push({
                id: created.id,
                invoice_number: created.invoice_number,
                student: created.student,
                student_name: created.student_name || inv.student_name,
                student_id_code: created.student_id_num || inv.student_id_code,
                class_name: created.class_name || inv.class_name,
                fee_month: created.invoice_month ? created.invoice_month.substring(0, 7) : inv.fee_month,
                amount: parseFloat(created.amount),
                previous_balance: parseFloat(created.opening_balance),
                discount_amount: parseFloat(created.discount_amount),
                total_amount: parseFloat(created.total_amount),
                fine_after_due_date: parseFloat(created.late_fee_amount || '0') || inv.fine_after_due_date,
                description: created.description,
                breakdown: created.breakdown,
                created_at: created.created_at || inv.created_at,
                due_date: created.due_date,
                scholarship_name: created.scholarship_name,
              });
            } else {
              backendCreatedInvoices.push(inv);
            }
          } catch (e) {
            failedToCreate.push(inv);
          }
        }));
      } catch (e) {
        failedToCreate.push(...generatedList);
      }

      if (failedToCreate.length > 0) {
        toast.error(`Generated ${generatedList.length} invoice(s), but ${failedToCreate.length} could not be saved to the database.`);
      } else {
        toast.success(`Generated ${generatedList.length} fee invoice(s) and saved to the database successfully!`);
      }

      setGeneratedInvoices(backendCreatedInvoices.length > 0 ? backendCreatedInvoices : generatedList);
    } catch (err) {
      toast.error('Failed to generate fee invoices');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique families list
  const uniqueFamilies: string[] = [];
  students.forEach(s => {
    const fam = s.select_family || s.guardian_name || '';
    if (fam && !uniqueFamilies.includes(fam)) {
      uniqueFamilies.push(fam);
    }
  });

  // Helper for month picker
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

  if (generatedInvoices) {
    const bankObj = banks.find(b => b.name === selectedBank) || {
      name: selectedBank || 'HBL',
      accountNumber: '343546535356565',
      branchAddress: 'efref45y5hghtg'
    };

    return (
      <div className="space-y-6 bg-slate-50 min-h-screen p-6 text-slate-800 pb-12 print:bg-white print:p-0">
        <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs print:hidden">
          <button
            onClick={() => setGeneratedInvoices(null)}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-3xs"
          >
            ← Back to Generator
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-md transition-all uppercase tracking-wider"
          >
            Print Fees Invoice
          </button>
        </div>

        <div className="space-y-12 print:space-y-0">
          {generatedInvoices.map((inv) => {
            const studentObj = students.find(s => s.id === inv.student) || {};
            const fatherName = studentObj.father_name || studentObj.guardian_name || 'azhar';

            return (
              <div key={inv.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-slate-200 pb-8 print:border-none print:pb-0 print:grid-cols-3 print:gap-4 print:page-break-after">
                {inv.copies.bank && (
                  <ChallanSlipCard
                    copyName="Bank Copy"
                    invoice={inv}
                    fatherName={fatherName}
                    bankObj={bankObj}
                  />
                )}
                {inv.copies.student && (
                  <ChallanSlipCard
                    copyName="Student Copy"
                    invoice={inv}
                    fatherName={fatherName}
                    bankObj={bankObj}
                  />
                )}
                {inv.copies.institute && (
                  <ChallanSlipCard
                    copyName="Institute Copy"
                    invoice={inv}
                    fatherName={fatherName}
                    bankObj={bankObj}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-2 text-slate-800 pb-12">
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          <Landmark className="w-4 h-4 text-purple-700" />
          <span className="cursor-pointer hover:underline" onClick={() => navigate('/education/finance')}>Fees</span>
          <span>&gt;</span>
          <span className="text-slate-500 font-bold">Generate Fees Invoice</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8">
        
        <div className="flex justify-center">
          <div className="flex bg-slate-55 p-1.5 rounded-2xl border border-slate-100 gap-1 text-xs font-bold text-slate-500 shadow-2xs">
            <button
              onClick={() => {
                setActiveTab('student');
                setSelectedStudent(null);
                setSelectedStudentSearch('');
                setPreviousBalance(0);
                setPendingInvoices([]);
              }}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'student' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-700'}`}
            >
              👥 Student Wise
            </button>
            <button
              onClick={() => {
                setActiveTab('class');
                setSelectedClass('');
              }}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'class' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-700'}`}
            >
              🏫 Class Wise
            </button>
            <button
              onClick={() => {
                setActiveTab('family');
                setSelectedFamily('');
              }}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl transition-all ${activeTab === 'family' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-700'}`}
            >
              👪 Family Wise
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="w-6 h-6 rounded-full bg-purple-900 text-white flex items-center justify-center text-xs font-bold">
            {activeTab === 'student' ? '1' : activeTab === 'class' ? '2' : '3'}
          </span>
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            {activeTab === 'student' ? 'Student Invoice' : activeTab === 'class' ? 'Class Invoices' : 'Family Invoice'}
          </h3>
        </div>

        {/* Previous Balance Alert */}
        {previousBalance > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <p className="text-xs font-bold text-amber-700">Previous Balance Detected</p>
              <p className="text-xs text-amber-600">
                Rs {previousBalance.toLocaleString()} pending from {pendingInvoices.length} invoice(s).
                <span className="text-amber-700 font-bold ml-1">
                  These will be transferred to the new invoice.
                </span>
              </p>
              {pendingInvoices.length > 0 && (
                <div className="mt-1 text-[10px] text-amber-500">
                  {pendingInvoices.map((inv: any) => (
                    <span key={inv.id} className="inline-block mr-3">
                      {inv.fee_month}: Rs {inv.remaining_balance}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FEE MONTH *</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="month"
                  value={getMonthValue(feeMonth)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const formatted = formatMonthValue(e.target.value);
                    setFeeMonth(formatted);
                  }}
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">DUE DATE *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">FINE AFTER DUE DATE</label>
              <input
                type="number"
                value={fine}
                onChange={(e) => setFine(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT BANK *</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              >
                <option value="">-- Select bank --</option>
                {banks.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            {activeTab === 'student' && (
              <div className="relative">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SEARCH STUDENT *</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Type student name or registration..."
                    value={selectedStudentSearch}
                    onChange={(e) => handleStudentSearchChange(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-50">
                    {suggestions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSuggestion(s)}
                        className="p-3 hover:bg-purple-50/50 cursor-pointer text-xs font-semibold text-slate-700 flex justify-between items-center"
                      >
                        <span>{s.full_name}</span>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full">
                          Reg: {s.student_id || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'class' && (
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT CLASS *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'family' && (
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">SELECT FAMILY *</label>
                <select
                  value={selectedFamily}
                  onChange={(e) => setSelectedFamily(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-655 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
                >
                  <option value="">-- Select Family --</option>
                  {uniqueFamilies.map(fam => (
                    <option key={fam} value={fam}>{fam}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fee Structures Checkbox Group */}
          {((activeTab === 'student' && selectedStudent) || 
            (activeTab === 'class' && selectedClass) || 
            (activeTab === 'family' && selectedFamily)) && (
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold tracking-wider text-slate-455 uppercase">
                  Select Fee Structures ({activeStructures.length})
                </label>
                {activeStructures.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckedStructureIds(activeStructures.map(fs => fs.id))}
                      className="text-[10px] text-purple-600 font-bold hover:underline"
                    >
                      Check All
                    </button>
                    <span className="text-[10px] text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setCheckedStructureIds([])}
                      className="text-[10px] text-slate-400 font-bold hover:underline"
                    >
                      Uncheck All
                    </button>
                  </div>
                )}
              </div>
              {activeStructures.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No fee structures configured for this selection. You can enter the fee amount manually below.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeStructures.map((fs: any) => {
                    const isChecked = checkedStructureIds.includes(fs.id);
                    return (
                      <label 
                        key={fs.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-purple-50/40 border-purple-200 text-purple-700 font-semibold' 
                            : 'bg-white border-slate-150 text-slate-650 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setCheckedStructureIds(prev => prev.filter(id => id !== fs.id));
                              } else {
                                setCheckedStructureIds(prev => [...prev, fs.id]);
                              }
                            }}
                            className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 w-3.5 h-3.5"
                          />
                          <span className="text-xs">{fs.fee_name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-550">Rs {Number(fs.amount).toLocaleString()}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">MONTHLY FEE *</label>
              <input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                required
                placeholder="Enter fee amount"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-650 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">PREVIOUS BALANCE</label>
              <div className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-amber-600 flex items-center">
                Rs {previousBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {previousBalance > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-700">Total Invoice Amount:</span>
                <span className="text-purple-700 text-lg">
                  Rs {(parseFloat(feeAmount || '0') + previousBalance).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bankCopy}
                onChange={(e) => setBankCopy(e.target.checked)}
                className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 cursor-pointer"
              />
              Bank Copy
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={studentCopy}
                onChange={(e) => setStudentCopy(e.target.checked)}
                className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 cursor-pointer"
              />
              Student Copy
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={instituteCopy}
                onChange={(e) => setInstituteCopy(e.target.checked)}
                className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 cursor-pointer"
              />
              Institute Copy
            </label>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
            >
              Generate Invoice{activeTab === 'class' ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChallanSlipCard({
  copyName,
  invoice,
  fatherName,
  bankObj
}: {
  copyName: string;
  invoice: any;
  fatherName: string;
  bankObj: any;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 print:border-slate-300 print:shadow-none print:rounded-none">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xl">🏫</span>
          <div className="leading-tight">
            <h4 className="font-black text-[10px] text-slate-800 uppercase tracking-wider">Institute Name</h4>
          </div>
        </div>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{invoice.invoice_number}</span>
      </div>

      <div className="grid grid-cols-12 gap-3 text-[10px]">
        <div className="col-span-6 space-y-2 border-r border-slate-100 pr-3">
          <div className="space-y-1 text-slate-700 font-semibold">
            <div className="flex justify-between">
              <span className="text-slate-400">Student ID:</span>
              <span className="font-extrabold text-slate-800">{invoice.student_id_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Student Name:</span>
              <span className="font-extrabold text-slate-800">{invoice.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Father Name:</span>
              <span className="text-slate-800 truncate max-w-[80px]" title={fatherName}>{fatherName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Class:</span>
              <span className="text-slate-800">{invoice.class_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fee Month:</span>
              <span className="text-slate-800">{invoice.fee_month}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Date:</span>
              <span className="text-slate-800">{formatDate(invoice.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Due Date:</span>
              <span className="text-slate-800">{formatDate(invoice.due_date)}</span>
            </div>
            {invoice.transferred_from && (
              <div className="flex justify-between text-amber-600">
                <span className="text-slate-400">Transferred From:</span>
                <span className="font-extrabold">{invoice.transferred_from}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-100 py-0.5 text-center rounded-md font-black text-slate-700 uppercase tracking-widest text-[9px] border border-slate-200/50">
            {copyName}
          </div>

          <div className="space-y-0.5 text-[9px] font-semibold text-slate-650">
            <div className="flex justify-between">
              <span className="text-slate-400">Bank Name:</span>
              <span className="font-bold text-slate-800 uppercase">{bankObj.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Address:</span>
              <span className="text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px]" title={bankObj.branchAddress}>{bankObj.branchAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Account#:</span>
              <span className="font-mono text-slate-800">{bankObj.accountNumber}</span>
            </div>
          </div>

          <div className="flex flex-col items-center pt-1">
            <div className="flex gap-0.5 h-6 select-none opacity-80">
              {[1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 1, 3, 1].map((w, i) => (
                <div key={i} className="bg-black" style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>

          <div className="text-[8px] font-bold text-slate-400 text-center">
            Instructions: - no
          </div>
        </div>

        <div className="col-span-6 flex flex-col justify-between pl-1">
          <div className="space-y-1 border-b border-slate-100 pb-2">
            <div className="grid grid-cols-12 font-black text-slate-400 uppercase tracking-wider text-[8px] border-b border-slate-100 pb-1 mb-1">
              <span className="col-span-2">Sr.</span>
              <span className="col-span-6">Particulars</span>
              <span className="col-span-4 text-right">Amount</span>
            </div>
            
            <ParticularRow sr={1} name="MONTHLY FEE" amount={invoice.breakdown?.tuition !== undefined ? invoice.breakdown.tuition : invoice.amount} />
            <ParticularRow sr={2} name="PREVIOUS BALANCE" amount={invoice.previous_balance || 0} />
            <ParticularRow sr={3} name="ADMISSION FEE" amount={invoice.breakdown?.admission || 0} />
            <ParticularRow sr={4} name="REGISTRATION FEE" amount={invoice.breakdown?.registration || 0} />
            <ParticularRow sr={5} name="ART MATERIAL" amount={invoice.breakdown?.art || 0} />
            <ParticularRow sr={6} name="TRANSPORT" amount={invoice.breakdown?.transport || 0} />
            <ParticularRow sr={7} name="BOOKS" amount={invoice.breakdown?.books || 0} />
            <ParticularRow sr={8} name="UNIFORM" amount={invoice.breakdown?.uniform || 0} />
            <ParticularRow sr={9} name="FINE" amount={invoice.fine_after_due_date} />
            <ParticularRow sr={10} name="OTHERS" amount={invoice.breakdown?.others || 0} />
            <ParticularRow 
              sr={11} 
              name={invoice.discount_amount > 0 ? `DISCOUNT ${invoice.scholarship_name ? `(${invoice.scholarship_name})` : ''}` : "DISCOUNT IN FEE 0%"} 
              amount={invoice.discount_amount > 0 ? -invoice.discount_amount : 0} 
            />
          </div>

          <div className="space-y-1 text-right pt-2">
            <div className="flex justify-between font-bold text-slate-500">
              <span>TOTAL</span>
              <span className="font-extrabold text-slate-800">Rs {invoice.total_amount || invoice.amount}</span>
            </div>
            <div className="flex justify-between font-black text-purple-800 text-[10px] leading-tight">
              <span>PAYABLE AFTER DUE DATE</span>
              <span>Rs {(invoice.total_amount || invoice.amount) + (invoice.fine_after_due_date || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ParticularRow({ sr, name, amount }: { sr: number; name: string; amount: number }) {
  return (
    <div className={`grid grid-cols-12 font-semibold ${amount > 0 ? 'text-slate-700 font-extrabold' : 'text-slate-350'}`}>
      <span className="col-span-2 text-slate-400">{sr}</span>
      <span className="col-span-6 truncate">{name}</span>
      <span className="col-span-4 text-right">Rs {amount}</span>
    </div>
  );
}