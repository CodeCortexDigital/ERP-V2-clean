import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight, Rocket, X } from 'lucide-react';
import schoolService, { type SetupStep } from '@/services/school.service';
import { useTranslation } from 'react-i18next';

const DISMISS_KEY = 'setup_checklist_dismissed';

/** Getting-started steps for a new school; hides itself once everything is done. */
export default function SetupChecklist() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [steps, setSteps] = useState<SetupStep[] | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const justCreated = params.get('welcome') === '1';

  useEffect(() => {
    schoolService
      .onboarding()
      .then((d) => {
        if (d.complete) return;
        setSteps(d.steps);
        setSchoolName(d.school?.name || '');
      })
      .catch(() => {});
  }, []);

  if (!steps || (dismissed && !justCreated)) return null;
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm" aria-labelledby="setup-title">
      <div className="flex items-start gap-4">
        <span className="shrink-0 w-11 h-11 rounded-xl bg-brand flex items-center justify-center">
          <Rocket className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="setup-title" className="text-base font-bold text-slate-900">
            {justCreated ? t('setup.welcome', { school: schoolName }) : t('setup.finish')}
          </h2>
          <p className="text-sm text-slate-500">
            {t('setup.progress', { done, total: steps.length })}
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button onClick={dismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label={t('setup.hide')}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-2">
        {steps.map((s) => (
          <li key={s.key}>
            <button
              onClick={() => navigate(s.link)}
              className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                s.done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {s.done ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Circle className="w-5 h-5 shrink-0 text-slate-300" />}
              <span className={`flex-1 ${s.done ? 'line-through decoration-emerald-400' : 'font-medium'}`}>{t(`setup.steps.${s.key}`, { defaultValue: s.label })}</span>
              {!s.done && <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
