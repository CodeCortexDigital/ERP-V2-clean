import { currentCurrency } from '@/store/localeStore';

/** The school's currency symbol, e.g. 'Rs', '€', '£' (Settings → Language & currency). */
export function getCurrencySymbol(): string {
  return currentCurrency().currency_symbol || 'Rs';
}

/** Short alias for page text: `${cur()} 1,000` or <>{cur()} {amount}</>. */
export const cur = getCurrencySymbol;

// Currencies whose readers group large amounts in lakh / crore.
const LAKH_CRORE = ['PKR', 'INR', 'LKR', 'NPR', 'BDT'];

/**
 * Short money label for cards where space is tight: "Rs 20.3 lakh",
 * "Rs 1.25 crore", "$ 2.4M". Small amounts are shown in full.
 */
export function formatCompactMoney(amount: number, symbol = getCurrencySymbol()): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 2 : 1 });
  if (LAKH_CRORE.includes(currentCurrency().currency) && symbol === getCurrencySymbol()) {
    if (abs >= 1e7) return `${sign}${symbol} ${fmt(abs / 1e7)} crore`;
    if (abs >= 1e5) return `${sign}${symbol} ${fmt(abs / 1e5)} lakh`;
  } else if (abs >= 1e5) {
    const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(abs);
    return `${sign}${symbol} ${compact}`;
  }
  return `${sign}${symbol} ${abs.toLocaleString()}`;
}

/** Full amount in the school's currency, e.g. "Rs 2,028,500" or "€ 1,234.50". */
export function formatMoney(amount: number, symbol = getCurrencySymbol()): string {
  const n = Number(amount) || 0;
  const decimals = currentCurrency().currency_decimals ?? 0;
  const text = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? decimals : 0, maximumFractionDigits: decimals });
  return `${n < 0 ? '-' : ''}${symbol} ${text}`;
}
