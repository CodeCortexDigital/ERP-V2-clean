import React, { useState, useEffect, useRef } from 'react';
import { Edit, Upload } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function InstituteProfile() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    targetLine: '',
    phone: '',
    website: '',
    address: '',
    country: 'Pakistan',
    logoUrl: ''
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
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="UAE">UAE</option>
              <option value="Saudi Arabia">Saudi Arabia</option>
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