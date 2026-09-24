// Interface translations. English is bundled; other languages load on demand
// from ./locales/<code>.json. Anything not translated yet falls back to English.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import { languageByCode } from './languages';

const loaders = import.meta.glob('./locales/*.json');

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

async function loadLanguage(code: string) {
  if (code === 'en' || i18n.hasResourceBundle(code, 'translation')) return;
  const load = loaders[`./locales/${code}.json`];
  if (!load) return;
  const mod = (await load()) as { default: Record<string, unknown> };
  i18n.addResourceBundle(code, 'translation', mod.default, true, true);
}

/** Switch the interface language and text direction (Arabic and Urdu are right-to-left). */
export async function applyLanguage(code: string) {
  const lang = languageByCode(code) ? code : 'en';
  await loadLanguage(lang);
  await i18n.changeLanguage(lang);
  const root = document.documentElement;
  root.lang = lang;
  root.dataset.langDir = languageByCode(lang)?.dir || 'ltr';
  // The theme's "Layout direction" setting can also force RTL; language wins for RTL scripts.
  window.dispatchEvent(new Event('theme-changed'));
}

export default i18n;
