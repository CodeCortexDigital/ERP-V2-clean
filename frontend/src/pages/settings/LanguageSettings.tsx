import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Coins, Globe, Info, Loader2, MapPin, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleStore } from '@/store/localeStore';
import schoolService, { type SignupConfig } from '@/services/school.service';
import { LanguageGrid } from '@/components/common/LanguagePicker';
import { languageByCode } from '@/i18n/languages';

const SAMPLE_TERMS: Array<[string, string]> = [['challan', 'Fee document'], ['date_sheet', 'Exam dates'], ['award_list', 'Marks list'],
  ['b_form', 'Child ID document'], ['cheque', 'Paper payment'], ['timetable', 'Class times']];
const WEEK_START: Array<[number, string]> = [[1, 'Monday'], [0, 'Sunday'], [6, 'Saturday']];

/** Settings → Language & currency: the school's currency, default language and region style, plus my own language. */
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
  const [region, setRegion] = useState(school.region);
  const [dateFormat, setDateFormat] = useState(school.date_format);
  const [weekStart, setWeekStart] = useState<number>(school.week_start ?? 1);
  const [applyDefaults, setApplyDefaults] = useState(true);
  const [savingRegion, setSavingRegion] = useState(false);

  useEffect(() => {
    refresh().then(() => {
      const s = useLocaleStore.getState().school;
      setCurrency(s.currency);
      setLanguage(s.language);
      setRegion(s.region);
      setDateFormat(s.date_format);
      setWeekStart(s.week_start ?? 1);
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

  const regions = options?.regions || [];
  const picked = regions.find((r) => r.code === region);
  const regionDirty = region !== school.region || dateFormat !== school.date_format || weekStart !== school.week_start;
  const saveRegion = async () => {
    setSavingRegion(true);
    try {
      const patch = region !== school.region
        ? { region, apply_defaults: applyDefaults }
        : { date_format: dateFormat, week_start: weekStart };
      const res = await schoolService.updateLocale(patch);
      setSchoolLocale(res.locale);
      setCurrency(res.locale.currency);
      setDateFormat(res.locale.date_format);
      setWeekStart(res.locale.week_start);
      toast.success(`Region style saved: ${res.locale.region_label}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save.');
    } finally {
      setSavingRegion(false);
    }
  };
  const sample = new Date(2026, 8, 26).toLocaleDateString(dateFormat === 'MM/DD/YYYY' ? 'en-US' : dateFormat === 'YYYY-MM-DD' ? 'sv-SE' : 'en-GB');

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

      {/* Region style (admin) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4" aria-labelledby="region-title">
        <div>
          <p id="region-title" className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin className="w-4 h-4 text-brand" /> Region style</p>
          <p className="text-xs text-slate-500 mt-1">How the school's screens are worded and how dates are written, which Pakistan-only questions forms ask (caste, orphan status, OSC), and which payment methods are offered. Nothing already recorded changes.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="radiogroup" aria-label="Region style">
          {(regions.length ? regions : [{ code: school.region, label: school.region_label }] as any[]).map((r: any) => (
            <button key={r.code} type="button" role="radio" aria-checked={region === r.code} disabled={!isAdmin}
              onClick={() => { setRegion(r.code); setDateFormat(r.date_format || dateFormat); setWeekStart(r.week_start ?? weekStart); }}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm disabled:opacity-70 ${region === r.code ? 'border-brand ring-2 ring-brand/30 font-bold' : 'border-slate-200'}`}>
              {r.label}
              {r.currency && <span className="block text-[11px] font-normal text-slate-500">{r.currency} · {r.date_format}</span>}
            </button>
          ))}
        </div>
        {picked && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Wording in this style</p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
              {SAMPLE_TERMS.map(([k, what]) => <div key={k} className="flex gap-1"><dt className="text-slate-500">{what}:</dt><dd className="font-semibold text-slate-800">{picked.terms[k]}</dd></div>)}
            </dl>
          </div>
        )}
        {region !== school.region && picked?.currency && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={applyDefaults} onChange={(e) => setApplyDefaults(e.target.checked)} disabled={!isAdmin} />
            Also switch the currency to {picked.currency} and the time zone to {picked.timezone}
          </label>
        )}
        {region === school.region && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-800"><span className="flex items-center gap-2 mb-1.5"><CalendarDays className="w-4 h-4 text-brand" /> Date format</span>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value as any)} disabled={!isAdmin} className="auth-input px-3 disabled:opacity-70">
                {(options?.date_formats || ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <span className="block text-xs font-normal text-slate-500 mt-1">26 September 2026 shows as {sample}</span>
            </label>
            <label className="text-sm font-semibold text-slate-800"><span className="flex items-center gap-2 mb-1.5"><CalendarDays className="w-4 h-4 text-brand" /> The week starts on</span>
              <select value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value))} disabled={!isAdmin} className="auth-input px-3 disabled:opacity-70">
                {WEEK_START.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <span className="block text-xs font-normal text-slate-500 mt-1">Used by the school calendar</span>
            </label>
          </div>
        )}
        {isAdmin && (
          <div className="flex justify-end">
            <button onClick={saveRegion} disabled={!regionDirty || savingRegion} className="auth-primary-btn w-auto px-6 disabled:opacity-50">
              {savingRegion && <Loader2 className="w-4 h-4 animate-spin" />} Save region style
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
