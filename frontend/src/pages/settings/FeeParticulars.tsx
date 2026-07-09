import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function FeeParticulars() {
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