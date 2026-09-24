import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import api, { extractListData } from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import financeService from '@/services/finance.service';
import classSectionService from '@/services/classSection.service';
import { cur } from '@/utils/currency';

export default function DiscountType() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      <div className="sticky-summary flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 p-4 rounded-xl border border-slate-100">
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
                       d.scholarship_type === 'fixed' ? `${cur()} ${Number(d.value).toLocaleString()}` : '100% Waiver'}
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
                      {scholarshipType === 'percentage' ? 'Percentage (%) *' : `Fixed Amount (${cur()}) *`}
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