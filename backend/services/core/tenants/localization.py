"""Per-school currency and language.

Stored in School.settings_json as ``currency`` (ISO 4217 code), ``language``
(ISO 639-1 code) and ``timezone``. Chosen at signup and changeable by the
school admin. Amounts are never converted when the currency changes: it only
changes how money is labelled.
"""
from __future__ import annotations

from decimal import Decimal

# code: (symbol, name, decimals). Covers the home market (Pakistan / South Asia),
# the Gulf, and the partner countries in Europe, the Americas, Africa and Asia.
CURRENCIES = {
    # South Asia
    'PKR': ('Rs', 'Pakistani Rupee', 0),
    'INR': ('₹', 'Indian Rupee', 0),
    'BDT': ('৳', 'Bangladeshi Taka', 0),
    'LKR': ('Rs', 'Sri Lankan Rupee', 0),
    'NPR': ('Rs', 'Nepalese Rupee', 0),
    'AFN': ('؋', 'Afghan Afghani', 0),
    # Middle East
    'SAR': ('SAR', 'Saudi Riyal', 2),
    'AED': ('AED', 'UAE Dirham', 2),
    'QAR': ('QAR', 'Qatari Riyal', 2),
    'OMR': ('OMR', 'Omani Rial', 3),
    'KWD': ('KWD', 'Kuwaiti Dinar', 3),
    'BHD': ('BHD', 'Bahraini Dinar', 3),
    'TRY': ('₺', 'Turkish Lira', 2),
    # Europe
    'EUR': ('€', 'Euro', 2),
    'GBP': ('£', 'British Pound', 2),
    'CHF': ('CHF', 'Swiss Franc', 2),
    'ALL': ('L', 'Albanian Lek', 0),
    'RSD': ('RSD', 'Serbian Dinar', 0),
    'RON': ('lei', 'Romanian Leu', 2),
    'HUF': ('Ft', 'Hungarian Forint', 0),
    'PLN': ('zł', 'Polish Zloty', 2),
    'CZK': ('Kč', 'Czech Koruna', 2),
    'SEK': ('kr', 'Swedish Krona', 2),
    'NOK': ('kr', 'Norwegian Krone', 2),
    'DKK': ('kr', 'Danish Krone', 2),
    'BGN': ('лв', 'Bulgarian Lev', 2),
    'BAM': ('KM', 'Bosnia-Herzegovina Mark', 2),
    'MKD': ('ден', 'Macedonian Denar', 0),
    'UAH': ('₴', 'Ukrainian Hryvnia', 2),
    'RUB': ('₽', 'Russian Ruble', 2),
    # Americas
    'USD': ('$', 'US Dollar', 2),
    'CAD': ('C$', 'Canadian Dollar', 2),
    'MXN': ('MX$', 'Mexican Peso', 2),
    'BRL': ('R$', 'Brazilian Real', 2),
    # Africa
    'ZAR': ('R', 'South African Rand', 2),
    'NGN': ('₦', 'Nigerian Naira', 0),
    'KES': ('KSh', 'Kenyan Shilling', 0),
    'EGP': ('E£', 'Egyptian Pound', 2),
    # Asia-Pacific
    'KRW': ('₩', 'South Korean Won', 0),
    'JPY': ('¥', 'Japanese Yen', 0),
    'CNY': ('¥', 'Chinese Yuan', 2),
    'MYR': ('RM', 'Malaysian Ringgit', 2),
    'SGD': ('S$', 'Singapore Dollar', 2),
    'IDR': ('Rp', 'Indonesian Rupiah', 0),
    'AUD': ('A$', 'Australian Dollar', 2),
}

# code: (English name, native name, text direction)
LANGUAGES = {
    'en': ('English', 'English', 'ltr'),
    'de': ('German', 'Deutsch', 'ltr'),
    'es': ('Spanish', 'Español', 'ltr'),
    'fr': ('French', 'Français', 'ltr'),
    'it': ('Italian', 'Italiano', 'ltr'),
    'pt': ('Portuguese', 'Português', 'ltr'),
    'nl': ('Dutch', 'Nederlands', 'ltr'),
    'pl': ('Polish', 'Polski', 'ltr'),
    'cs': ('Czech', 'Čeština', 'ltr'),
    'sl': ('Slovenian', 'Slovenščina', 'ltr'),
    'sr': ('Serbian', 'Srpski', 'ltr'),
    'hr': ('Croatian', 'Hrvatski', 'ltr'),
    'hu': ('Hungarian', 'Magyar', 'ltr'),
    'ro': ('Romanian', 'Română', 'ltr'),
    'sq': ('Albanian', 'Shqip', 'ltr'),
    'tr': ('Turkish', 'Türkçe', 'ltr'),
    'ru': ('Russian', 'Русский', 'ltr'),
    'uk': ('Ukrainian', 'Українська', 'ltr'),
    'ar': ('Arabic', 'العربية', 'rtl'),
    'ur': ('Urdu', 'اردو', 'rtl'),
    'zh': ('Chinese', '中文', 'ltr'),
    'ja': ('Japanese', '日本語', 'ltr'),
    'ko': ('Korean', '한국어', 'ltr'),
}

DEFAULT_CURRENCY = 'PKR'
DEFAULT_LANGUAGE = 'en'
DEFAULT_TIMEZONE = 'Asia/Karachi'


def normalize_currency(code) -> str | None:
    code = (code or '').strip().upper()
    return code if code in CURRENCIES else None


def normalize_language(code) -> str | None:
    code = (code or '').strip().lower()
    return code if code in LANGUAGES else None


def school_locale(school) -> dict:
    """Currency and language of a school (defaults for schools that never chose)."""
    s = (getattr(school, 'settings_json', None) or {}) if school else {}
    currency = normalize_currency(s.get('currency')) or DEFAULT_CURRENCY
    language = normalize_language(s.get('language')) or DEFAULT_LANGUAGE
    symbol, name, decimals = CURRENCIES[currency]
    return {
        'currency': currency,
        'currency_symbol': symbol,
        'currency_name': name,
        'currency_decimals': decimals,
        'language': language,
        'direction': LANGUAGES[language][2],
        'timezone': s.get('timezone') or DEFAULT_TIMEZONE,
    }


def format_money(amount, school=None, locale: dict | None = None) -> str:
    """'Rs 2,028,500' / '€ 1,234.50' using the school's currency."""
    loc = locale or school_locale(school)
    decimals = loc['currency_decimals']
    value = Decimal(str(amount or 0))
    return f"{loc['currency_symbol']} {value:,.{decimals}f}"


def options() -> dict:
    """Choices for signup and settings screens."""
    return {
        'currencies': [
            {'code': c, 'symbol': s, 'name': n, 'decimals': d} for c, (s, n, d) in CURRENCIES.items()
        ],
        'languages': [
            {'code': c, 'name': n, 'native_name': nn, 'direction': dr} for c, (n, nn, dr) in LANGUAGES.items()
        ],
        'defaults': {'currency': DEFAULT_CURRENCY, 'language': DEFAULT_LANGUAGE, 'timezone': DEFAULT_TIMEZONE},
    }
