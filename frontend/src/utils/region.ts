// Region style (Settings → Language, currency & region): the school's wording, date style, week start, which
// Pakistan-only form fields it asks for, and its payment methods. The app's own text is written the Pakistani way;
// `localizeLabel` swaps those phrases for the school's region (e.g. "Date Sheet" → "Exam Schedule" in the US).
import { useLocaleStore } from '@/store/localeStore';

export type TermKey =
  | 'challan' | 'date_sheet' | 'award_list' | 'result_card' | 'paid_slips' | 'fee_defaulters' | 'fee_particulars'
  | 'admission_letter' | 'b_form' | 'cnic' | 'cheque' | 'timetable' | 'enrolment' | 'principal';

// Pakistani phrase → the term it stands for. Longer phrases first so "Fee Challan" wins over "Challan".
const PHRASES: Array<[RegExp, TermKey]> = [
  [/\bFee Defaulters\b/g, 'fee_defaulters'],
  [/\bFee Particulars\b/g, 'fee_particulars'],
  [/\bAdmission Letter\b/g, 'admission_letter'],
  [/\bDate Sheet\b/g, 'date_sheet'],
  [/\bAward List\b/g, 'award_list'],
  [/\bResult Card\b/g, 'result_card'],
  [/\bPaid Slips\b/g, 'paid_slips'],
  [/\bChallans\b/g, 'challan'],
  [/\bChallan\b/g, 'challan'],
  [/\bB-Form\b/g, 'b_form'],
  [/\bCNIC\b/g, 'cnic'],
  [/\bCheque\b/g, 'cheque'],
  [/\bTimetable\b/g, 'timetable'],
  [/\bEnrolment\b/g, 'enrolment'],
  [/\bPrincipal\b/g, 'principal'],
];

export function currentRegion() {
  return useLocaleStore.getState().school;
}

/** Swap Pakistani wording for the school's region. Text in other languages passes through unchanged. */
export function localizeLabel(text: string, terms = currentRegion().terms): string {
  if (!text || !terms) return text;
  let out = text;
  for (const [re, key] of PHRASES) {
    const word = terms[key];
    if (!word) continue;
    re.lastIndex = 0;
    if (!re.test(out)) continue;
    re.lastIndex = 0;
    out = out.replace(re, (m) => (m.endsWith('s') && !word.endsWith('s') && key === 'challan' ? `${word}s` : word));
  }
  return out;
}

/** React: the school's region and helpers that re-render when it changes. */
export function useRegion() {
  const school = useLocaleStore((s) => s.school);
  return {
    region: school.region,
    terms: school.terms,
    weekStart: school.week_start ?? 1,
    dateLocale: school.date_locale || 'en-GB',
    isHidden: (field: string) => (school.hidden_fields || []).includes(field),
    label: (text: string) => localizeLabel(text, school.terms),
    paymentOptions: paymentOptions(school.payment_methods),
  };
}

// The region's payment methods, mapped onto what an invoice payment records (several may share one).
const PAYMENT_VALUE: Record<string, string> = {
  cash: 'cash', bank_transfer: 'bank_transfer', ach: 'bank_transfer', direct_debit: 'bank_transfer',
  jazzcash: 'online', easypaisa: 'online', card: 'credit_card', cheque: 'cheque', check: 'cheque',
};
export function paymentOptions(methods?: Array<{ code: string; label: string }>) {
  const list = methods?.length ? methods : [{ code: 'cash', label: 'Cash' }, { code: 'bank_transfer', label: 'Bank transfer' }, { code: 'cheque', label: 'Cheque' }];
  const grouped = new Map<string, string[]>();
  for (const m of list) {
    const v = PAYMENT_VALUE[m.code] || 'online';
    grouped.set(v, [...(grouped.get(v) || []), m.label]);
  }
  if (!grouped.has('online')) grouped.set('online', ['Online payment']);
  return Array.from(grouped, ([value, labels]) => ({ value, label: value === 'online' && labels.length > 1 ? `Online (${labels.join(', ')})` : labels.join(' / ') }));
}

// ---------------------------------------------------------------------------
// Dates: every `toLocaleDateString()` / `toLocaleString()` in the app that doesn't name a locale follows the school's
// date style (DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD). Calls that pass a locale keep it.
// ---------------------------------------------------------------------------

let installed = false;
export function installRegionDates() {
  if (installed) return;
  installed = true;
  const pick = (locales: unknown) => (locales == null || (Array.isArray(locales) && locales.length === 0) ? currentRegion().date_locale || undefined : locales);
  const proto = Date.prototype as any;
  for (const name of ['toLocaleDateString', 'toLocaleString', 'toLocaleTimeString'] as const) {
    const original = proto[name];
    proto[name] = function (this: Date, locales?: unknown, options?: Intl.DateTimeFormatOptions) {
      return original.call(this, pick(locales), options);
    };
  }
}
