import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Edit, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import financeService from '@/services/finance.service';
import classSectionService from '@/services/classSection.service';

export default function FeeStructure() {
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
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
  
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const selectedClassObj = classes.find(c => c.id === classRef);
  const activeSections = selectedClassObj?.sections || [];

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