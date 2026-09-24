export function getCurrencySymbol(): string {
  try {
    const raw = localStorage.getItem('account_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.symbol) return parsed.symbol;
    }
  } catch {}
  return 'Rs';
}

const SOUTH_ASIAN = ['rs', 'rs.', '₨', '₹', 'pkr', 'inr'];

/**
 * Short money label for cards where space is tight: "Rs 20.3 lakh",
 * "Rs 1.25 crore", "$ 2.4M". Small amounts are shown in full.
 */
export function formatCompactMoney(amount: number, symbol = getCurrencySymbol()): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 2 : 1 });
  if (SOUTH_ASIAN.includes(symbol.trim().toLowerCase())) {
    if (abs >= 1e7) return `${sign}${symbol} ${fmt(abs / 1e7)} crore`;
    if (abs >= 1e5) return `${sign}${symbol} ${fmt(abs / 1e5)} lakh`;
  } else if (abs >= 1e5) {
    const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(abs);
    return `${sign}${symbol} ${compact}`;
  }
  return `${sign}${symbol} ${abs.toLocaleString()}`;
}

/** Full amount, e.g. "Rs 2,028,500" (used for tooltips next to compact values). */
export function formatMoney(amount: number, symbol = getCurrencySymbol()): string {
  const n = Number(amount) || 0;
  return `${n < 0 ? '-' : ''}${symbol} ${Math.abs(n).toLocaleString()}`;
}
