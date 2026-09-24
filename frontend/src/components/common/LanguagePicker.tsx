import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, languageByCode } from '@/i18n/languages';

interface PickerProps {
  value: string | null;
  onChange: (code: string | null) => void;
  /** Adds a first option "Use school default (…)" that maps to null. */
  schoolDefault?: string;
  className?: string;
}

/** Two-column grid of languages: native name + code. */
export function LanguageGrid({ value, onChange, schoolDefault, className = '' }: PickerProps) {
  const { t } = useTranslation();
  const option = (code: string | null, label: string, tag: string) => {
    const active = value === code;
    return (
      <button
        key={code ?? 'default'}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange(code)}
        className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
          active ? 'bg-brand font-semibold' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span className="truncate" dir="auto">{label}</span>
        <span className={`shrink-0 text-[11px] font-bold ${active ? 'text-white/85' : 'text-slate-400'}`}>
          {active ? <Check className="w-3.5 h-3.5" /> : tag}
        </span>
      </button>
    );
  };
  return (
    <div role="radiogroup" aria-label={t('header.language')} className={`grid grid-cols-2 gap-1 ${className}`}>
      {schoolDefault !== undefined &&
        option(null, t('locale.useSchoolDefault', { language: languageByCode(schoolDefault)?.native || schoolDefault }), '')}
      {LANGUAGES.map((l) => option(l.code, l.native, l.code.toUpperCase()))}
    </div>
  );
}

/** Globe button that opens the language grid in a popover. */
export function LanguageMenuButton({
  value, onChange, schoolDefault, buttonClassName = '', align = 'right',
}: PickerProps & { buttonClassName?: string; align?: 'left' | 'right' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languageByCode(value || schoolDefault || 'en');

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('header.language')}: ${current?.native}`}
        title={t('header.language')}
        className={`inline-flex items-center gap-1.5 ${buttonClassName}`}
      >
        <Globe className="w-[18px] h-[18px]" />
        <span className="text-xs font-bold">{(current?.code || 'en').toUpperCase()}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('header.language')}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-[min(92vw,420px)] max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50`}
        >
          <LanguageGrid
            value={value}
            schoolDefault={schoolDefault}
            onChange={(code) => {
              onChange(code);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
