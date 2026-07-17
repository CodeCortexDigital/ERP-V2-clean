import React, { useState, useEffect } from 'react';
import { Palette, Check, RotateCcw, Monitor, Sun, Moon, ArrowLeftRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';

export default function ThemeLanguage() {
  const [placement, setPlacement] = useState<'LTR' | 'RTL'>('LTR');
  const [sidebarBg, setSidebarBg] = useState<'Light' | 'Dark'>('Dark');
  const [headerBg, setHeaderBg] = useState<string>('Blue');
  const [activeColor, setActiveColor] = useState('Soft Light Purple');
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
      } catch (e) {
        console.log('Error parsing theme settings');
      }
    }
  }, []);

  const handleSave = async () => {
    const themeObj = { ...JSON.parse(localStorage.getItem('theme_settings') || '{}'), placement, sidebarBg, headerBg, activeColor };
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
    document.documentElement.dir = 'ltr';
    const existing = JSON.parse(localStorage.getItem('theme_settings') || '{}');
    localStorage.setItem('theme_settings', JSON.stringify({
      ...existing,
      placement: 'LTR',
      sidebarBg: 'Dark',
      headerBg: 'Blue',
      activeColor: 'Soft Light Purple'
    }));
    window.dispatchEvent(new Event('theme-changed'));
    setShowResetModal(false);
    toast.success('Theme settings reset to defaults.');
  };

  const swatches = [
    { name: 'Professional Blue', value: '#2E66B7', bg: 'bg-[#2E66B7]' },
    { name: 'Brand Cyan', value: '#30F0D8', bg: 'bg-[#30F0D8]' },
    { name: 'Brand Red', value: '#F01848', bg: 'bg-[#F01848]' },
    { name: 'Brand Navy', value: '#001830', bg: 'bg-[#001830]' },
    { name: 'Dark Slate Blue', value: '#4D51B4', bg: 'bg-[#4D51B4]' },
    { name: 'Blue', value: '#2E73D2', bg: 'bg-[#2E73D2]' },
    { name: 'Turquoise', value: '#00BFA5', bg: 'bg-[#00BFA5]' },
    { name: 'Green', value: '#008744', bg: 'bg-[#008744]' },
    { name: 'Coral Red', value: '#E55B4C', bg: 'bg-[#E55B4C]' },
    { name: 'Magenta', value: '#D81B60', bg: 'bg-[#D81B60]' },
    { name: 'Hot Pink', value: '#EC4899', bg: 'bg-[#EC4899]' },
    { name: 'Soft Light Purple', value: '#ECECFE', bg: 'bg-[#ECECFE]' },
    { name: 'Red Orange', value: '#F97316', bg: 'bg-[#F97316]' },
    { name: 'Bright Orange', value: '#FF4F00', bg: 'bg-[#FF4F00]' },
    { name: 'Yellow', value: '#F59E0B', bg: 'bg-[#F59E0B]' },
    { name: 'Dark Purple', value: '#730073', bg: 'bg-[#730073]' },
  ];

  const placements = [
    { id: 'LTR', label: 'Left to Right', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'RTL', label: 'Right to Left', icon: <ArrowLeftRight className="w-4 h-4 rotate-180" /> },
  ];

  const sidebars = [
    { id: 'Light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { id: 'Dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  ];

  const headers = [
    { id: 'Blue', label: 'Blue', barBg: 'bg-blue-400' },
    { id: 'Dark', label: 'Dark', barBg: 'bg-slate-700' },
    { id: 'Green', label: 'Green', barBg: 'bg-emerald-400' },
    { id: 'Dark Green', label: 'Teal', barBg: 'bg-teal-400' },
    { id: 'Red', label: 'Red', barBg: 'bg-rose-400' },
    { id: 'White', label: 'White', barBg: 'bg-slate-50 border border-slate-200' },
  ];

  const applyProfessionalBlue = () => {
    setActiveColor('Professional Blue');
    setSidebarBg('Light');
    setHeaderBg('Blue');
  };

  // Resolve a header preview color from selection
  const headerPreviewBg =
    headers.find(h => h.id === headerBg)?.barBg || 'bg-blue-400';

  return (
    <div className="relative pb-20">
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full mx-4 text-center space-y-5 border border-slate-100 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
              <RotateCcw className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Reset Theme?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">This will revert all theme settings to their defaults.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all">Cancel</button>
              <button onClick={confirmReset} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition-all">Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live Preview */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> Live Preview
            </p>
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-100">
              {/* Mock browser header */}
              <div className={`h-9 w-full flex items-center px-3 gap-1.5 ${headerPreviewBg}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
              </div>
              <div className="flex" style={{ minHeight: 260 }}>
                {/* Mock sidebar */}
                <div className={`w-1/3 p-3 space-y-2 ${sidebarBg === 'Dark' ? 'bg-slate-900' : 'bg-white border-r border-slate-200'}`}>
                  <div className={`h-2.5 w-3/4 rounded-full ${sidebarBg === 'Dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-5 rounded-md flex items-center gap-1.5 px-1.5 ${i === 0 ? (sidebarBg === 'Dark' ? 'bg-slate-700' : 'bg-slate-100') : ''}`}>
                      <span className={`w-2 h-2 rounded-sm ${sidebarBg === 'Dark' ? 'bg-slate-500' : 'bg-slate-300'}`} />
                      <span className={`h-1.5 flex-1 rounded-full ${sidebarBg === 'Dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    </div>
                  ))}
                </div>
                {/* Mock content */}
                <div className="flex-1 p-3 space-y-2 bg-white">
                  <div className="h-3 w-1/2 rounded-full" style={{ backgroundColor: swatches.find(s => s.name === activeColor)?.value }} />
                  <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-10 rounded-lg border border-slate-200" />
                    <div className="h-10 rounded-lg border border-slate-200" />
                  </div>
                  <div className="h-7 rounded-lg mt-1" style={{ backgroundColor: swatches.find(s => s.name === activeColor)?.value }} />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">Preview updates as you choose options</p>
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-3 space-y-5">
          {/* Direction */}
          <Section title="Layout Direction" icon={<ArrowLeftRight className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-3">
              {placements.map(item => (
                <OptionTile key={item.id} active={placement === item.id} onClick={() => setPlacement(item.id as any)} label={item.label} icon={item.icon} />
              ))}
            </div>
          </Section>

          {/* Sidebar */}
          <Section title="Sidebar Background" icon={<Sun className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-3">
              {sidebars.map(item => (
                <OptionTile key={item.id} active={sidebarBg === item.id} onClick={() => setSidebarBg(item.id as any)} label={item.label} icon={item.icon} />
              ))}
            </div>
          </Section>

          {/* Header */}
          <Section title="Header Background" icon={<Monitor className="w-4 h-4" />}>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {headers.map(item => (
                <button key={item.id} onClick={() => setHeaderBg(item.id)} className={`relative h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all ${headerBg === item.id ? 'border-green-600 bg-green-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  {headerBg === item.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[9px]"><Check className="w-2.5 h-2.5" /></div>
                  )}
                  <div className={`w-10 h-3 rounded-sm ${item.barBg}`} />
                  <span className="text-[10px] font-bold text-slate-500">{item.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Accent color */}
          <Section title="Accent Color" icon={<Palette className="w-4 h-4" />}>
            <div className="flex flex-wrap gap-2.5">
              {swatches.map(swatch => {
                const isSelected = activeColor === swatch.name;
                const light = swatch.name === 'Soft Light Purple';
                return (
                  <button key={swatch.name} onClick={() => setActiveColor(swatch.name)} title={swatch.name}
                    className={`relative w-9 h-9 rounded-full ${swatch.bg} flex items-center justify-center border border-black/10 shadow-sm transition-all hover:scale-110 ${isSelected ? 'ring-4 ring-green-200 ring-offset-2 scale-110' : ''}`}>
                    {isSelected && <Check className={`w-4 h-4 ${light ? 'text-purple-600' : 'text-white'}`} />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Selected: <span className="font-semibold text-slate-600">{activeColor}</span></p>
          </Section>

          {/* Preset */}
          <Section title="Recommended Preset" icon={<Sparkles className="w-4 h-4" />}>
            <button onClick={applyProfessionalBlue}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left ${activeColor === 'Professional Blue' && sidebarBg === 'Light' && headerBg === 'Blue' ? 'border-[#2E66B7] bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex -space-x-1.5">
                <span className="w-7 h-7 rounded-full bg-[#2E66B7] border-2 border-white shadow-sm" />
                <span className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white shadow-sm" />
                <span className="w-7 h-7 rounded-full bg-blue-400 border-2 border-white shadow-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">Professional Blue (Calm & Neutral)</p>
                <p className="text-[10px] text-slate-400 leading-snug">Cool blue accent on a soft gray/white canvas.</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#2E66B7] text-white">Apply</span>
            </button>
          </Section>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white border border-slate-200 shadow-xl rounded-2xl px-4 py-2.5">
        <button onClick={() => setShowResetModal(true)} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all">
          <Check className="w-4 h-4" /> Save Theme
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <span className="text-green-600">{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function OptionTile({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-xs font-bold ${active ? 'border-green-600 bg-green-50/50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
      {active && <div className="absolute top-2 right-2 w-4 h-4 bg-green-600 text-white rounded-full flex items-center justify-center text-[9px]"><Check className="w-2.5 h-2.5" /></div>}
      {icon}
      {label}
    </button>
  );
}
