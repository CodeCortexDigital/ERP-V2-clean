import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

const ACCENT_COLORS = {
  blue: { light: '221.2 83.2% 53.3%', dark: '217.2 91.2% 59.8%' },
  green: { light: '142.1 76.2% 36.3%', dark: '142.1 70.6% 45.3%' },
  purple: { light: '262.1 83.3% 57.8%', dark: '263.4 90% 64.3%' },
  orange: { light: '24.6 95% 53.1%', dark: '20.5 90.2% 48.2%' },
  red: { light: '346.8 77.2% 49.8%', dark: '346.8 84.1% 50.2%' },
};

const applyThemeAndAccent = (theme: ThemeMode, accent: string) => {
  const root = document.documentElement;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  const colors = ACCENT_COLORS[accent as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.blue;
  const hslValue = isDark ? colors.dark : colors.light;
  
  root.style.setProperty('--primary', hslValue);
  root.style.setProperty('--ring', hslValue);
};

interface AppState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  theme: ThemeMode;
  accentColor: string;
  globalLoading: boolean;
  loadingMessage: string | null;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  setAccentColor: (color: string) => void;
  setGlobalLoading: (loading: boolean, message?: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      theme: 'light',
      accentColor: 'green',
      globalLoading: false,
      loadingMessage: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      collapseSidebar: () => set({ sidebarCollapsed: true }),

      expandSidebar: () => set({ sidebarCollapsed: false }),

      setTheme: (theme) => {
        set({ theme });
        applyThemeAndAccent(theme, get().accentColor);
      },

      setAccentColor: (accentColor) => {
        set({ accentColor });
        applyThemeAndAccent(get().theme, accentColor);
      },

      setGlobalLoading: (loading, message = null) =>
        set({ globalLoading: loading, loadingMessage: message }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        accentColor: state.accentColor,
      }),
    }
  )
);

// Trigger initial setup after rehydration
setTimeout(() => {
  const state = useAppStore.getState();
  if (state.theme && state.accentColor) {
    applyThemeAndAccent(state.theme, state.accentColor);
  }
}, 0);

/** @deprecated Use useAppStore — kept for existing imports */
export const useUIStore = useAppStore;
