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
