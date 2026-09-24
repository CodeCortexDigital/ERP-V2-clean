import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

// Theme values live in localStorage('theme_settings') and are applied by
// utils/theme.ts (initGlobalTheme listens for 'theme-changed'). The store only
// mirrors them so components can subscribe.
const persistTheme = (patch: { themeMode?: ThemeMode; accentColor?: string }) => {
  try {
    const saved = JSON.parse(localStorage.getItem('theme_settings') || '{}');
    localStorage.setItem('theme_settings', JSON.stringify({ ...saved, ...patch }));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('theme-changed'));
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
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      theme: 'light',
      accentColor: 'indigo',
      globalLoading: false,
      loadingMessage: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      collapseSidebar: () => set({ sidebarCollapsed: true }),

      expandSidebar: () => set({ sidebarCollapsed: false }),

      setTheme: (theme) => {
        set({ theme });
        persistTheme({ themeMode: theme });
      },

      setAccentColor: (accentColor) => {
        set({ accentColor });
        persistTheme({ accentColor });
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

/** @deprecated Use useAppStore — kept for existing imports */
export const useUIStore = useAppStore;
