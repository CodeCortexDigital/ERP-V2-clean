// frontend/src/utils/theme.ts
import { useAppStore } from '@/store/appStore';

export const accentMap: Record<string, { hsl: string; hex: string; rgb: string; strong: string; light: string }> = {
  blue: { hsl: '221.2 83.2% 53.3%', hex: '#2563eb', rgb: '37 99 235', strong: '#1e40af', light: '#eff6ff' },
  green: { hsl: '142.1 76.2% 36.3%', hex: '#16a34a', rgb: '22 163 74', strong: '#15803d', light: '#ecfdf5' },
  purple: { hsl: '262.1 83.3% 57.8%', hex: '#9333ea', rgb: '147 51 234', strong: '#6d28d9', light: '#faf5ff' },
  orange: { hsl: '24.6 95% 53.1%', hex: '#ea580c', rgb: '234 88 12', strong: '#c2410c', light: '#fff7ed' },
  red: { hsl: '346.8 77.2% 49.8%', hex: '#dc2626', rgb: '220 38 38', strong: '#be123c', light: '#fef2f2' },
  coral: { hsl: '10 82% 56%', hex: '#e55b4c', rgb: '229 91 76', strong: '#c22f17', light: '#fff5f5' },
  magenta: { hsl: '340 82% 52%', hex: '#d81b60', rgb: '216 27 96', strong: '#9f1239', light: '#fdf2f8' },
  turquoise: { hsl: '170 100% 38%', hex: '#00bfa5', rgb: '0 191 165', strong: '#0f766e', light: '#f0fdfa' },
  navy: { hsl: '210 100% 12%', hex: '#001830', rgb: '0 24 48', strong: '#0f172a', light: '#f1f5f9' }
};

export const applyGlobalTheme = () => {
  try {
    const saved = localStorage.getItem('theme_settings');
    const t = saved ? JSON.parse(saved) : {};
    const root = document.documentElement;

    // 1. Resolve Theme Mode (Light / Dark)
    const mode = t.themeMode || 'light';
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Resolve Accent Color
    const colorKey = t.accentColor || 'green';
    const accent = accentMap[colorKey] || accentMap.green;

    // Set HSL variables for Tailwind
    root.style.setProperty('--primary', accent.hsl);
    root.style.setProperty('--ring', accent.hsl);

    // Set legacy theme app variables
    root.style.setProperty('--app-accent', accent.hex);
    root.style.setProperty('--app-accent-strong', accent.strong);
    root.style.setProperty('--app-accent-rgb', accent.rgb);
    root.style.setProperty('--app-accent-light', accent.light);
    
    // 3. Radius
    const radius = t.radius || '0.5rem';
    root.style.setProperty('--radius', radius);

    // 4. Font Family
    const font = t.fontFamily || 'roboto';
    let fontSans = "'Roboto', sans-serif";
    let fontDisplay = "'Mulish', sans-serif";
    if (font === 'outfit') {
      fontSans = "'Outfit', sans-serif";
      fontDisplay = "'Outfit', sans-serif";
    } else if (font === 'inter') {
      fontSans = "'Inter', sans-serif";
      fontDisplay = "'Inter', sans-serif";
    }
    root.style.setProperty('--font-sans', fontSans);
    root.style.setProperty('--font-display', fontDisplay);

    // 5. Layout Direction
    const placement = t.placement || 'LTR';
    root.dir = placement.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';

    // 6. Datasets for Sidebar & Header Preview
    root.dataset.sidebarBg = t.sidebarBg === 'Dark' ? 'dark' : 'light';
    root.dataset.headerBg = t.headerBg || 'Blue';
    
    // Sync zustand store to match (without double trigger loop)
    const store = useAppStore.getState();
    if (store.theme !== mode) {
      useAppStore.setState({ theme: mode });
    }
    if (store.accentColor !== colorKey) {
      useAppStore.setState({ accentColor: colorKey });
    }
  } catch (e) {
    /* ignore */
  }
};

export const initGlobalTheme = () => {
  applyGlobalTheme();
  window.addEventListener('theme-changed', applyGlobalTheme);
};
