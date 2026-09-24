import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/api';
import { applyLanguage } from '@/i18n';
import { browserLanguage } from '@/i18n/languages';

/** The school's currency and language (from /tenants/locale/). */
export interface SchoolLocale {
  currency: string; // ISO code, e.g. PKR, EUR
  currency_symbol: string; // e.g. Rs, €
  currency_name: string;
  currency_decimals: number;
  language: string; // school default, e.g. en, ar
  direction: 'ltr' | 'rtl';
  timezone: string;
}

export interface LocaleOptions {
  currencies: { code: string; symbol: string; name: string; decimals: number }[];
  languages: { code: string; name: string; native_name: string; direction: 'ltr' | 'rtl' }[];
}

const DEFAULT_LOCALE: SchoolLocale = {
  currency: 'PKR',
  currency_symbol: 'Rs',
  currency_name: 'Pakistani Rupee',
  currency_decimals: 0,
  language: 'en',
  direction: 'ltr',
  timezone: 'Asia/Karachi',
};

interface LocaleState {
  school: SchoolLocale;
  /** The signed-in person's own choice; null = use the school's default. */
  userLanguage: string | null;
  setSchoolLocale: (locale: Partial<SchoolLocale>) => void;
  setUserLanguage: (code: string | null) => void;
  /** Load the school's locale from the server (after sign-in). */
  refresh: () => Promise<void>;
  effectiveLanguage: () => string;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      school: DEFAULT_LOCALE,
      userLanguage: null,

      setSchoolLocale: (locale) => {
        set({ school: { ...get().school, ...locale } });
        applyLanguage(get().effectiveLanguage());
      },

      setUserLanguage: (code) => {
        set({ userLanguage: code });
        applyLanguage(get().effectiveLanguage());
      },

      refresh: async () => {
        try {
          const res = await api.get<{ locale: SchoolLocale }>('/tenants/locale/');
          if (res.data?.locale) get().setSchoolLocale(res.data.locale);
        } catch {
          /* keep the cached locale */
        }
      },

      effectiveLanguage: () => get().userLanguage || get().school.language || 'en',
    }),
    {
      name: 'locale-settings',
      partialize: (s) => ({ school: s.school, userLanguage: s.userLanguage }),
    },
  ),
);

/** Apply the saved language before first render (signed out: browser language). */
export function initLocale() {
  const state = useLocaleStore.getState();
  const signedIn = Boolean(localStorage.getItem('access_token'));
  applyLanguage(state.userLanguage || (signedIn ? state.school.language : browserLanguage()));
}

/** Current currency, readable outside React components. */
export const currentCurrency = () => useLocaleStore.getState().school;
