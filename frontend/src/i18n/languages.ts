// Languages the interface is offered in (same list as the backend's
// services/core/tenants/localization.py LANGUAGES).
export interface LanguageOption {
  code: string;
  name: string; // English name
  native: string; // name in the language itself
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  { code: 'de', name: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'es', name: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr' },
  { code: 'it', name: 'Italian', native: 'Italiano', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', native: 'Português', dir: 'ltr' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Polish', native: 'Polski', dir: 'ltr' },
  { code: 'cs', name: 'Czech', native: 'Čeština', dir: 'ltr' },
  { code: 'sl', name: 'Slovenian', native: 'Slovenščina', dir: 'ltr' },
  { code: 'sr', name: 'Serbian', native: 'Srpski', dir: 'ltr' },
  { code: 'hr', name: 'Croatian', native: 'Hrvatski', dir: 'ltr' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar', dir: 'ltr' },
  { code: 'ro', name: 'Romanian', native: 'Română', dir: 'ltr' },
  { code: 'sq', name: 'Albanian', native: 'Shqip', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', dir: 'ltr' },
  { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'ur', name: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'zh', name: 'Chinese', native: '中文', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', native: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', native: '한국어', dir: 'ltr' },
];

export const languageByCode = (code?: string | null) => LANGUAGES.find((l) => l.code === code);

/** Best match for the browser's language, for people who aren't signed in yet. */
export const browserLanguage = (): string => {
  try {
    for (const tag of navigator.languages || [navigator.language]) {
      const code = tag.toLowerCase().split('-')[0];
      if (languageByCode(code)) return code;
    }
  } catch {
    /* no navigator */
  }
  return 'en';
};
