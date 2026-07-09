import React, { useState, useEffect } from 'react';
import { Edit, Eye, EyeOff, User, Mail, Lock, Tag, Calendar, Trash2, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';

export default function AccountSettings() {
  const { user } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showSummaryPass, setShowSummaryPass] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('mminhas123');
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [currency, setCurrency] = useState('Rupees (PKR)');
  const [symbol, setSymbol] = useState('Rs');

  const [schoolName, setSchoolName] = useState('Your School');
  const [schoolLogo, setSchoolLogo] = useState('');

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }

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
      const response = await api.put('/auth/me/', { email, password });
      
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