import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  theme: ThemeMode;
  globalLoading: boolean;
  loadingMessage: string | null;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  setGlobalLoading: (loading: boolean, message?: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      theme: 'light',
      globalLoading: false,
      loadingMessage: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      collapseSidebar: () => set({ sidebarCollapsed: true }),

      expandSidebar: () => set({ sidebarCollapsed: false }),

      setTheme: (theme) => {
        set({ theme });
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      setGlobalLoading: (loading, message = null) =>
        set({ globalLoading: loading, loadingMessage: message }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

/** @deprecated Use useAppStore — kept for existing imports */
export const useUIStore = useAppStore;
