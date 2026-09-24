// Suggest a currency for a new school from the visitor's browser (region, then time zone).
const REGION_CURRENCY: Record<string, string> = {
  PK: 'PKR', IN: 'INR', BD: 'BDT', LK: 'LKR', NP: 'NPR', AF: 'AFN',
  SA: 'SAR', AE: 'AED', QA: 'QAR', OM: 'OMR', KW: 'KWD', BH: 'BHD', TR: 'TRY',
  GB: 'GBP', CH: 'CHF', AL: 'ALL', RS: 'RSD', RO: 'RON', HU: 'HUF', PL: 'PLN', CZ: 'CZK',
  SE: 'SEK', NO: 'NOK', DK: 'DKK', BG: 'BGN', BA: 'BAM', MK: 'MKD', UA: 'UAH', RU: 'RUB',
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR',
  FI: 'EUR', GR: 'EUR', HR: 'EUR', SI: 'EUR', SK: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR',
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL',
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP',
  KR: 'KRW', JP: 'JPY', CN: 'CNY', MY: 'MYR', SG: 'SGD', ID: 'IDR', AU: 'AUD',
};

const ZONE_CURRENCY: Record<string, string> = {
  'Asia/Karachi': 'PKR', 'Asia/Kolkata': 'INR', 'Asia/Dhaka': 'BDT', 'Asia/Riyadh': 'SAR', 'Asia/Dubai': 'AED',
  'Europe/Istanbul': 'TRY', 'Europe/London': 'GBP', 'Europe/Tirane': 'ALL', 'Europe/Belgrade': 'RSD',
  'Europe/Bucharest': 'RON', 'Europe/Zagreb': 'EUR', 'Europe/Paris': 'EUR', 'Africa/Johannesburg': 'ZAR',
  'Asia/Seoul': 'KRW', 'America/Toronto': 'CAD', 'America/Mexico_City': 'MXN', 'America/Sao_Paulo': 'BRL',
};

export function guessCurrency(supported: string[], fallback = 'PKR'): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && ZONE_CURRENCY[zone] && supported.includes(ZONE_CURRENCY[zone])) return ZONE_CURRENCY[zone];
    for (const tag of navigator.languages || [navigator.language]) {
      const region = tag.split('-')[1]?.toUpperCase();
      if (region && REGION_CURRENCY[region] && supported.includes(REGION_CURRENCY[region])) return REGION_CURRENCY[region];
    }
    if (zone?.startsWith('America/') && supported.includes('USD')) return 'USD';
    if (zone?.startsWith('Europe/') && supported.includes('EUR')) return 'EUR';
  } catch {
    /* ignore */
  }
  return fallback;
}

export const browserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi';
  } catch {
    return 'Asia/Karachi';
  }
};
