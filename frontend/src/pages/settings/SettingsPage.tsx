import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, Receipt, Landmark, BookOpenCheck, Award, 
  Palette, ShieldCheck, Lock, Unlock, Save, Plus, Trash2, Edit, CheckCircle2, Upload, Eye, EyeOff, AlertTriangle, Check, RotateCcw, HelpCircle, User, Calendar, Tag, Mail, Briefcase, List, ListOrdered, Bold, Underline, Italic, Type, GraduationCap
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import financeService from '@/services/finance.service';
import classSectionService from '@/services/classSection.service';

import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStudent = role === 'student';

  const getSubPath = () => {
    if (isStudent) return 'account';
    const path = location.pathname.replace(/\/$/, '');
    if (path.endsWith('/profile')) return 'profile';
    if (path.endsWith('/fee-particulars')) return 'fee-particulars';
    if (path.endsWith('/fee-structure')) return 'fee-structure';
    if (path.endsWith('/discount-type')) return 'discount-type';
    if (path.endsWith('/bank-accounts')) return 'bank-accounts';
    if (path.endsWith('/rules')) return 'rules';
    if (path.endsWith('/grading')) return 'grading';
    if (path.endsWith('/theme')) return 'theme';
    if (path.endsWith('/account')) return 'account';
    return 'grid';
  };

  const currentView = getSubPath();

  return (
    <div className="space-y-4 bg-slate-50 min-h-screen p-2 text-slate-800">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700">
          {isStudent ? (
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/student')}>Student Dashboard</span>
          ) : (
            <span className="cursor-pointer hover:underline" onClick={() => navigate('/settings')}>General Settings</span>
          )}
          {currentView !== 'grid' && (
            <>
              <span>&gt;</span>
              <span className="text-slate-500 capitalize">
                {currentView === 'fee-particulars' ? 'Fee Particulars' :
                 currentView === 'bank-accounts' ? 'Fee Challan Details' :
                 currentView === 'rules' ? 'Rules' :
                 currentView === 'grading' ? 'Exam Grading' :
                 currentView === 'theme' ? 'Theme & Language' :
                 currentView === 'account' ? 'Account Settings' :
                 currentView.replace('-', ' ')}
              </span>
            </>
          )}
        </div>

        {currentView === 'fee-particulars' && (
          <div className="flex items-center gap-3">
            <button className="text-slate-400 hover:text-purple-600 p-1 rounded-full hover:bg-slate-50">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={() => toast.info('Reset to default values.')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
            </button>
          </div>
        )}
      </div>

      {/* View Router */}
      {currentView === 'grid' && <SettingsGridOverview onSelectTab={(id) => navigate(`/settings/${id}`)} />}
      {currentView === 'profile' && <InstituteProfileView />}
      {currentView === 'fee-particulars' && <FeeParticularsView />}
      {currentView === 'fee-structure' && <FeeStructureView />}
      {currentView === 'discount-type' && <DiscountTypeView />}
      {currentView === 'bank-accounts' && <FeeChallanDetailsView />}
      {currentView === 'rules' && <RulesView />}
      {currentView === 'grading' && <ExamGradingView />}
      {currentView === 'theme' && <ThemeLanguageView />}
      {currentView === 'account' && <AccountSettingsView />}
    </div>
  );
}

