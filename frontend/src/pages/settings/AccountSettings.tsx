import React, { useState, useEffect } from 'react';
import { Edit, Eye, EyeOff, User, Mail, Lock, Tag, Calendar, Trash2, Check, X, School } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';

interface AccountData {
  email: string;
  password: string;
  timezone: string;
  currency: string;
  symbol: string;
}

const DEFAULT: AccountData = {
  email: '',
  password: 'mminhas123',
  timezone: 'Asia/Karachi',
  currency: 'Rupees (PKR)',
  symbol: 'Rs'
};

export default function AccountSettings() {
  const { user } = useAuth();
  const [data, setData] = useState<AccountData>(DEFAULT);
  const [schoolName, setSchoolName] = useState('Your School');
  const [schoolLogo, setSchoolLogo] = useState('');

  const [showSummaryPass, setShowSummaryPass] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<AccountData>(DEFAULT);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base: AccountData = { ...DEFAULT };
    if (user?.email) base.email = user.email;

    const savedProfile = localStorage.getItem('institute_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setSchoolName(parsed.name);
        if (parsed.logoUrl) setSchoolLogo(parsed.logoUrl);
      } catch (e) {}
    }

    const savedAccount = localStorage.getItem('account_settings');
    if (savedAccount) {
      try {
        const a = JSON.parse(savedAccount);
        Object.assign(base, {
          email: a.email ?? base.email,
          password: a.password ?? base.password,
          timezone: a.timezone ?? base.timezone,
          currency: a.currency ?? base.currency,
          symbol: a.symbol ?? base.symbol
        });
      } catch (e) {}
    } else {
      api.get(API_ENDPOINTS.SETTINGS).then(res => {
        if (res.data && res.data.account) {
          const a = res.data.account;
          setData(prev => ({ ...prev, ...{
            email: a.email ?? prev.email,
            timezone: a.timezone ?? prev.timezone,
            currency: a.currency ?? prev.currency,
            symbol: a.symbol ?? prev.symbol
          } }));
        }
      }).catch(err => console.log('Backend account settings fallback'));
    }

    api.get('/auth/me/').then(res => {
      if (res.data && res.data.email) base.email = res.data.email;
    }).catch(err => console.log('Backend auth get fallback'));

    setData(base);
  }, [user]);

  const openEdit = () => {
    setDraft({ ...data });
    setShowPass(false);
    setEditOpen(true);
  };

  const handleCurrencyChange = (val: string) => {
    setDraft(prev => ({
      ...prev,
      currency: val,
      symbol: val === 'Dollars (USD)' ? '$' : 'Rs'
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/auth/me/', { email: draft.email, password: draft.password });
      if (response.data && response.data.user) {
        useAuthStore.getState().setUser(response.data.user);
      }
      const extra = { timezone: draft.timezone, currency: draft.currency, symbol: draft.symbol };
      localStorage.setItem('account_settings', JSON.stringify({ email: draft.email, password: draft.password, ...extra }));
      await api.put(API_ENDPOINTS.SETTINGS, { account: { email: draft.email, ...extra } });
      setData({ ...draft });
      setEditOpen(false);
      toast.success('Account settings updated successfully!');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update account settings.';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmDelete = confirm('⚠️ WARNING: Are you sure you want to permanently delete this account? This action is irreversible and all your school data will be lost.');
    if (confirmDelete) toast.error('Account deletion requested.');
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Account card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {schoolLogo ? (
                <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <School className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{schoolName}</h3>
              <p className="text-[11px] text-slate-400">Account Details</p>
            </div>
          </div>
          <button onClick={openEdit} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm transition-all">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </div>

        {/* Details */}
        <div className="p-6 space-y-3">
          <DetailRow icon={<Mail className="w-4 h-4" />} label="Username / Email" value={data.email} />
          <DetailRow
            icon={<Lock className="w-4 h-4" />}
            label="Password"
            value={showSummaryPass ? data.password : '••••••••••••'}
            action={
              <button type="button" onClick={() => setShowSummaryPass(v => !v)} className="text-slate-400 hover:text-slate-600">
                {showSummaryPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label="Time Zone" value={data.timezone} />
          <DetailRow icon={<Tag className="w-4 h-4" />} label="Currency" value={`${data.currency} (${data.symbol})`} />
          <DetailRow icon={<Tag className="w-4 h-4" />} label="Subscription" value={<span className="px-2 py-0.5 bg-green-50 text-green-700 font-extrabold rounded text-[10px]">YEARLY</span>} />
        </div>

        <div className="px-6 pb-6">
          <button onClick={handleDeleteAccount} className="flex items-center gap-1.5 px-5 py-2 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setEditOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Edit className="w-4 h-4 text-green-600" /> Edit Account</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">USERNAME / EMAIL *</label>
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200" />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">PASSWORD *</label>
                <Input type={showPass ? 'text' : 'password'} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200 pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">TIME ZONE *</label>
                <select value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-700 font-semibold">
                  <option value="Asia/Karachi">Asia/Karachi</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CURRENCY *</label>
                <select value={draft.currency} onChange={(e) => handleCurrencyChange(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-700 font-semibold">
                  <option value="Rupees (PKR)">Rupees (PKR)</option>
                  <option value="Dollars (USD)">Dollars (USD)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">CURRENCY SYMBOL</label>
                <Input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} className="text-xs h-10 rounded-xl border-slate-200 w-full md:w-1/2" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setEditOpen(false)} className="px-5 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50">
                {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-3">
        <span className="text-green-600">{icon}</span>
        <div>
          <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">{label}</p>
          <p className="font-bold text-slate-700 text-sm">{value}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
