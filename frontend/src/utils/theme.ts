// frontend/src/utils/theme.ts
// Single source of truth for the app theme. Settings -> Theme saves to
// localStorage('theme_settings'); applyGlobalTheme() turns that into the
// html.dark class and the CSS variables every page reads.
import { useAppStore } from '@/store/appStore';

export type ThemeMode = 'light' | 'dark' | 'system';

// hex/strong: solid surfaces (buttons, header, active nav). soft: accent text on
// dark backgrounds. light: tint behind accent text on light backgrounds.
export const accentMap: Record<string, { hsl: string; hex: string; rgb: string; strong: string; soft: string; light: string }> = {
  indigo: { hsl: '243 75% 59%', hex: '#4f46e5', rgb: '79 70 229', strong: '#4338ca', soft: '#a5b4fc', light: '#eef2ff' },
  blue: { hsl: '221.2 83.2% 53.3%', hex: '#2563eb', rgb: '37 99 235', strong: '#1d4ed8', soft: '#93c5fd', light: '#eff6ff' },
  green: { hsl: '142.1 76.2% 36.3%', hex: '#16a34a', rgb: '22 163 74', strong: '#15803d', soft: '#86efac', light: '#ecfdf5' },
  purple: { hsl: '262.1 83.3% 57.8%', hex: '#9333ea', rgb: '147 51 234', strong: '#7e22ce', soft: '#d8b4fe', light: '#faf5ff' },
  orange: { hsl: '24.6 95% 53.1%', hex: '#ea580c', rgb: '234 88 12', strong: '#c2410c', soft: '#fdba74', light: '#fff7ed' },
  red: { hsl: '346.8 77.2% 49.8%', hex: '#dc2626', rgb: '220 38 38', strong: '#b91c1c', soft: '#fca5a5', light: '#fef2f2' },
  coral: { hsl: '6 76% 60%', hex: '#e55b4c', rgb: '229 91 76', strong: '#c2410c', soft: '#fdba74', light: '#fff5f5' },
  magenta: { hsl: '338 78% 48%', hex: '#d81b60', rgb: '216 27 96', strong: '#be185d', soft: '#f9a8d4', light: '#fdf2f8' },
  turquoise: { hsl: '175 84% 32%', hex: '#0f766e', rgb: '15 118 110', strong: '#0f766e', soft: '#5eead4', light: '#f0fdfa' },
  navy: { hsl: '215 28% 17%', hex: '#1e293b', rgb: '30 41 59', strong: '#1e293b', soft: '#cbd5e1', light: '#f1f5f9' },
};

export const DEFAULT_THEME = {
  themeMode: 'light' as ThemeMode,
  accentColor: 'indigo',
  radius: '0.5rem',
  fontFamily: 'roboto',
  placement: 'LTR',
  sidebarBg: 'Dark',
  headerBg: 'Brand',
};

export type ThemeSettings = typeof DEFAULT_THEME;

export const readThemeSettings = (): ThemeSettings => {
  try {
    const saved = localStorage.getItem('theme_settings');
    return { ...DEFAULT_THEME, ...(saved ? JSON.parse(saved) : {}) };
  } catch {
    return { ...DEFAULT_THEME };
  }
};

export const saveThemeSettings = (patch: Partial<ThemeSettings>) => {
  const next = { ...readThemeSettings(), ...patch };
  try {
    localStorage.setItem('theme_settings', JSON.stringify(next));
  } catch {
    /* storage unavailable: still apply for this session */
  }
  applyGlobalTheme(next);
  window.dispatchEvent(new Event('theme-changed'));
  return next;
};

export const isDarkMode = (mode: ThemeMode) =>
  mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

export const applyGlobalTheme = (settings?: ThemeSettings) => {
  const t = settings || readThemeSettings();
  const root = document.documentElement;

  // 1. Light / dark
  const dark = isDarkMode(t.themeMode);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';

  // 2. Accent: Tailwind primary/ring plus the --app-accent-* variables that the
  //    global overrides in index.css use to recolour buttons, headings and tints.
  const accent = accentMap[t.accentColor] || accentMap[DEFAULT_THEME.accentColor];
  root.style.setProperty('--primary', accent.hsl);
  root.style.setProperty('--ring', accent.hsl);
  root.style.setProperty('--app-accent', accent.hex);
  root.style.setProperty('--app-accent-strong', accent.strong);
  root.style.setProperty('--app-accent-rgb', accent.rgb);
  root.style.setProperty('--app-accent-text', dark ? accent.soft : accent.strong);
  root.style.setProperty('--app-accent-light', dark ? `rgb(${accent.rgb} / 0.16)` : accent.light);

  // 3. Radius
  root.style.setProperty('--radius', t.radius || DEFAULT_THEME.radius);

  // 4. Fonts
  const fonts: Record<string, [string, string]> = {
    roboto: ["'Roboto', sans-serif", "'Mulish', sans-serif"],
    outfit: ["'Outfit', sans-serif", "'Outfit', sans-serif"],
    inter: ["'Inter', sans-serif", "'Inter', sans-serif"],
  };
  const [fontSans, fontDisplay] = fonts[t.fontFamily] || fonts.roboto;
  root.style.setProperty('--font-sans', fontSans);
  root.style.setProperty('--font-display', fontDisplay);

  // 5. Direction
  // Right-to-left languages (Arabic, Urdu) always get RTL; otherwise the theme setting decides.
  root.dir = root.dataset.langDir === 'rtl' || String(t.placement).toLowerCase() === 'rtl' ? 'rtl' : 'ltr';

  // 6. Chrome styles read by Sidebar / Header
  root.dataset.sidebarBg = t.sidebarBg === 'Light' ? 'light' : 'dark';
  root.dataset.headerBg = t.headerBg || DEFAULT_THEME.headerBg;

  // Keep the zustand store in step (it only mirrors these values).
  const store = useAppStore.getState();
  if (store.theme !== t.themeMode || store.accentColor !== t.accentColor) {
    useAppStore.setState({ theme: t.themeMode, accentColor: t.accentColor });
  }
};

let initialised = false;
export const initGlobalTheme = () => {
  applyGlobalTheme();
  if (initialised) return;
  initialised = true;
  window.addEventListener('theme-changed', () => applyGlobalTheme());
  // "System" mode follows the OS switching between light and dark.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemeSettings().themeMode === 'system') applyGlobalTheme();
  });
};
