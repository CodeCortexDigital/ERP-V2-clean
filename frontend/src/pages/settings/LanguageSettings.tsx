import { useEffect, useMemo, useState } from 'react';
import { Coins, Globe, Info, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleStore } from '@/store/localeStore';
import schoolService, { type SignupConfig } from '@/services/school.service';
import { LanguageGrid } from '@/components/common/LanguagePicker';
import { languageByCode } from '@/i18n/languages';

/** Settings → Language & currency: the school's currency and default language, plus my own language. */
export default function LanguageSettings() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const school = useLocaleStore((s) => s.school);
  const setSchoolLocale = useLocaleStore((s) => s.setSchoolLocale);
  const userLanguage = useLocaleStore((s) => s.userLanguage);
  const setUserLanguage = useLocaleStore((s) => s.setUserLanguage);
  const refresh = useLocaleStore((s) => s.refresh);

  const [options, setOptions] = useState<SignupConfig | null>(null);
  const [currency, setCurrency] = useState(school.currency);
  const [language, setLanguage] = useState(school.language);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refresh().then(() => {
      const s = useLocaleStore.getState().school;
      setCurrency(s.currency);
      setLanguage(s.language);
    });
    schoolService.signupConfig().then(setOptions).catch(() => {});
  }, [refresh]);

  const currencies = useMemo(
    () => [...(options?.currencies || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [options],
  );
  const dirty = currency !== school.currency || language !== school.language;

  const saveSchool = async () => {
    const picked = currencies.find((c) => c.code === currency);
    if (currency !== school.currency && !window.confirm(t('locale.confirmCurrency', { currency: picked ? `${picked.name} (${picked.symbol})` : currency }))) {
      return;
    }
    setSaving(true);
    try {
      const res = await schoolService.updateLocale({ currency, language });
      setSchoolLocale(res.locale);
      toast.success(t('locale.savedSchool'));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{t('locale.title')}</h2>
        <p className="text-sm text-slate-500">{t('locale.intro')}</p>
      </div>

      {/* School settings (admin) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        {!isAdmin && (
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600">
            <Info className="w-4 h-4 mt-0.5 shrink-0" /> {t('locale.adminOnly')}
          </p>
        )}

        <div>
          <label htmlFor="locale-currency" className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1.5">
            <Coins className="w-4 h-4 text-brand" /> {t('locale.schoolCurrency')}
          </label>
          <select
            id="locale-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={!isAdmin}
            className="auth-input px-3 max-w-md disabled:opacity-70"
          >
            {!currencies.length && <option value={currency}>{school.currency_name} ({school.currency})</option>}
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.code} · {c.symbol})</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">{t('locale.currencyNote')}</p>
        </div>

        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1.5">
            <Globe className="w-4 h-4 text-brand" /> {t('locale.schoolLanguage')}
          </p>
          <p className="mb-2 text-xs text-slate-500">{t('locale.schoolLanguageNote')}</p>
          <div className={isAdmin ? '' : 'pointer-events-none opacity-70'}>
            <LanguageGrid value={language} onChange={(code) => code && setLanguage(code)} className="sm:grid-cols-3" />
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <button onClick={saveSchool} disabled={!dirty || saving} className="auth-primary-btn w-auto px-6 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {t('locale.saveSchool')}
            </button>
          </div>
        )}
      </section>

      {/* Personal language (everyone) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <UserRound className="w-4 h-4 text-brand" /> {t('locale.myLanguage')}
        </p>
        <p className="text-xs text-slate-500">{t('locale.myLanguageNote')}</p>
        <LanguageGrid
          value={userLanguage}
          schoolDefault={school.language}
          onChange={(code) => setUserLanguage(code)}
          className="sm:grid-cols-3"
        />
        <p className="flex items-start gap-2 text-xs text-slate-500 pt-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {t('locale.translationNote')}
          {' '}({languageByCode(userLanguage || school.language)?.native})
        </p>
      </section>
    </div>
  );
}
