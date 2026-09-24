import React, { useState, useEffect } from 'react';
import { Palette, Check, RotateCcw, Monitor, Sun, Moon, ArrowLeftRight, Sparkles, Type, Layout, AppWindow } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/apiEndpoints';
import { DEFAULT_THEME, readThemeSettings, saveThemeSettings } from '@/utils/theme';

export default function ThemeLanguage() {
  // Theme settings state
  const initial = readThemeSettings();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(initial.themeMode);
  const [accentColor, setAccentColor] = useState<string>(initial.accentColor);
  const [radius, setRadius] = useState<string>(initial.radius);
  const [fontFamily, setFontFamily] = useState<string>(initial.fontFamily);
  const [placement, setPlacement] = useState<'LTR' | 'RTL'>(initial.placement === 'RTL' ? 'RTL' : 'LTR');
  const [sidebarBg, setSidebarBg] = useState<'Light' | 'Dark'>(initial.sidebarBg === 'Light' ? 'Light' : 'Dark');
  const [headerBg, setHeaderBg] = useState<string>(initial.headerBg);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const themeObj = { 
      themeMode,
      accentColor,
      radius,
      fontFamily,
      placement,
      sidebarBg,
      headerBg
    };
    
    // Save locally and apply to the whole app
    saveThemeSettings(themeObj);
    
    // Save to backend database
    try {
      await api.put(API_ENDPOINTS.SETTINGS, { theme: themeObj });
    } catch (err) {
      console.log('Backend theme settings save fallback');
    }
    
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Theme settings saved and applied to the entire project!');
    }, 600);
  };

  const confirmReset = () => {
    setThemeMode(DEFAULT_THEME.themeMode);
    setAccentColor(DEFAULT_THEME.accentColor);
    setRadius(DEFAULT_THEME.radius);
    setFontFamily(DEFAULT_THEME.fontFamily);
    setPlacement('LTR');
    setSidebarBg('Dark');
    setHeaderBg(DEFAULT_THEME.headerBg);
    saveThemeSettings({ ...DEFAULT_THEME });
    setShowResetModal(false);
    toast.success('Theme reset to the CodeCortex defaults.');
  };

  const accentsList = [
    { id: 'indigo', name: 'CodeCortex Indigo', hex: '#4f46e5', bg: 'bg-indigo-600' },
    { id: 'blue', name: 'Professional Blue', hex: '#2563eb', bg: 'bg-blue-600' },
    { id: 'green', name: 'Emerald Green', hex: '#16a34a', bg: 'bg-green-600' },
    { id: 'purple', name: 'Royal Amethyst', hex: '#9333ea', bg: 'bg-purple-600' },
    { id: 'orange', name: 'Sunset Amber', hex: '#ea580c', bg: 'bg-orange-600' },
    { id: 'red', name: 'Rosewood Crimson', hex: '#dc2626', bg: 'bg-red-600' },
    { id: 'coral', name: 'Coral Red', hex: '#e55b4c', bg: 'bg-orange-500' },
    { id: 'magenta', name: 'Classic Magenta', hex: '#d81b60', bg: 'bg-pink-600' },
    { id: 'turquoise', name: 'Ocean Teal', hex: '#0f766e', bg: 'bg-teal-700' },
    { id: 'navy', name: 'Charcoal Slate', hex: '#1e293b', bg: 'bg-slate-800' },
  ];

  const radiiList = [
    { id: '0rem', name: 'Sharp (0px)', desc: '0px' },
    { id: '0.25rem', name: 'Compact', desc: '4px' },
    { id: '0.5rem', name: 'Default', desc: '8px' },
    { id: '0.75rem', name: 'Rounded', desc: '12px' },
    { id: '1rem', name: 'Soft', desc: '16px' },
  ];

  const fontsList = [
    { id: 'roboto', name: 'Roboto', desc: 'Clean & Standard' },
    { id: 'inter', name: 'Inter', desc: 'Aesthetic & Modern' },
    { id: 'outfit', name: 'Outfit', desc: 'Premium Geometric' },
  ];

  const headers = [
    { id: 'Brand', label: 'Accent', barBg: '' },
    { id: 'Blue', label: 'Blue', barBg: 'bg-blue-500' },
    { id: 'Dark', label: 'Dark', barBg: 'bg-slate-800' },
    { id: 'Green', label: 'Green', barBg: 'bg-emerald-500' },
    { id: 'Red', label: 'Red', barBg: 'bg-rose-500' },
    { id: 'White', label: 'White', barBg: 'bg-white border border-slate-200' },
    { id: 'Light Green', label: 'Teal', barBg: 'bg-teal-500' },
  ];

  const presets = [
    {
      name: 'CodeCortex Classic',
      desc: 'Indigo accent, navy sidebar, light workspace (default)',
      themeMode: 'light',
      accentColor: 'indigo',
      radius: '0.5rem',
      fontFamily: 'roboto',
      sidebarBg: 'Dark',
      headerBg: 'Brand'
    },
    {
      name: 'Midnight',
      desc: 'Full dark mode, easy on the eyes in the evening',
      themeMode: 'dark',
      accentColor: 'indigo',
      radius: '0.75rem',
      fontFamily: 'inter',
      sidebarBg: 'Dark',
      headerBg: 'Dark'
    },
    {
      name: 'Ocean Teal',
      desc: 'Calm teal accent with a light sidebar',
      themeMode: 'light',
      accentColor: 'turquoise',
      radius: '0.75rem',
      fontFamily: 'inter',
      sidebarBg: 'Light',
      headerBg: 'Brand'
    },
    {
      name: 'Minimal White',
      desc: 'White header and sidebar, blue highlights, sharp corners',
      themeMode: 'light',
      accentColor: 'blue',
      radius: '0.25rem',
      fontFamily: 'roboto',
      sidebarBg: 'Light',
      headerBg: 'White'
    }
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setThemeMode(p.themeMode as any);
    setAccentColor(p.accentColor);
    setRadius(p.radius);
    setFontFamily(p.fontFamily);
    setSidebarBg(p.sidebarBg as any);
    setHeaderBg(p.headerBg);
    toast.success(`${p.name} preset configured. Click Save to apply!`);
  };

  // Get active accent values for preview rendering
  const activeAccentHex = accentsList.find(a => a.id === accentColor)?.hex || '#4f46e5';
  const activeHeaderBg = headers.find(h => h.id === headerBg)?.barBg || '';

  return (
    <div className="relative pb-24 font-sans">
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl max-w-sm w-full border border-slate-100 dark:border-slate-800 text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center mx-auto text-rose-500">
              <RotateCcw className="w-8 h-8 animate-spin-reverse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Reset Theme Settings?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">This will revert all global layout, font, accent, and color options to standard defaults.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowResetModal(false)} 
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmReset} 
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Reset Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Side: Live Preview Panel */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-4 space-y-4">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-primary" /> Live Layout Preview
            </p>
            
            <div 
              style={{ borderRadius: radius }}
              className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg bg-slate-50 dark:bg-slate-950 transition-all duration-300"
            >
              {/* Mock Header */}
              <div
                className={`h-11 w-full flex items-center px-4 gap-2 text-white ${headerBg === 'White' ? 'bg-white text-slate-800 border-b border-slate-200 dark:border-slate-800' : activeHeaderBg}`}
                style={headerBg === 'Brand' ? { backgroundColor: activeAccentHex } : undefined}
              >
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <span className="w-3 h-3 rounded-full bg-green-400/80" />
                <span className="ml-4 text-[10px] tracking-wider uppercase opacity-80" style={{ fontFamily: fontFamily === 'outfit' ? 'Outfit' : fontFamily === 'inter' ? 'Inter' : 'Roboto' }}>
                  ERP Admin Dashboard
                </span>
              </div>
              
              <div className="flex" style={{ minHeight: 290 }}>
                {/* Mock Sidebar */}
                <div 
                  className={`w-1/3 p-4 space-y-3 transition-colors duration-300 border-r border-slate-200 dark:border-slate-800 ${
                    sidebarBg === 'Dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: activeAccentHex }}>🎓</span>
                    <div className="h-3 w-12 rounded-full bg-slate-300/40" />
                  </div>
                  {[0, 1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      style={{ borderRadius: `calc(${radius} - 2px)` }}
                      className={`h-7 flex items-center gap-2 px-2.5 transition-all ${
                        i === 0 ? 'bg-slate-200/40 dark:bg-slate-800/40 font-bold' : 'opacity-70'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: i === 0 ? activeAccentHex : '#94a3b8' }} />
                      <div className="h-2 w-14 rounded-full bg-slate-300/50" />
                    </div>
                  ))}
                </div>

                {/* Mock Workspace Panel */}
                <div className="flex-1 p-5 space-y-4 bg-white dark:bg-slate-900 transition-colors duration-300">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white" style={{ fontFamily: fontFamily === 'outfit' ? 'Outfit' : fontFamily === 'inter' ? 'Inter' : 'Roboto' }}>
                        Active Students
                      </h4>
                      <p className="text-[9px] text-slate-400">Section Grade 10B</p>
                    </div>
                    <span 
                      style={{ borderRadius: `calc(${radius} - 4px)` }}
                      className="text-[9px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200"
                    >
                      Live
                    </span>
                  </div>

                  {/* Card Previews */}
                  <div className="grid grid-cols-2 gap-3">
                    {[0, 1].map(k => (
                      <div 
                        key={k}
                        style={{ borderRadius: `calc(${radius} - 2px)` }}
                        className="bg-slate-50 dark:bg-slate-950 p-3 border border-slate-100 dark:border-slate-850 space-y-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px]">👤</span>
                          <div className="h-2 w-10 rounded-full bg-slate-300" />
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200" />
                      </div>
                    ))}
                  </div>

                  {/* Primary Action Button */}
                  <button 
                    style={{ borderRadius: radius, backgroundColor: activeAccentHex }}
                    className="w-full h-8 flex items-center justify-center text-white font-bold text-[10px] shadow-sm uppercase tracking-wider"
                  >
                    Save Registration
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center bg-blue-50/50 dark:bg-slate-950 p-4 border border-blue-100 dark:border-slate-850" style={{ borderRadius: radius }}>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-snug">
                Font choice applied: <span className="text-primary capitalize">{fontFamily}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Changes update layout direction and components instantly.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Settings Form */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* App Theme Mode Selector */}
          <Section title="Application Theme Mode" icon={<Monitor className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-3">
              <OptionTile 
                active={themeMode === 'light'} 
                onClick={() => setThemeMode('light')} 
                label="Light Mode" 
                icon={<Sun className="w-4 h-4" />} 
              />
              <OptionTile 
                active={themeMode === 'dark'} 
                onClick={() => setThemeMode('dark')} 
                label="Dark Mode" 
                icon={<Moon className="w-4 h-4" />} 
              />
              <OptionTile 
                active={themeMode === 'system'} 
                onClick={() => setThemeMode('system')} 
                label="System Mode" 
                icon={<Monitor className="w-4 h-4" />} 
              />
            </div>
          </Section>

          {/* Accent Color Picker */}
          <Section title="Primary Brand Accent Color" icon={<Palette className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-3">
              {accentsList.map(a => {
                const isSelected = accentColor === a.id;
                return (
                  <button 
                    key={a.id} 
                    onClick={() => setAccentColor(a.id)}
                    className={`relative p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all text-left ${
                      isSelected 
                        ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: a.hex }} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{a.name}</span>
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[9px] shadow-sm">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Card Border Radius */}
          <Section title="Component Corner Roundness" icon={<AppWindow className="w-4 h-4" />}>
            <div className="grid grid-cols-5 gap-2">
              {radiiList.map(r => {
                const isSelected = radius === r.id;
                return (
                  <button 
                    key={r.id} 
                    onClick={() => setRadius(r.id)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold">{r.name}</span>
                    <span className="text-[8px] opacity-60 font-mono">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Typography Choice */}
          <Section title="Typography / Font Family" icon={<Type className="w-4 h-4" />}>
            <div className="grid grid-cols-3 gap-3">
              {fontsList.map(f => {
                const isSelected = fontFamily === f.id;
                return (
                  <button 
                    key={f.id} 
                    onClick={() => setFontFamily(f.id)}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-start gap-1 transition-all text-left ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.name}</span>
                    <span className="text-[9px] text-slate-400 leading-none">{f.desc}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Layout Configuration */}
          <Section title="Navigation & Layout Style" icon={<Layout className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Layout Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <OptionTile 
                    active={placement === 'LTR'} 
                    onClick={() => setPlacement('LTR')} 
                    label="LTR (Left)" 
                    icon={<ArrowLeftRight className="w-3.5 h-3.5" />} 
                  />
                  <OptionTile 
                    active={placement === 'RTL'} 
                    onClick={() => setPlacement('RTL')} 
                    label="RTL (Right)" 
                    icon={<ArrowLeftRight className="w-3.5 h-3.5 rotate-180" />} 
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sidebar Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  <OptionTile 
                    active={sidebarBg === 'Light'} 
                    onClick={() => setSidebarBg('Light')} 
                    label="Light Gray" 
                    icon={<Sun className="w-3.5 h-3.5" />} 
                  />
                  <OptionTile 
                    active={sidebarBg === 'Dark'} 
                    onClick={() => setSidebarBg('Dark')} 
                    label="Dark Navy" 
                    icon={<Moon className="w-3.5 h-3.5" />} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Navbar Header Style</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {headers.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setHeaderBg(item.id)} 
                    className={`relative h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      headerBg === item.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-750'
                    }`}
                  >
                    <div className={`w-8 h-2.5 rounded-sm ${item.barBg}`} style={item.id === 'Brand' ? { backgroundColor: activeAccentHex } : undefined} />
                    <span className="text-[9px] font-bold text-slate-500">{item.label}</span>
                    {headerBg === item.id && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[7px]">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Quick Presets */}
          <Section title="Professional Theme Templates" icon={<Sparkles className="w-4 h-4" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map(p => (
                <button 
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary transition-all text-left space-y-1.5 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-primary transition-colors">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">{p.name}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky Save / Reset Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-45 flex items-center gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl px-4 py-3">
        <button 
          onClick={() => setShowResetModal(true)} 
          className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-1.5 px-8 py-2.5 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-sm space-y-4">
      <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <span className="text-primary">{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function OptionTile({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all text-xs font-bold w-full ${
        active 
          ? 'border-primary bg-primary/5 text-primary' 
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-750'
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[9px] shadow-sm">
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  );
}