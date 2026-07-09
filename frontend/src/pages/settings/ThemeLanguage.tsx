import React, { useState, useEffect } from 'react';
import { Palette, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function ThemeLanguage() {
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
    }
  }, []);

  const handleSave = async () => {
    const themeObj = { placement, sidebarBg, headerBg, activeColor, lang };
    localStorage.setItem('theme_settings', JSON.stringify(themeObj));

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