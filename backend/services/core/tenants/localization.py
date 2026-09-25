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


# ---------------------------------------------------------------------------
# Region style: how the school talks and writes dates (Pakistan-style or international), which Pakistan-only
# fields its forms ask for, and which payment methods it offers. Stored as settings_json['region'].
# ---------------------------------------------------------------------------

REGIONS = {
    'pk': {'label': 'Pakistan', 'currency': 'PKR', 'timezone': 'Asia/Karachi', 'date_format': 'DD/MM/YYYY',
           'week_start': 1, 'hidden_fields': [],
           'payment_methods': ['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque', 'card']},
    'intl': {'label': 'International', 'currency': None, 'timezone': None, 'date_format': 'DD/MM/YYYY',
             'week_start': 1, 'hidden_fields': ['cast', 'orphan_student', 'osc'],
             'payment_methods': ['card', 'bank_transfer', 'cash', 'cheque']},
    'uk': {'label': 'United Kingdom', 'currency': 'GBP', 'timezone': 'Europe/London', 'date_format': 'DD/MM/YYYY',
           'week_start': 1, 'hidden_fields': ['cast', 'orphan_student', 'osc'],
           'payment_methods': ['card', 'direct_debit', 'bank_transfer', 'cash']},
    'us': {'label': 'United States', 'currency': 'USD', 'timezone': 'America/New_York', 'date_format': 'MM/DD/YYYY',
           'week_start': 0, 'hidden_fields': ['cast', 'orphan_student', 'osc'],
           'payment_methods': ['card', 'ach', 'check', 'cash']},
}
DATE_FORMATS = {'DD/MM/YYYY': 'en-GB', 'MM/DD/YYYY': 'en-US', 'YYYY-MM-DD': 'sv-SE'}
PAYMENT_METHOD_LABELS = {
    'cash': 'Cash', 'bank_transfer': 'Bank transfer', 'jazzcash': 'JazzCash', 'easypaisa': 'Easypaisa', 'cheque': 'Cheque',
    'check': 'Check', 'card': 'Card', 'ach': 'ACH bank transfer', 'direct_debit': 'Direct Debit',
}
# The words each region uses. Keys name the Pakistani wording the app was written with.
TERMS = {
    'challan':          {'pk': 'Challan', 'intl': 'Invoice', 'uk': 'Invoice', 'us': 'Invoice'},
    'date_sheet':       {'pk': 'Date Sheet', 'intl': 'Exam Timetable', 'uk': 'Exam Timetable', 'us': 'Exam Schedule'},
    'award_list':       {'pk': 'Award List', 'intl': 'Mark Sheet', 'uk': 'Mark Sheet', 'us': 'Grade Sheet'},
    'result_card':      {'pk': 'Result Card', 'intl': 'Report Card', 'uk': 'Report Card', 'us': 'Report Card'},
    'paid_slips':       {'pk': 'Paid Slips', 'intl': 'Receipts', 'uk': 'Receipts', 'us': 'Receipts'},
    'fee_defaulters':   {'pk': 'Fee Defaulters', 'intl': 'Overdue Accounts', 'uk': 'Overdue Accounts', 'us': 'Past-due Accounts'},
    'fee_particulars':  {'pk': 'Fee Particulars', 'intl': 'Fee Items', 'uk': 'Fee Items', 'us': 'Fee Items'},
    'admission_letter': {'pk': 'Admission Letter', 'intl': 'Offer Letter', 'uk': 'Offer Letter', 'us': 'Acceptance Letter'},
    'b_form':           {'pk': 'B-Form', 'intl': 'Birth Certificate No.', 'uk': 'Birth Certificate No.', 'us': 'Birth Certificate No.'},
    'cnic':             {'pk': 'CNIC', 'intl': 'National ID', 'uk': 'ID Number', 'us': 'ID Number'},
    'cheque':           {'pk': 'Cheque', 'intl': 'Cheque', 'uk': 'Cheque', 'us': 'Check'},
    'timetable':        {'pk': 'Timetable', 'intl': 'Timetable', 'uk': 'Timetable', 'us': 'Schedule'},
    'enrolment':        {'pk': 'Enrolment', 'intl': 'Enrolment', 'uk': 'Enrolment', 'us': 'Enrollment'},
    'principal':        {'pk': 'Principal', 'intl': 'Principal', 'uk': 'Head Teacher', 'us': 'Principal'},
}


def default_region(settings: dict) -> str:
    """Schools that never chose keep the Pakistan-style wording they always had (new schools choose at signup)."""
    return 'pk'


def normalize_region(code) -> str | None:
    code = (code or '').strip().lower()
    return code if code in REGIONS else None


def region_settings(settings: dict) -> dict:
    region = normalize_region(settings.get('region')) or default_region(settings)
    r = REGIONS[region]
    date_format = settings.get('date_format') if settings.get('date_format') in DATE_FORMATS else r['date_format']
    week_start = settings.get('week_start') if settings.get('week_start') in (0, 1, 6) else r['week_start']
    return {
        'region': region, 'region_label': r['label'], 'date_format': date_format, 'date_locale': DATE_FORMATS[date_format],
        'week_start': week_start, 'hidden_fields': list(r['hidden_fields']),
        'payment_methods': [{'code': m, 'label': PAYMENT_METHOD_LABELS[m]} for m in r['payment_methods']],
        'terms': {k: v[region] for k, v in TERMS.items()},
    }


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
        **region_settings(s),
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
        'regions': [{'code': c, 'label': r['label'], 'currency': r['currency'], 'timezone': r['timezone'],
                     'date_format': r['date_format'], 'week_start': r['week_start'],
                     'terms': {k: v[c] for k, v in TERMS.items()}} for c, r in REGIONS.items()],
        'date_formats': list(DATE_FORMATS),
    }
