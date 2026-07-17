import React, { useState, useEffect } from 'react';
import { Languages, Check, Globe, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function LanguageSettings() {
  const [lang, setLang] = useState('English');

  useEffect(() => {
    const saved = localStorage.getItem('theme_settings');
    if (saved) {
      try {
        const t = JSON.parse(saved);
        if (t.lang) setLang(t.lang);
      } catch (e) {
        /* ignore */
      }
    }
  }, []);

  const handleSave = async () => {
    const saved = localStorage.getItem('theme_settings');
    const base = saved ? JSON.parse(saved) : {};
    const themeObj = { ...base, lang };
    localStorage.setItem('theme_settings', JSON.stringify(themeObj));
    window.dispatchEvent(new Event('theme-changed'));

    try {
      await api.put(API_ENDPOINTS.SETTINGS, { theme: themeObj });
    } catch (err) {
      console.log('Backend language settings save fallback');
    }
    toast.success('Language preference saved!');
  };

  const handleReset = () => {
    const saved = localStorage.getItem('theme_settings');
    const base = saved ? JSON.parse(saved) : {};
    const themeObj = { ...base, lang: 'English' };
    localStorage.setItem('theme_settings', JSON.stringify(themeObj));
    setLang('English');
    window.dispatchEvent(new Event('theme-changed'));
    toast.success('Language reset to English.');
  };

  const languages = [
    'English', 'Mandarin', 'Spanish', 'Hindi', 'Arabic', 'Bengali',
    'Portuguese', 'Russian', 'Japanese', 'Punjabi', 'German', 'Malay',
    'Telugu', 'Vietnamese', 'Korean', 'French', 'Marathi', 'Tamil',
    'Turkish', 'Urdu', 'Italian', 'Persian', 'Polish', 'Dutch', 'Thai'
  ];

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-1">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto">
          <Globe className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Language</h2>
        <p className="text-xs text-slate-400">Choose the default display language for the portal.</p>
      </div>

      <div className="space-y-3">
        <label className="block text-[10px] font-bold tracking-wider text-purple-800 uppercase flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5" /> SELECT LANGUAGE
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700"
          >
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          <Check className="w-4 h-4" /> Save Language
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-6 py-2.5 border border-slate-200 text-purple-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
        </button>
      </div>
    </div>
  );
}