/* Overview Dashboard Grid */
function SettingsGridOverview({ onSelectTab }: { onSelectTab: (id: string) => void }) {
  const items = [
    { id: 'profile', title: 'Institute Profile', icon: Building2 },
    { id: 'fee-particulars', title: 'Fee Particulars', icon: Receipt },
    { id: 'fee-structure', title: 'Fee Structure', icon: Receipt, isLocked: true },
    { id: 'discount-type', title: 'Discount Type', icon: Tag, isLocked: true },
    { id: 'bank-accounts', title: 'Accounts For Fees Invoice', icon: Landmark },
    { id: 'rules', title: 'Rules & Regulations', icon: BookOpenCheck },
    { id: 'grading', title: 'Marks Grading', icon: Award },
    { id: 'theme', title: 'Theme & Language', icon: Palette },
    { id: 'account', title: 'Account Settings', icon: ShieldCheck },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">General Settings</h2>
          <p className="text-xs text-slate-500">Configure institutional parameters, branding, bank accounts, and grading standards.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-500 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-700">{item.title}</span>
              </div>
              {item.isLocked && <Unlock className="w-4 h-4 text-emerald-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Institute Profile View */
function InstituteProfileView() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '', targetLine: '', phone: '', website: '', address: '', country: 'Pakistan', logoUrl: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('institute_profile');
    if (saved) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.log('Error parsing saved profile');
      }
    }

    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.profile) {
        setFormData(prev => ({ ...prev, ...res.data.profile }));
      }
    }).catch(err => console.log('Backend settings endpoint fallback'));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Logo image size must be under 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setFormData(prev => ({ ...prev, logoUrl: result }));
      toast.success('Logo uploaded successfully! Click Update Profile to save.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await api.put(API_ENDPOINTS.SETTINGS, { profile: formData });
    } catch (err) {
      console.log('Backend save fallback');
    }

    localStorage.setItem('institute_profile', JSON.stringify(formData));
    toast.success('Profile updated and saved successfully!');
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleLogoUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="flex items-center gap-2 text-purple-700 font-bold text-sm border-b border-slate-100 pb-3">
        <Edit className="w-4 h-4" />
        <span>Update Profile</span>
      </div>

      <p className="text-[11px] text-rose-500 font-medium">* Indicates required fields</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">INSTITUTE LOGO</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-slate-200 bg-blue-50 flex flex-col items-center justify-center text-center p-2 overflow-hidden">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] font-extrabold text-blue-600 leading-tight">YOUR LOGO HERE</span>
                )}
              </div>
              <div className="space-y-1">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 text-purple-600 text-xs font-semibold hover:bg-purple-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Change Logo
                </button>
                <p className="text-[10px] text-slate-400">JPG, PNG, Max 500KB</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">NAME OF INSTITUTE *</label>
            <Input placeholder="Institute Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200" />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">TARGET LINE *</label>
            <Input placeholder="Target Line" value={formData.targetLine} onChange={(e) => setFormData({ ...formData, targetLine: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PHONE NUMBER *</label>
            <Input placeholder="Phone No" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200" />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">WEBSITE</label>
            <Input placeholder="Website URL" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200" />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">ADDRESS *</label>
            <Input placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200" />
          </div>

          <div>
            <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">COUNTRY *</label>
            <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Select Country</option>
              <option value="Pakistan">Pakistan</option>
              <option value="India">India</option>
              <option value="United States">United States</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
          <Edit className="w-4 h-4" /> Update Profile
        </button>
      </div>
    </div>
  );
}

/* Fee Particulars View */
function FeeParticularsView() {
  const [targetGroup, setTargetGroup] = useState('All Students');
  const [particulars, setParticulars] = useState([
    { label: 'MONTHLY TUITION FEE', amount: '[FIXED]', isFixed: true },
    { label: 'ADMISSION FEE', amount: '0', isFixed: false },
    { label: 'REGISTRATION FEE', amount: '0', isFixed: false },
    { label: 'ART MATERIAL', amount: '0', isFixed: false },
    { label: 'TRANSPORT', amount: '0', isFixed: false },
    { label: 'BOOKS', amount: '0', isFixed: false },
    { label: 'UNIFORM', amount: '0', isFixed: false },
    { label: 'FINE', amount: '0', isFixed: false },
    { label: 'OTHERS', amount: '0', isFixed: false },
    { label: 'PREVIOUS BALANCE', amount: '[FIXED]', isFixed: true },
    { label: 'DISCOUNT IN FEE [FIXED]', amount: '[FIXED]', isFixed: true },
  ]);

  useEffect(() => {
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.feeParticulars) {
        setTargetGroup(res.data.feeParticulars.targetGroup || 'All Students');
        if (res.data.feeParticulars.particulars) setParticulars(res.data.feeParticulars.particulars);
      }
    }).catch(err => console.error('Failed to load fee particulars:', err));
  }, []);

  const handleSave = async () => {
    try {
      await api.put(API_ENDPOINTS.SETTINGS, { feeParticulars: { targetGroup, particulars } });
      toast.success('Fee Particulars saved to database!');
    } catch (err) {
      toast.error('Failed to save fee particulars.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 max-w-5xl">
      <div className="flex items-center gap-2 text-purple-700 font-bold text-sm border-b border-slate-100 pb-3">
        <Receipt className="w-4 h-4" />
        <span>Change Fee Particulars</span>
      </div>

      <div className="w-full md:w-1/2">
        <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">FEE PARTICULARS FOR *</label>
        <select 
          value={targetGroup}
          onChange={(e) => setTargetGroup(e.target.value)}
          className="w-full h-10 rounded-xl border border-purple-400 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
        >
          <option value="All Students">All Students</option>
          <option value="Specific Class">Specific Class</option>
          <option value="Specific Student">Specific Student</option>
        </select>
      </div>

      <div className="space-y-4">
        {particulars.map((p, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">PARTICULAR LABEL {!p.isFixed && '*'}</label>
              <Input 
                value={p.label} 
                onChange={(e) => { const updated = [...particulars]; updated[idx].label = e.target.value; setParticulars(updated); }} 
                className="text-xs h-10 rounded-xl border-slate-200 uppercase bg-slate-50/40 w-full" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">PREFIX AMOUNT {!p.isFixed && '*'}</label>
              <Input 
                value={p.amount} 
                disabled={p.isFixed} 
                onChange={(e) => { const updated = [...particulars]; updated[idx].amount = e.target.value; setParticulars(updated); }} 
                className={`text-xs h-10 rounded-xl border-slate-200 w-full ${p.isFixed ? 'bg-slate-100/80 text-slate-400 font-semibold' : ''}`} 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
          <CheckCircle2 className="w-4 h-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}

/* Fee Structure View */
function FeeStructureView() {
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [classRef, setClassRef] = useState('');
  const [section, setSection] = useState('');
  const [feeName, setFeeName] = useState('MONTHLY TUITION FEE');
  const [customFeeName, setCustomFeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  
  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all structures and classes on mount
  useEffect(() => {
    fetchClasses();
    fetchStructures();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await classSectionService.getClassesWithSections();
      if (res && res.data) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const fetchStructures = async () => {
    setLoading(true);
    try {
      const res = await financeService.getFeeStructures();
      setFeeStructures(extractListData(res.data));
    } catch (err) {
      console.error('Failed to load fee structures:', err);
      toast.error('Failed to load fee structures.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setClassRef(classes[0]?.id || '');
    setSection('');
    setFeeName('MONTHLY TUITION FEE');
    setCustomFeeName('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setAcademicYear('2026-2027');
    setIsRecurring(false);
    setFrequency('monthly');
    setShowModal(true);
  };

  const handleOpenEdit = (fs: any) => {
    setEditingId(fs.id);
    setClassRef(fs.class_ref || '');
    setSection(fs.section || '');
    
    const standardFees = [
      'MONTHLY TUITION FEE', 'ADMISSION FEE', 'REGISTRATION FEE', 
      'ART MATERIAL', 'TRANSPORT', 'BOOKS', 'UNIFORM', 'FINE', 'OTHERS'
    ];
    const upperFee = (fs.fee_name || '').toUpperCase();
    if (standardFees.includes(upperFee)) {
      setFeeName(upperFee);
      setCustomFeeName('');
    } else {
      setFeeName('CUSTOM');
      setCustomFeeName(fs.fee_name || '');
    }
    
    setAmount(fs.amount || '');
    setDueDate(fs.due_date || '');
    setAcademicYear(fs.academic_year || '2026-2027');
    setIsRecurring(!!fs.is_recurring);
    setFrequency(fs.frequency || 'monthly');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;
    try {
      await financeService.deleteFeeStructure(id);
      toast.success('Fee structure deleted successfully.');
      fetchStructures();
    } catch (err) {
      console.error('Failed to delete fee structure:', err);
      toast.error('Failed to delete fee structure.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classRef) return toast.error('Please select a class.');
    
    const finalFeeName = feeName === 'CUSTOM' ? customFeeName : feeName;
    if (!finalFeeName) return toast.error('Please specify a fee name.');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return toast.error('Please enter a valid amount.');
    }
    if (!dueDate) return toast.error('Please select a due date.');

    const payload = {
      class_ref: classRef,
      section: section || null,
      fee_name: finalFeeName.toUpperCase(),
      amount: Number(amount),
      due_date: dueDate,
      academic_year: academicYear,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency : 'yearly'
    };

    try {
      if (editingId) {
        await financeService.updateFeeStructure(editingId, payload);
        toast.success('Fee structure updated successfully.');
      } else {
        await financeService.createFeeStructure(payload);
        toast.success('Fee structure created successfully.');
      }
      setShowModal(false);
      fetchStructures();
    } catch (err) {
      console.error('Failed to save fee structure:', err);
      toast.error('Failed to save fee structure.');
    }
  };

  // Find sections of currently selected class in form
  const selectedClassObj = classes.find(c => c.id === classRef);
  const activeSections = selectedClassObj?.sections || [];

  // Filter list
  const filteredStructures = feeStructures.filter(fs => {
    const matchesClass = filterClass ? fs.class_ref === filterClass : true;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery 
      ? (fs.fee_name || '').toLowerCase().includes(searchLower) || (fs.class_name || '').toLowerCase().includes(searchLower)
      : true;
    return matchesClass && matchesSearch;
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 max-w-6xl relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5 text-purple-700">
          <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Fee Structures</h2>
            <p className="text-xs text-slate-400">Configure tuition fees and structural charges per class/section</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Add Fee Structure
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto md:flex md:items-center flex-1">
          <div className="w-full md:w-72">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Search Fee Name or Class</label>
            <input 
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Filter by Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs text-slate-700 font-semibold"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-semibold self-end md:self-center">
          Showing {filteredStructures.length} of {feeStructures.length} structures
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading fee structures...</div>
      ) : filteredStructures.length === 0 ? (
        <div className="py-20 text-center border border-slate-100 rounded-xl space-y-2">
          <Receipt className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-xs text-slate-400 font-semibold">No fee structures found.</p>
          <p className="text-[11px] text-slate-400">Click "Add Fee Structure" to set up your first structural class charge.</p>
        </div>
      ) : (
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Class / Section</th>
                  <th className="p-3.5">Fee Name</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Academic Year</th>
                  <th className="p-3.5">Frequency</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredStructures.map((fs) => {
                  const sectionObj = classes.find(c => c.id === fs.class_ref)?.sections?.find((s: any) => s.id === fs.section);
                  const sectionName = sectionObj ? sectionObj.name : 'All Sections';

                  return (
                    <tr key={fs.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">
                        {fs.class_name || 'N/A'} 
                        <span className="text-[10px] text-slate-400 font-normal ml-1.5">({sectionName})</span>
                      </td>
                      <td className="p-3.5 font-semibold text-purple-700 uppercase tracking-wide text-[10px]">{fs.fee_name}</td>
                      <td className="p-3.5 font-bold text-slate-700">PKR {Number(fs.amount).toLocaleString()}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">{fs.due_date}</td>
                      <td className="p-3.5 text-slate-500">{fs.academic_year}</td>
                      <td className="p-3.5">
                        {fs.is_recurring ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md font-semibold text-[10px] capitalize">
                            {fs.frequency}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 rounded-md font-semibold text-[10px]">
                            One-Time
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(fs)} 
                            className="text-slate-400 hover:text-purple-600 p-1 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(fs.id)} 
                            className="text-slate-400 hover:text-rose-600 p-1 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                {editingId ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Class *</label>
                  <select
                    value={classRef}
                    onChange={(e) => { setClassRef(e.target.value); setSection(''); }}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                    required
                  >
                    <option value="" disabled>Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Section (Optional)</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                  >
                    <option value="">All Sections</option>
                    {activeSections.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fee Particular *</label>
                  <select
                    value={feeName}
                    onChange={(e) => setFeeName(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                    required
                  >
                    <option value="MONTHLY TUITION FEE">Monthly Tuition Fee</option>
                    <option value="ADMISSION FEE">Admission Fee</option>
                    <option value="REGISTRATION FEE">Registration Fee</option>
                    <option value="ART MATERIAL">Art Material</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="BOOKS">Books</option>
                    <option value="UNIFORM">Uniform</option>
                    <option value="FINE">Fine</option>
                    <option value="OTHERS">Others</option>
                    <option value="CUSTOM">Custom Name...</option>
                  </select>
                </div>

                {feeName === 'CUSTOM' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Custom Fee Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Exam Fee"
                      value={customFeeName}
                      onChange={(e) => setCustomFeeName(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year</label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                    >
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2027-2028">2027-2028</option>
                    </select>
                  </div>
                )}
              </div>

              {feeName === 'CUSTOM' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Recurring Charge</label>
                  <p className="text-[10px] text-slate-400">Generate invoice automatically based on frequency</p>
                </div>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4.5 h-4.5 accent-purple-600 rounded-sm cursor-pointer"
                />
              </div>

              {isRecurring && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Frequency *</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Discount Type View */
function DiscountTypeView() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scholarshipType, setScholarshipType] = useState('percentage');
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [applicableClasses, setApplicableClasses] = useState<string[]>([]);

  // Search / Filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchDiscounts();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await classSectionService.getClassesWithSections();
      if (res && res.data) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await financeService.getScholarships();
      setDiscounts(extractListData(res.data));
    } catch (err) {
      console.error('Failed to load discounts:', err);
      toast.error('Failed to load discount types.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setScholarshipType('percentage');
    setValue('');
    setValidFrom(new Date().toISOString().split('T')[0]);
    setValidUntil('');
    setIsActive(true);
    setApplicableClasses([]);
    setShowModal(true);
  };

  const handleOpenEdit = (d: any) => {
    setEditingId(d.id);
    setName(d.name || '');
    setDescription(d.description || '');
    setScholarshipType(d.scholarship_type || 'percentage');
    setValue(d.value !== undefined && d.value !== null ? String(d.value) : '');
    setValidFrom(d.valid_from || '');
    setValidUntil(d.valid_until || '');
    setIsActive(!!d.is_active);
    setApplicableClasses(d.applicable_classes || []);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount type?')) return;
    try {
      await financeService.deleteScholarship(id);
      toast.success('Discount type deleted successfully.');
      fetchDiscounts();
    } catch (err) {
      console.error('Failed to delete discount:', err);
      toast.error('Failed to delete discount type.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter a name.');
    if (!validFrom) return toast.error('Please select a Valid From date.');
    
    if (scholarshipType !== 'fee_waiver') {
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        return toast.error('Please enter a valid amount or percentage value.');
      }
      if (scholarshipType === 'percentage' && Number(value) > 100) {
        return toast.error('Percentage discount cannot exceed 100%.');
      }
    }

    if (validUntil && new Date(validUntil) < new Date(validFrom)) {
      return toast.error('Valid Until date must be on or after Valid From date.');
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      scholarship_type: scholarshipType,
      value: scholarshipType === 'fee_waiver' ? 100 : Number(value),
      is_active: isActive,
      valid_from: validFrom,
      valid_until: validUntil || null,
      applicable_classes: applicableClasses
    };

    try {
      if (editingId) {
        await financeService.updateScholarship(editingId, payload);
        toast.success('Discount type updated successfully.');
      } else {
        await financeService.createScholarship(payload);
        toast.success('Discount type created successfully.');
      }
      setShowModal(false);
      fetchDiscounts();
    } catch (err) {
      console.error('Failed to save discount:', err);
      toast.error('Failed to save discount type.');
    }
  };

  const handleToggleClass = (classId: string) => {
    if (applicableClasses.includes(classId)) {
      setApplicableClasses(applicableClasses.filter(id => id !== classId));
    } else {
      setApplicableClasses([...applicableClasses, classId]);
    }
  };

  // Filter list
  const filteredDiscounts = discounts.filter(d => {
    const searchLower = searchQuery.toLowerCase();
    return searchQuery 
      ? (d.name || '').toLowerCase().includes(searchLower) || (d.description || '').toLowerCase().includes(searchLower)
      : true;
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 max-w-6xl relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5 text-purple-700">
          <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Discount Types</h2>
            <p className="text-xs text-slate-400">Manage fee waivers, percentage, and fixed amount discounts</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Add Discount Type
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div className="w-full md:w-80">
          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Search Discount Type</label>
          <input 
            type="text"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs"
          />
        </div>
        <div className="text-xs text-slate-400 font-semibold self-end md:self-center">
          Showing {filteredDiscounts.length} of {discounts.length} discount types
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading discount types...</div>
      ) : filteredDiscounts.length === 0 ? (
        <div className="py-20 text-center border border-slate-100 rounded-xl space-y-2">
          <Tag className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-xs text-slate-400 font-semibold">No discount types found.</p>
          <p className="text-[11px] text-slate-400">Click "Add Discount Type" to set up your first waiver or scholarship discount.</p>
        </div>
      ) : (
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Discount Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Value</th>
                  <th className="p-3.5">Valid From</th>
                  <th className="p-3.5">Valid Until</th>
                  <th className="p-3.5">Applicable Classes</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredDiscounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{d.name}</div>
                      {d.description && <div className="text-[10px] text-slate-400 font-normal max-w-xs truncate">{d.description}</div>}
                    </td>
                    <td className="p-3.5">
                      <span className="capitalize font-semibold text-[10px]">
                        {d.scholarship_type === 'percentage' ? 'Percentage' :
                         d.scholarship_type === 'fixed' ? 'Fixed Amount' : 'Full Waiver'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-700">
                      {d.scholarship_type === 'percentage' ? `${d.value}%` :
                       d.scholarship_type === 'fixed' ? `PKR ${Number(d.value).toLocaleString()}` : '100% Waiver'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{d.valid_from}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{d.valid_until || 'No Limit'}</td>
                    <td className="p-3.5 text-slate-500 max-w-[150px] truncate">
                      {d.applicable_classes_names && d.applicable_classes_names.length > 0 ? (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-md font-semibold text-[10px] border border-purple-100">
                          {d.applicable_classes_names.join(', ')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">All Classes</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {d.is_active ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-md font-semibold text-[10px]">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-md font-semibold text-[10px]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(d)} 
                          className="text-slate-400 hover:text-purple-600 p-1 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(d.id)} 
                          className="text-slate-400 hover:text-rose-600 p-1 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                {editingId ? 'Edit Discount Type' : 'Add Discount Type'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-650 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Discount Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sibling Discount"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details about this scholarship or waiver discount..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Discount Type *</label>
                  <select
                    value={scholarshipType}
                    onChange={(e) => setScholarshipType(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs font-semibold text-slate-700"
                    required
                  >
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed">Fixed Amount Discount</option>
                    <option value="fee_waiver">Full Fee Waiver</option>
                  </select>
                </div>

                {scholarshipType !== 'fee_waiver' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      {scholarshipType === 'percentage' ? 'Percentage (%) *' : 'Fixed Amount (PKR) *'}
                    </label>
                    <input
                      type="number"
                      placeholder={scholarshipType === 'percentage' ? 'e.g. 15' : 'e.g. 1000'}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      required
                      min="1"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Waiver Value</label>
                    <input
                      type="text"
                      value="100% Waiver"
                      disabled
                      className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 font-semibold px-3 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valid From *</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valid Until (Optional)</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Applicable Classes (Optional - Default All)</label>
                <div className="border border-slate-100 rounded-xl max-h-36 overflow-y-auto p-3.5 space-y-2 bg-slate-50/50">
                  {classes.length === 0 ? (
                    <div className="text-slate-400 text-xs italic">No classes available</div>
                  ) : (
                    classes.map((cls) => (
                      <label key={cls.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={applicableClasses.includes(cls.id)}
                          onChange={() => handleToggleClass(cls.id)}
                          className="w-4 h-4 accent-purple-600 cursor-pointer rounded-sm"
                        />
                        <span>{cls.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Status</label>
                  <p className="text-[10px] text-slate-400">Toggle whether this discount can be assigned to students</p>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4.5 h-4.5 accent-purple-600 rounded-sm cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Fee Challan Details View */
function FeeChallanDetailsView() {
  interface BankItem {
    id: number;
    name: string;
    logo: string;
    accountNo: string;
    branchAddress: string;
    instructions: string;
  }

  const [banks, setBanks] = useState<BankItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [bankName, setBankName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [instructions, setInstructions] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const bankFileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bank_details');
    if (saved) {
      try {
        setBanks(JSON.parse(saved));
      } catch (e) {
        console.log('Error parsing bank details');
      }
    } else {
      // Default placeholder matching user screenshot
      const defaultBanks = [
        {
          id: 1,
          name: 'hbl',
          logo: 'https://images.unsplash.com/photo-1628527264098-f29450945a67?w=80',
          accountNo: '343546535356555',
          branchAddress: 'Karachi, Pakistan',
          instructions: 'Please pay fee on or before due date.'
        }
      ];
      setBanks(defaultBanks);
      localStorage.setItem('bank_details', JSON.stringify(defaultBanks));
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Logo image size must be under 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
      toast.success('Bank logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBank = async () => {
    if (!bankName) return toast.error('Please enter Bank Name.');
    if (!branchAddress) return toast.error('Please enter Branch Address.');
    if (!accountNo) return toast.error('Please enter Account Number.');

    let updatedBanks: BankItem[] = [];

    if (editingId !== null) {
      updatedBanks = banks.map(b => Number(b.id) === Number(editingId) ? {
        id: b.id,
        name: bankName,
        logo: logoUrl || b.logo || 'https://images.unsplash.com/photo-1628527264098-f29450945a67?w=80',
        accountNo,
        branchAddress,
        instructions
      } : b);
      setEditingId(null);
      toast.success('Bank details updated successfully!');
    } else {
      const newBank: BankItem = {
        id: Date.now(),
        name: bankName,
        logo: logoUrl || 'https://images.unsplash.com/photo-1628527264098-f29450945a67?w=80',
        accountNo,
        branchAddress,
        instructions
      };
      updatedBanks = [...banks, newBank];
      toast.success('Bank added successfully!');
    }

    setBanks(updatedBanks);
    localStorage.setItem('bank_details', JSON.stringify(updatedBanks));

    // Reset Form
    setBankName('');
    setBranchAddress('');
    setAccountNo('');
    setInstructions('');
    setLogoUrl('');

    try {
      await api.put(API_ENDPOINTS.SETTINGS, { banks: updatedBanks });
    } catch (e) {
      console.log('Backend save bank fallback');
    }
  };

  const handleEditClick = (b: BankItem) => {
    setEditingId(b.id);
    setBankName(b.name);
    setBranchAddress(b.branchAddress || '');
    setAccountNo(b.accountNo);
    setInstructions(b.instructions || '');
    setLogoUrl(b.logo || '');
  };

  const handleDeleteClick = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank?')) return;
    const updated = banks.filter(b => b.id !== id);
    setBanks(updated);
    localStorage.setItem('bank_details', JSON.stringify(updated));
    toast.success('Bank deleted successfully');

    try {
      await api.put(API_ENDPOINTS.SETTINGS, { banks: updated });
    } catch (e) {
      console.log('Backend delete bank fallback');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <input 
        type="file" 
        ref={bankFileInputRef} 
        onChange={handleLogoUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="md:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
          <Plus className="w-4 h-4 text-purple-600" /> {editingId !== null ? 'Update Bank' : 'Add New Bank'}
        </h3>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">BANK LOGO *</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Landmark className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <button 
              type="button"
              onClick={() => bankFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 text-purple-600 text-xs font-semibold hover:bg-purple-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Choose Logo
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">BANK NAME *</label>
          <Input placeholder="Your Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="text-xs h-9 rounded-xl border-slate-200" />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">BANK / BRANCH ADDRESS *</label>
          <Input placeholder="Bank Address" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} className="text-xs h-9 rounded-xl border-slate-200" />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">ACCOUNT NUMBER *</label>
          <Input placeholder="Bank Account No" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className="text-xs h-9 rounded-xl border-slate-200" />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">INSTRUCTIONS</label>
          <textarea rows={3} placeholder="Write Instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <button onClick={handleSaveBank} className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all">
          <Plus className="w-4 h-4" /> {editingId !== null ? 'Update Bank' : 'Add Bank'}
        </button>
      </div>

      <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-3">BANK NAME</th>
                <th className="p-3">LOGO</th>
                <th className="p-3">ACCOUNT NO.</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {banks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-slate-400">
                    <Landmark className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <span>No banks found.</span>
                  </td>
                </tr>
              ) : (
                banks.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 font-semibold">{b.name}</td>
                    <td className="p-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                        <img src={b.logo} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    </td>
                    <td className="p-3 font-mono">{b.accountNo}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleEditClick(b)} className="text-slate-400 hover:text-purple-600 p-1 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteClick(b.id)} className="text-slate-400 hover:text-rose-600 p-1 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Rules View */
function RulesView() {
  const [studentRules, setStudentRules] = useState('be in time');
  const [employeeRules, setEmployeeRules] = useState('');

  const studentRef = React.useRef<HTMLDivElement>(null);
  const employeeRef = React.useRef<HTMLDivElement>(null);

  const [showColorStudent, setShowColorStudent] = useState(false);
  const [showSizeStudent, setShowSizeStudent] = useState(false);
  const [showColorEmployee, setShowColorEmployee] = useState(false);
  const [showSizeEmployee, setShowSizeEmployee] = useState(false);

  const colors = [
    { name: 'Default', value: '#334155', bg: 'bg-slate-700' },
    { name: 'Red', value: '#EF4444', bg: 'bg-red-500' },
    { name: 'Yellow', value: '#EAB308', bg: 'bg-yellow-500' },
    { name: 'Green', value: '#10B981', bg: 'bg-emerald-500' },
    { name: 'Blue', value: '#3B82F6', bg: 'bg-blue-500' },
    { name: 'Purple', value: '#8B5CF6', bg: 'bg-purple-500' }
  ];

  const sizes = [
    { label: '12', value: '3' },
    { label: '14', value: '4' },
    { label: '16', value: '4.5' },
    { label: '18', value: '5' },
    { label: '20', value: '6' },
    { label: '24', value: '7' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('rules_settings');
    let localStudent = 'be in time';
    let localEmployee = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        localStudent = parsed.studentRules || 'be in time';
        localEmployee = parsed.employeeRules || '';
        setStudentRules(localStudent);
        setEmployeeRules(localEmployee);
        if (studentRef.current) studentRef.current.innerHTML = localStudent;
        if (employeeRef.current) employeeRef.current.innerHTML = localEmployee;
      } catch (e) {
        console.log('Error parsing rules settings');
      }
    } else {
      if (studentRef.current) studentRef.current.innerHTML = 'be in time';
    }

    // Load canonical rules from backend settings
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.rules) {
        const rules = res.data.rules;
        setStudentRules(rules.studentRules || '');
        setEmployeeRules(rules.employeeRules || '');
        if (studentRef.current) studentRef.current.innerHTML = rules.studentRules || '';
        if (employeeRef.current) employeeRef.current.innerHTML = rules.employeeRules || '';
        localStorage.setItem('rules_settings', JSON.stringify(rules));
      }
    }).catch(err => console.log('Backend settings API failed, using localStorage fallback.'));
  }, []);

  const handleSave = async () => {
    const sHTML = studentRef.current?.innerHTML || '';
    const eHTML = employeeRef.current?.innerHTML || '';
    const data = { studentRules: sHTML, employeeRules: eHTML };
    localStorage.setItem('rules_settings', JSON.stringify(data));

    try {
      await api.put(API_ENDPOINTS.SETTINGS, { rules: data });
    } catch (err) {
      console.log('Backend rules save fallback');
    }

    toast.success('Rules & Regulations saved successfully!');
  };

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="space-y-6">
      <style>{`
        .rich-editor-content ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          display: block !important;
        }
        .rich-editor-content ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          display: block !important;
        }
        .rich-editor-content li {
          display: list-item !important;
        }
        .rich-editor-content font[size="3"] { font-size: 12px !important; }
        .rich-editor-content font[size="4"] { font-size: 14px !important; }
        .rich-editor-content font[size="4.5"] { font-size: 16px !important; }
        .rich-editor-content font[size="5"] { font-size: 18px !important; }
        .rich-editor-content font[size="6"] { font-size: 20px !important; }
        .rich-editor-content font[size="7"] { font-size: 24px !important; }
      `}</style>

      {/* Rules Grid: Student vs Employee Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Student Rules */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Student Rules & Regulations</h3>
              <p className="text-[11px] text-slate-400">Displayed on the Admission Letter</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">RULES FOR STUDENTS *</label>
              
              {/* Format Control Bar */}
              <div className="border border-slate-200 rounded-t-xl bg-slate-50/50 p-2 flex flex-wrap items-center gap-1.5 border-b-0 relative">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs">B</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 underline text-xs">U</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 italic text-xs">I</button>
                
                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                {/* Color Button + Dropdown */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => { setShowColorStudent(!showColorStudent); setShowSizeStudent(false); }}
                    className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold"
                  >
                    <span className="px-1.5 py-0.5 bg-yellow-300 text-slate-700 rounded-sm font-bold">A</span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </button>

                  {showColorStudent && (
                    <div className="absolute top-8 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 z-30 w-28">
                      {colors.map((c) => (
                        <button 
                          key={c.value} 
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            executeCommand('foreColor', c.value);
                            setShowColorStudent(false);
                          }}
                          className={`w-6 h-6 rounded-md ${c.bg} border border-slate-100 hover:scale-110 transition-transform`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Size Button + Dropdown */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => { setShowSizeStudent(!showSizeStudent); setShowColorStudent(false); }}
                    className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold"
                  >
                    <span>18</span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </button>

                  {showSizeStudent && (
                    <div className="absolute top-8 left-0 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 w-20 flex flex-col">
                      {sizes.map((s) => (
                        <button 
                          key={s.value} 
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            executeCommand('fontSize', s.value);
                            setShowSizeStudent(false);
                          }}
                          className="w-full text-left px-3 py-1 text-xs hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          {s.label}px
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><List className="w-3.5 h-3.5" /></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><ListOrdered className="w-3.5 h-3.5" /></button>
              </div>

              {/* Rich Text Editor Div */}
              <div 
                ref={studentRef}
                contentEditable={true}
                className="w-full rounded-b-xl border border-slate-200 p-4 text-xs font-medium text-slate-700 min-h-[220px] outline-none focus:ring-2 focus:ring-purple-500 bg-white overflow-y-auto rich-editor-content"
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Employee Rules */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Employee Rules & Regulations</h3>
              <p className="text-[11px] text-slate-400">Displayed on the Job Letter</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">RULES FOR EMPLOYEES *</label>
              
              {/* Format Control Bar */}
              <div className="border border-slate-200 rounded-t-xl bg-slate-50/50 p-2 flex flex-wrap items-center gap-1.5 border-b-0 relative">
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 font-bold text-xs">B</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 underline text-xs">U</button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }} className="px-2.5 py-1 hover:bg-slate-200 rounded-lg text-slate-600 italic text-xs">I</button>
                
                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                {/* Color Button + Dropdown */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => { setShowColorEmployee(!showColorEmployee); setShowSizeEmployee(false); }}
                    className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold"
                  >
                    <span className="px-1.5 py-0.5 bg-yellow-300 text-slate-700 rounded-sm font-bold">A</span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </button>

                  {showColorEmployee && (
                    <div className="absolute top-8 left-0 bg-white border border-slate-200 rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 z-30 w-28">
                      {colors.map((c) => (
                        <button 
                          key={c.value} 
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            executeCommand('foreColor', c.value);
                            setShowColorEmployee(false);
                          }}
                          className={`w-6 h-6 rounded-md ${c.bg} border border-slate-100 hover:scale-110 transition-transform`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Size Button + Dropdown */}
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => { setShowSizeEmployee(!showSizeEmployee); setShowColorEmployee(false); }}
                    className="flex items-center gap-1 hover:bg-slate-200 px-2 py-0.5 rounded-lg text-xs font-semibold"
                  >
                    <span>14</span>
                    <span className="text-[10px] text-slate-400">▼</span>
                  </button>

                  {showSizeEmployee && (
                    <div className="absolute top-8 left-0 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 w-20 flex flex-col">
                      {sizes.map((s) => (
                        <button 
                          key={s.value} 
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            executeCommand('fontSize', s.value);
                            setShowSizeEmployee(false);
                          }}
                          className="w-full text-left px-3 py-1 text-xs hover:bg-slate-50 text-slate-700 font-semibold"
                        >
                          {s.label}px
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="w-px h-4 bg-slate-200 mx-1"></span>

                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><List className="w-3.5 h-3.5" /></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"><ListOrdered className="w-3.5 h-3.5" /></button>
              </div>

              {/* Rich Text Editor Div */}
              <div 
                ref={employeeRef}
                contentEditable={true}
                className="w-full rounded-b-xl border border-slate-200 p-4 text-xs font-medium text-slate-700 min-h-[220px] outline-none focus:ring-2 focus:ring-purple-500 bg-white overflow-y-auto rich-editor-content"
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Save Bar matching reference 100% */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>Both rules will be saved together when you click <strong className="text-slate-700">Save Changes</strong>.</span>
        </div>
        <button 
          onClick={handleSave} 
          className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          <Check className="w-4 h-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}

/* Exam Grading View */
function ExamGradingView() {
  const [activeTab, setActiveTab] = useState<'grading' | 'fail'>('grading');
  const [grades, setGrades] = useState([
    { id: 1, grade: 'A+', from: 80, upto: 100, status: 'PASS' },
    { id: 2, grade: 'A', from: 70, upto: 79, status: 'PASS' },
    { id: 3, grade: 'B+', from: 60, upto: 69, status: 'PASS' },
    { id: 4, grade: 'B', from: 50, upto: 59, status: 'PASS' },
    { id: 5, grade: 'C', from: 40, upto: 49, status: 'PASS' },
    { id: 6, grade: 'D', from: 33, upto: 39, status: 'PASS' },
    { id: 7, grade: 'F', from: 0, upto: 32, status: 'FAIL' },
  ]);

  useEffect(() => {
    api.get(API_ENDPOINTS.SETTINGS).then(res => {
      if (res.data && res.data.grading) setGrades(res.data.grading);
    }).catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    try {
      await api.put(API_ENDPOINTS.SETTINGS, { grading: grades });
      toast.success('Grading scale saved to database!');
    } catch (err) {
      toast.error('Failed to save grading scale.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('grading')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'grading' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <Award className="w-4 h-4" /> Marks Grading
        </button>
        <button onClick={() => setActiveTab('fail')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'fail' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Fail Criteria
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" /> Customize Grading Scale
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Define grade ranges and pass/fail status for student reports.</p>
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-3">GRADE</th>
                <th className="p-3">% FROM</th>
                <th className="p-3">% UPTO</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {grades.map((g, idx) => (
                <tr key={g.id} className="hover:bg-slate-50/50">
                  <td className="p-3 w-1/4">
                    <Input value={g.grade} onChange={(e) => { const updated = [...grades]; updated[idx].grade = e.target.value; setGrades(updated); }} className="text-xs h-9 rounded-xl border-slate-200" />
                  </td>
                  <td className="p-3 w-1/4">
                    <Input type="number" value={g.from} onChange={(e) => { const updated = [...grades]; updated[idx].from = Number(e.target.value); setGrades(updated); }} className="text-xs h-9 rounded-xl border-slate-200" />
                  </td>
                  <td className="p-3 w-1/4">
                    <Input type="number" value={g.upto} onChange={(e) => { const updated = [...grades]; updated[idx].upto = Number(e.target.value); setGrades(updated); }} className="text-xs h-9 rounded-xl border-slate-200" />
                  </td>
                  <td className="p-3 w-1/4">
                    <select value={g.status} onChange={(e) => { const updated = [...grades]; updated[idx].status = e.target.value; setGrades(updated); }} className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setGrades(grades.filter(x => x.id !== g.id))} className="p-2 text-rose-400 hover:text-rose-600 bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setGrades([...grades, { id: Date.now(), grade: 'NEW', from: 0, upto: 0, status: 'PASS' }])} className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 font-semibold text-xs rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Add Grade
          </button>

          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
            <CheckCircle2 className="w-4 h-4" /> Save Grading Scale
          </button>
        </div>
      </div>
    </div>
  );
}

/* Theme & Language View */
function ThemeLanguageView() {
  const [placement, setPlacement] = useState<'LTR' | 'RTL'>('LTR');
  const [sidebarBg, setSidebarBg] = useState<'Light' | 'Dark'>('Dark');
  const [headerBg, setHeaderBg] = useState<'Dark' | 'Red' | 'Dark Green' | 'Green' | 'Blue' | 'White'>('Blue');
  const [activeColor, setActiveColor] = useState('Soft Light Purple');
  const [lang, setLang] = useState('English');
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme_settings');
    if (saved) {
      try {
        const t = JSON.parse(saved);
        if (t.placement) setPlacement(t.placement);
        if (t.sidebarBg) setSidebarBg(t.sidebarBg);
        if (t.headerBg) setHeaderBg(t.headerBg);
        if (t.activeColor) setActiveColor(t.activeColor);
        if (t.lang) setLang(t.lang);
      } catch (e) {
        console.log('Error parsing theme settings');
      }
    } else {
      setPlacement('LTR');
      setSidebarBg('Dark');
      setHeaderBg('Blue');
      setActiveColor('Soft Light Purple');
      setLang('English');
    }
  }, []);

  const handleSave = async () => {
    const themeObj = { placement, sidebarBg, headerBg, activeColor, lang };
    localStorage.setItem('theme_settings', JSON.stringify(themeObj));

    // Propagate changes globally to apply styles in real-time
    document.documentElement.dir = placement.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
    window.dispatchEvent(new Event('theme-changed'));

    try {
      await api.put(API_ENDPOINTS.SETTINGS, { theme: themeObj });
    } catch (err) {
      console.log('Backend theme settings save fallback');
    }
    toast.success('Theme settings saved and applied successfully!');
  };

  const confirmReset = () => {
    setPlacement('LTR');
    setSidebarBg('Dark');
    setHeaderBg('Blue');
    setActiveColor('Soft Light Purple');
    setLang('English');
    document.documentElement.dir = 'ltr';
    localStorage.setItem('theme_settings', JSON.stringify({
      placement: 'LTR',
      sidebarBg: 'Dark',
      headerBg: 'Blue',
      activeColor: 'Soft Light Purple',
      lang: 'English'
    }));
    window.dispatchEvent(new Event('theme-changed'));
    setShowResetModal(false);
    toast.success('Theme settings reset to defaults.');
  };

  const swatches = [
    { name: 'Coral Red', value: '#E55B4C', bg: 'bg-[#E55B4C]' },
    { name: 'Magenta', value: '#D81B60', bg: 'bg-[#D81B60]' },
    { name: 'Turquoise', value: '#00BFA5', bg: 'bg-[#00BFA5]' },
    { name: 'Blue', value: '#2E73D2', bg: 'bg-[#2E73D2]' },
    { name: 'Yellow', value: '#F59E0B', bg: 'bg-[#F59E0B]' },
    { name: 'Red Orange', value: '#F97316', bg: 'bg-[#F97316]' },
    { name: 'Soft Light Purple', value: '#ECECFE', bg: 'bg-[#ECECFE]' },
    { name: 'Dark Slate Blue', value: '#4D51B4', bg: 'bg-[#4D51B4]' },
    { name: 'Hot Pink', value: '#EC4899', bg: 'bg-[#EC4899]' },
    { name: 'Bright Orange', value: '#FF4F00', bg: 'bg-[#FF4F00]' },
    { name: 'Green', value: '#008744', bg: 'bg-[#008744]' },
    { name: 'Dark Purple', value: '#730073', bg: 'bg-[#730073]' }
  ];

  const placements = [
    {
      id: 'LTR',
      label: 'LTR',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
          <div className="flex flex-col gap-1 w-5">
            <span className="w-full h-0.5 bg-white"></span>
            <span className="w-4 h-0.5 bg-white/70"></span>
            <span className="w-full h-0.5 bg-white/50"></span>
          </div>
        </div>
      )
    },
    {
      id: 'RTL',
      label: 'RTL',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col gap-1 w-5 items-end">
            <span className="w-full h-0.5 bg-slate-400"></span>
            <span className="w-4 h-0.5 bg-slate-400/70"></span>
            <span className="w-full h-0.5 bg-slate-400/50"></span>
          </div>
        </div>
      )
    }
  ];

  const sidebars = [
    {
      id: 'Light',
      label: 'Light',
      preview: (
        <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden flex shadow-sm bg-white">
          <div className="w-3 bg-slate-100 border-r border-slate-200"></div>
          <div className="flex-1 bg-white"></div>
        </div>
      )
    },
    {
      id: 'Dark',
      label: 'Dark',
      preview: (
        <div className="w-10 h-10 rounded-xl border border-slate-300 overflow-hidden flex shadow-sm bg-white">
          <div className="w-3 bg-slate-800"></div>
          <div className="flex-1 bg-white"></div>
        </div>
      )
    }
  ];

  const headers = [
    { id: 'Dark', label: 'Dark', barBg: 'bg-slate-700' },
    { id: 'Red', label: 'Red', barBg: 'bg-rose-400' },
    { id: 'Dark Green', label: 'Dark Green', barBg: 'bg-teal-400' },
    { id: 'Green', label: 'Green', barBg: 'bg-emerald-400' },
    { id: 'Blue', label: 'Blue', barBg: 'bg-blue-400' },
    { id: 'White', label: 'White', barBg: 'bg-slate-50 border-b border-slate-200' }
  ];

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8 max-w-5xl mx-auto relative">
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full mx-4 text-center space-y-5 border border-slate-100 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
              <RotateCcw className="w-8 h-8 animate-spin-reverse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Reset Theme?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">This will revert all theme settings to their defaults.</p>
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmReset}
                className="flex-1 py-2.5 bg-[#FF4F6E] hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-slate-800">Theme Settings</h2>
        <p className="text-xs text-slate-400">Customize the look and feel of your portal.</p>
      </div>

      {/* Theme Placement Section */}
      <div className="space-y-3">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase flex items-center gap-1.5">
          <span>↔</span> THEME PLACEMENT
        </label>
        <div className="flex gap-4">
          {placements.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setPlacement(item.id as any)} 
              className={`relative w-32 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all ${placement === item.id ? 'border-purple-600 bg-purple-50/40 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {placement === item.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3" />
                </div>
              )}
              {item.icon}
              <span className="text-[11px] font-bold mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Background Section */}
      <div className="space-y-3">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase flex items-center gap-1.5">
          <span>📋</span> SIDEBAR BACKGROUND
        </label>
        <div className="flex gap-4">
          {sidebars.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setSidebarBg(item.id as any)} 
              className={`relative w-32 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all ${sidebarBg === item.id ? 'border-purple-600 bg-purple-50/40 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {sidebarBg === item.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3" />
                </div>
              )}
              {item.preview}
              <span className="text-[11px] font-bold mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Header Background Section */}
      <div className="space-y-3">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase flex items-center gap-1.5">
          <span>H</span> HEADER BACKGROUND
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {headers.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setHeaderBg(item.id as any)} 
              className={`relative h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all ${headerBg === item.id ? 'border-purple-600 bg-purple-50/40 text-purple-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {headerBg === item.id && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-purple-600 text-white rounded-full flex items-center justify-center text-[9px]">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
              <div className="w-14 h-10 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
                <div className={`h-3 w-full ${item.barBg}`} />
                <div className="flex-1 bg-white" />
              </div>
              <span className="text-[10px] font-bold truncate mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Item Background Section */}
      <div className="space-y-3">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase flex items-center gap-1.5">
          <span>🎨</span> ACTIVE ITEM BACKGROUND
        </label>
        <div className="flex flex-wrap gap-4 items-center">
          {swatches.map((swatch) => {
            const isSelected = activeColor === swatch.name;
            return (
              <button 
                key={swatch.name} 
                onClick={() => setActiveColor(swatch.name)} 
                className={`relative w-10 h-10 rounded-full ${swatch.bg} flex items-center justify-center border border-slate-200/50 shadow-sm transition-all hover:scale-110 ${isSelected ? 'ring-4 ring-purple-200 ring-offset-2 scale-110' : ''}`}
                title={swatch.name}
              >
                {isSelected && (
                  <Check className={`w-4 h-4 ${swatch.name === 'Soft Light Purple' ? 'text-purple-600' : 'text-white'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Section */}
      <div className="space-y-3 w-full md:w-1/2">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase flex items-center gap-1.5">
          <span>🔤</span> LANGUAGE
        </label>
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value)} 
          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700"
        >
          <option value="English">English</option>
          <option value="Mandarin">Mandarin (普通话)</option>
          <option value="Spanish">Español (Spanish)</option>
          <option value="Hindi">हिन्दी (Hindi)</option>
          <option value="Arabic">العربية (Arabic)</option>
          <option value="Bengali">বাংলা (Bengali)</option>
          <option value="Portuguese">Português (Portuguese)</option>
          <option value="Russian">Русский (Russian)</option>
          <option value="Japanese">日本語 (Japanese)</option>
          <option value="Punjabi">ਪੰਜਾਬੀ / پنجابی (Punjabi)</option>
          <option value="German">Deutsch (German)</option>
          <option value="Malay">Bahasa Melayu (Malay / Indonesian)</option>
          <option value="Telugu">తెలుగు (Telugu)</option>
          <option value="Vietnamese">Tiếng Việt (Vietnamese)</option>
          <option value="Korean">한국어 (Korean)</option>
          <option value="French">Français (French)</option>
          <option value="Marathi">मराठी (Marathi)</option>
          <option value="Tamil">தமிழ் (Tamil)</option>
          <option value="Turkish">Türkçe (Turkish)</option>
          <option value="Urdu">اردو (Urdu)</option>
          <option value="Italian">Italiano (Italian)</option>
          <option value="Persian">فارسی (Persian)</option>
          <option value="Polish">Polski (Polish)</option>
          <option value="Dutch">Nederlands (Dutch)</option>
          <option value="Thai">ไทย (Thai)</option>
        </select>
      </div>

      {/* Save / Reset Footer Actions */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-100">
        <button 
          onClick={handleSave} 
          className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          <Check className="w-4 h-4" /> Save Settings
        </button>
        <button 
          onClick={() => setShowResetModal(true)} 
          className="flex items-center gap-1.5 px-6 py-2.5 border border-slate-200 text-purple-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
        </button>
      </div>
    </div>
  );
}

/* Account Settings View */
function AccountSettingsView() {
  const { user } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showSummaryPass, setShowSummaryPass] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('mminhas123');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [currency, setCurrency] = useState('Rupees (PKR)');
  const [symbol, setSymbol] = useState('Rs');

  // Loaded from Institute Profile settings dynamically
  const [schoolName, setSchoolName] = useState('Your School');
  const [schoolLogo, setSchoolLogo] = useState('');

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }

    // Load school details
    const savedProfile = localStorage.getItem('institute_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setSchoolName(parsed.name);
        if (parsed.logoUrl) setSchoolLogo(parsed.logoUrl);
      } catch (e) {}
    }

    // Load account settings
    const savedAccount = localStorage.getItem('account_settings');
    if (savedAccount) {
      try {
        const a = JSON.parse(savedAccount);
        if (a.email) setEmail(a.email);
        if (a.password) setPassword(a.password);
        if (a.timezone) setTimezone(a.timezone);
        if (a.currency) setCurrency(a.currency);
        if (a.symbol) setSymbol(a.symbol);
      } catch (e) {}
    } else {
      api.get(API_ENDPOINTS.SETTINGS).then(res => {
        if (res.data && res.data.account) {
          const a = res.data.account;
          if (a.email) setEmail(a.email);
          if (a.timezone) setTimezone(a.timezone);
          if (a.currency) setCurrency(a.currency);
          if (a.symbol) setSymbol(a.symbol);
        }
      }).catch(err => console.log('Backend account settings fallback'));
    }

    // Load fresh email from backend
    api.get('/auth/me/').then(res => {
      if (res.data && res.data.email) {
        setEmail(res.data.email);
      }
    }).catch(err => console.log('Backend auth get fallback'));
  }, [user]);

  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    if (val === 'Dollars (USD)') {
      setSymbol('$');
    } else if (val === 'Rupees (PKR)') {
      setSymbol('Rs');
    }
  };

  const handleSave = async () => {
    try {
      // Update actual user email and password in backend database via MeView PUT
      const response = await api.put('/auth/me/', { email, password });
      
      // Update global client auth store state instantly
      if (response.data && response.data.user) {
        useAuthStore.getState().setUser(response.data.user);
      }

      const extraSettings = { timezone, currency, symbol };
      localStorage.setItem('account_settings', JSON.stringify({ email, password, ...extraSettings }));
      
      await api.put(API_ENDPOINTS.SETTINGS, { account: { email, ...extraSettings } });
      toast.success('Account and profile settings updated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update account settings.';
      toast.error(errorMsg);
    }
  };

  const handleDeleteAccount = () => {
    const confirmDelete = confirm('⚠️ WARNING: Are you sure you want to permanently delete this account? This action is irreversible and all your school data will be lost.');
    if (confirmDelete) {
      toast.error('Account deletion requested.');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-purple-700 font-bold text-sm border-b border-slate-100 pb-3">
          <Edit className="w-4 h-4" />
          <span>Edit Account</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">USERNAME / EMAIL *</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="text-xs h-10 rounded-xl border-slate-200" />
          </div>

          <div className="relative">
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PASSWORD *</label>
            <Input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="text-xs h-10 rounded-xl border-slate-200 pr-10" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">TIME ZONE *</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold">
              <option value="Asia/Karachi">Asia/Karachi</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CURRENCY *</label>
            <select value={currency} onChange={(e) => handleCurrencyChange(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 font-semibold">
              <option value="Rupees (PKR)">Rupees (PKR)</option>
              <option value="Dollars (USD)">Dollars (USD)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CURRENCY SYMBOL</label>
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="text-xs h-10 rounded-xl border-slate-200 w-full md:w-1/2" />
        </div>

        <div className="pt-2">
          <button onClick={handleSave} className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
            <Check className="w-4 h-4" /> Update Settings
          </button>
        </div>
      </div>

      <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center mx-auto p-1 overflow-hidden shadow-xs">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain rounded-full" />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <span className="text-[9px] font-extrabold text-blue-600 leading-tight">YOUR LOGO HERE</span>
                </div>
              )}
            </div>
            <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">{schoolName}</h4>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-xl">
              <div className="p-2 bg-purple-600 text-white rounded-full shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Account Details</p>
                <p className="text-slate-500 text-[11px] font-medium">{email}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">USERNAME</p>
                  <p className="font-bold text-slate-700">{email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">PASSWORD</p>
                    <p className="font-bold text-slate-700 font-mono">
                      {showSummaryPass ? password : '••••••••••••'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowSummaryPass(!showSummaryPass)} className="text-slate-400 hover:text-slate-600 mr-2">
                  {showSummaryPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">SUBSCRIPTION</p>
                  <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 font-extrabold rounded text-[10px]">YEARLY</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">EXPIRY</p>
                  <p className="font-bold text-slate-700">June 13, 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-center border-t border-slate-50">
          <button onClick={handleDeleteAccount} className="flex items-center gap-1.5 px-6 py-2 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all shadow-2xs w-full justify-center">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}


function LockedFeatureView({ featureName }: { featureName: string }) {
  return (
    <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center space-y-3">
      <Lock className="w-10 h-10 text-rose-500 mx-auto" />
      <h3 className="text-sm font-bold text-slate-800">{featureName} is Locked</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto">This feature is part of the Pro Desktop subscription tier.</p>
    </div>
  );
}