import React, { useState, useEffect, useRef } from 'react';
import { Edit, Upload, X, Save, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import settingsService from '@/services/settings.service';

interface ProfileData {
  name: string;
  targetLine: string;
  phone: string;
  website: string;
  address: string;
  country: string;
  logoUrl: string;
}

const EMPTY: ProfileData = {
  name: '',
  targetLine: '',
  phone: '',
  website: '',
  address: '',
  country: 'Pakistan',
  logoUrl: ''
};

const FIELDS: { key: keyof ProfileData; label: string; required?: boolean }[] = [
  { key: 'name', label: 'NAME OF INSTITUTE', required: true },
  { key: 'targetLine', label: 'TARGET LINE', required: true },
  { key: 'phone', label: 'PHONE NUMBER', required: true },
  { key: 'website', label: 'WEBSITE' },
  { key: 'address', label: 'ADDRESS', required: true },
  { key: 'country', label: 'COUNTRY', required: true },
];

export default function InstituteProfile() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<ProfileData>(EMPTY);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(EMPTY);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await settingsService.getInstituteProfile();
      if (res.data) {
        setData({
          name: res.data.name || '',
          targetLine: res.data.description || res.data.motto || '',
          phone: res.data.phone || '',
          website: res.data.website || '',
          address: res.data.address || '',
          country: res.data.country || 'Pakistan',
          logoUrl: res.data.logo || '',
        });
      }
    } catch {
      // Fallback to localStorage
      const saved = localStorage.getItem('institute_profile');
      if (saved) {
        try {
          setData(JSON.parse(saved));
        } catch (e) {
          console.log('Error parsing saved profile');
        }
      }
    }
  };

  const openEdit = () => {
    setDraft({ ...data });
    setEditOpen(true);
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
      setDraft(prev => ({ ...prev, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await settingsService.updateInstituteProfile({
        name: draft.name,
        description: draft.targetLine,
        phone: draft.phone,
        website: draft.website,
        address: draft.address,
        logo: draft.logoUrl,
      });
    } catch (err) {
      console.log('Backend save fallback');
    }

    localStorage.setItem('institute_profile', JSON.stringify(draft));
    setData({ ...draft });
    setEditOpen(false);
    toast.success('Profile updated and saved successfully!');
  };

  return (
    <div className="flex justify-center py-6">
      <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />

      {/* View mode - small centered card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-blue-50 flex items-center justify-center text-center p-2 overflow-hidden">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-blue-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{data.name || 'Institute Name'}</h2>
            {data.targetLine && <p className="text-xs text-slate-500 mt-0.5">{data.targetLine}</p>}
          </div>
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          {FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {f.label}{f.required && <span className="text-rose-500"> *</span>}
              </p>
              <p className="text-sm font-semibold text-slate-700 truncate text-right">{data[f.key] || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-4 h-4 text-green-600" /> Edit Institute Profile
              </h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">INSTITUTE LOGO</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-slate-200 bg-blue-50 flex items-center justify-center text-center p-2 overflow-hidden">
                    {draft.logoUrl ? (
                      <img src={draft.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-8 h-8 text-blue-500" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 text-green-600 text-xs font-semibold hover:bg-green-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Change Logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                      {f.label}{f.required && <span className="text-rose-500"> *</span>}
                    </label>
                    {f.key === 'country' ? (
                      <select
                        value={draft.country}
                        onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
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
                    ) : (
                      <Input
                        placeholder={f.label}
                        value={draft[f.key]}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="text-xs h-10 rounded-xl border-slate-200"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setEditOpen(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
