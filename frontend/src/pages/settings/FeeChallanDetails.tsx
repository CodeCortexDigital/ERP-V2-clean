import React, { useState, useEffect, useRef } from 'react';
import { Landmark, Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import settingsService from '@/services/settings.service';

interface BankItem {
  id: number;
  name: string;
  logo: string;
  accountNo: string;
  branchAddress: string;
  instructions: string;
}

export default function FeeChallanDetails() {
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [bankName, setBankName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [instructions, setInstructions] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const bankFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBankDetails();
  }, []);

  const loadBankDetails = async () => {
    try {
      const response = await settingsService.getInstituteProfile();
      if (response?.data && (response.data as any).banks) {
        setBanks((response.data as any).banks);
        return;
      }
    } catch (err) {
      console.log('Backend load bank details fallback');
    }
    // Fallback to localStorage
    const saved = localStorage.getItem('bank_details');
    if (saved) {
      try {
        setBanks(JSON.parse(saved));
      } catch (e) {
        console.log('Error parsing bank details');
      }
    } else {
      const defaultBanks = [
        {
          id: 1,
          name: 'HBL',
          logo: 'https://images.unsplash.com/photo-1628527264098-f29450945a67?w=80',
          accountNo: '343546535356555',
          branchAddress: 'Karachi, Pakistan',
          instructions: 'Please pay fee on or before due date.'
        }
      ];
      setBanks(defaultBanks);
      localStorage.setItem('bank_details', JSON.stringify(defaultBanks));
    }
  };

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

    setBankName('');
    setBranchAddress('');
    setAccountNo('');
    setInstructions('');
    setLogoUrl('');

    try {
      await settingsService.updateInstituteProfile({ banks: updatedBanks } as any);
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
      await settingsService.updateInstituteProfile({ banks: updated } as any);
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