import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { RELATIONSHIPS } from '@/services/household.service';
import { emptyGuardian, type ApplicationFormData, type GuardianInput } from '@/services/admission.service';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--app-accent)]';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

export const EMPTY_APPLICATION: ApplicationFormData = {
  first_name: '', last_name: '', date_of_birth: '', gender: '', applying_for_class: '', nationality: '',
  home_language: '', address: '', city: '', state: '', postal_code: '', country: '', previous_school: '',
  previous_class: '', medical_notes: '', special_needs: '', sibling_at_school: '',
  guardians: [{ ...emptyGuardian('mother'), receives_billing: true }],
  signature_name: '', agree_declaration: false, agree_privacy: false, consent_photos: false,
};

interface Props {
  classes: string[];
  requiredDocuments?: string[];
  declaration?: string;
  /** 'public' asks for documents and a signature; 'office' skips both. */
  mode: 'public' | 'office';
  submitting: boolean;
  onSubmit: (data: ApplicationFormData, files: Record<string, File | null>) => void;
}

type StepId = 'student' | 'family' | 'background' | 'documents' | 'review';

/** Multi-step admission application used by the public page and by the office. */
export default function ApplicationForm({ classes, requiredDocuments = [], declaration = '', mode, submitting, onSubmit }: Props) {
  const steps: Array<{ id: StepId; title: string }> = [
    { id: 'student', title: 'Student' },
    { id: 'family', title: 'Parents & guardians' },
    { id: 'background', title: 'School & health' },
    ...(mode === 'public' ? [{ id: 'documents' as StepId, title: 'Documents' }] : []),
    { id: 'review', title: mode === 'public' ? 'Review & sign' : 'Review' },
  ];
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ApplicationFormData>(EMPTY_APPLICATION);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const current = steps[step].id;

  const set = (k: keyof ApplicationFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));
  const setGuardian = (i: number, patch: Partial<GuardianInput>) =>
    setData((d) => ({ ...d, guardians: d.guardians.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));

  const validate = (id: StepId): Record<string, string> => {
    const e: Record<string, string> = {};
    if (id === 'student') {
      if (!data.first_name.trim()) e.first_name = 'Enter the first name.';
      if (!data.last_name.trim()) e.last_name = 'Enter the last name.';
      if (!data.date_of_birth) e.date_of_birth = 'Enter the date of birth.';
      if (!data.gender) e.gender = 'Choose one.';
      if (!data.applying_for_class) e.applying_for_class = 'Choose the grade or class.';
    }
    if (id === 'family') {
      data.guardians.forEach((g, i) => { if (!g.first_name.trim()) e[`g${i}`] = 'Enter a first name.'; });
      if (!data.guardians.some((g) => g.email.trim() || g.mobile_phone.trim())) e.contact = 'Give an email or phone number for at least one parent.';
      data.guardians.forEach((g, i) => { if (g.email && !/^\S+@\S+\.\S+$/.test(g.email)) e[`ge${i}`] = 'Check this email address.'; });
    }
    if (id === 'review' && mode === 'public') {
      if (!data.signature_name.trim()) e.signature_name = 'Type your full name to sign.';
      if (!data.agree_declaration) e.agree_declaration = 'Please confirm the declaration.';
      if (!data.agree_privacy) e.agree_privacy = 'Please accept the privacy notice.';
    }
    return e;
  };

  const next = () => {
    const e = validate(current);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < steps.length - 1) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else onSubmit(data, files);
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>;
  const field = (k: keyof ApplicationFormData, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`app-${k}`} className={labelCls}>{text}</label>
      <input id={`app-${k}`} className={`${input} ${errors[k] ? '!border-rose-400' : ''}`} value={String(data[k] ?? '')} onChange={set(k)} {...props} />
      {err(k)}
    </div>
  );

  return (
    <div>
      {/* Progress */}
      <ol className="flex items-center gap-2 mb-6 overflow-x-auto">
        {steps.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 shrink-0">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-sm ${i === step ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{s.title}</span>
            {i < steps.length - 1 && <span className="w-6 h-px bg-slate-300" />}
          </li>
        ))}
      </ol>

      {current === 'student' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('first_name', 'First name *', { autoComplete: 'off' })}
          {field('last_name', 'Last name *', { autoComplete: 'off' })}
          {field('date_of_birth', 'Date of birth *', { type: 'date' })}
          <div>
            <label htmlFor="app-gender" className={labelCls}>Gender *</label>
            <select id="app-gender" className={input} value={data.gender} onChange={set('gender')}>
              <option value="">Choose…</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
            </select>
            {err('gender')}
          </div>
          <div>
            <label htmlFor="app-class" className={labelCls}>Applying for grade / class *</label>
            <select id="app-class" className={input} value={data.applying_for_class} onChange={set('applying_for_class')}>
              <option value="">Choose…</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {err('applying_for_class')}
          </div>
          {field('nationality', 'Nationality')}
          {field('home_language', 'Language spoken at home')}
          {field('address', 'Street address')}
          {field('city', 'City')}
          {field('state', 'State / province')}
          {field('postal_code', 'Postal code')}
          {field('country', 'Country')}
        </div>
      )}

      {current === 'family' && (
        <div className="space-y-4">
          {errors.contact && <p className="text-sm text-rose-600">{errors.contact}</p>}
          {data.guardians.map((g, i) => (
            <fieldset key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <legend className="font-bold text-sm">Parent / guardian {i + 1}</legend>
                {data.guardians.length > 1 && (
                  <button type="button" onClick={() => setData((d) => ({ ...d, guardians: d.guardians.filter((_, j) => j !== i) }))}
                    className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50" aria-label={`Remove parent ${i + 1}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor={`gf${i}`}>First name *</label>
                  <input id={`gf${i}`} className={input} value={g.first_name} onChange={(e) => setGuardian(i, { first_name: e.target.value })} />
                  {err(`g${i}`)}
                </div>
                <div>
                  <label className={labelCls} htmlFor={`gl${i}`}>Last name</label>
                  <input id={`gl${i}`} className={input} value={g.last_name} onChange={(e) => setGuardian(i, { last_name: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`gr${i}`}>Relationship</label>
                  <select id={`gr${i}`} className={input} value={g.relationship} onChange={(e) => setGuardian(i, { relationship: e.target.value })}>
                    {RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor={`gp${i}`}>Mobile phone</label>
                  <input id={`gp${i}`} type="tel" className={input} value={g.mobile_phone} onChange={(e) => setGuardian(i, { mobile_phone: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls} htmlFor={`ge${i}`}>Email</label>
                  <input id={`ge${i}`} type="email" className={input} value={g.email} onChange={(e) => setGuardian(i, { email: e.target.value })} />
                  {err(`ge${i}`)}
                </div>
                <div>
                  <label className={labelCls} htmlFor={`go${i}`}>Occupation</label>
                  <input id={`go${i}`} className={input} value={g.occupation} onChange={(e) => setGuardian(i, { occupation: e.target.value })} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {([
                  ['lives_with', 'Student lives with this person'], ['has_custody', 'Has legal custody'],
                  ['can_pickup', 'Allowed to pick the student up'], ['receives_billing', 'Send invoices to this person'],
                ] as Array<[keyof GuardianInput, string]>).map(([k, text]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" checked={Boolean(g[k])} onChange={(e) => setGuardian(i, { [k]: e.target.checked } as Partial<GuardianInput>)} />
                    {text}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {data.guardians.length < 4 && (
            <button type="button" onClick={() => setData((d) => ({ ...d, guardians: [...d.guardians, emptyGuardian(d.guardians.length === 1 ? 'father' : 'other')] }))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add another parent or guardian
            </button>
          )}
        </div>
      )}

      {current === 'background' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('previous_school', 'Current or previous school')}
          {field('previous_class', 'Current grade / class')}
          {field('sibling_at_school', 'Brother or sister already at this school (name)')}
          <div className="sm:col-span-2">
            <label htmlFor="app-medical" className={labelCls}>Allergies or medical conditions the school should know about</label>
            <textarea id="app-medical" rows={3} className={input} value={data.medical_notes} onChange={set('medical_notes')} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="app-needs" className={labelCls}>Learning support or special educational needs</label>
            <textarea id="app-needs" rows={3} className={input} value={data.special_needs} onChange={set('special_needs')} />
          </div>
        </div>
      )}

      {current === 'documents' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Upload clear photos or PDF scans. You can also bring documents to the school later.</p>
          {(requiredDocuments.length ? requiredDocuments : ['Supporting document']).map((doc) => (
            <label key={doc} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-4 cursor-pointer hover:border-[color:var(--app-accent)]">
              <span className="flex items-center gap-3 min-w-0">
                <FileUp className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{doc}</span>
                  <span className="block text-xs text-slate-500 truncate">{files[doc]?.name || 'PDF, JPG or PNG'}</span>
                </span>
              </span>
              <span className={`text-xs font-semibold ${files[doc] ? 'text-emerald-600' : 'text-brand'}`}>{files[doc] ? 'Attached' : 'Choose file'}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" aria-label={`Upload ${doc}`}
                onChange={(e) => setFiles((f) => ({ ...f, [doc]: e.target.files?.[0] || null }))} />
            </label>
          ))}
        </div>
      )}

      {current === 'review' && (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div><dt className="text-xs text-slate-500">Student</dt><dd className="font-semibold">{data.first_name} {data.last_name}</dd></div>
            <div><dt className="text-xs text-slate-500">Applying for</dt><dd className="font-semibold">{data.applying_for_class}</dd></div>
            <div><dt className="text-xs text-slate-500">Date of birth</dt><dd>{data.date_of_birth}</dd></div>
            <div><dt className="text-xs text-slate-500">Parents / guardians</dt><dd>{data.guardians.map((g) => `${g.first_name} ${g.last_name}`.trim()).join(', ')}</dd></div>
            {mode === 'public' && <div><dt className="text-xs text-slate-500">Documents</dt><dd>{Object.values(files).filter(Boolean).length} attached</dd></div>}
          </dl>
          {mode === 'public' && (
            <>
              <p className="text-sm text-slate-700 rounded-xl border border-slate-200 p-4">{declaration}</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 mt-0.5" checked={data.agree_declaration} onChange={(e) => setData((d) => ({ ...d, agree_declaration: e.target.checked }))} />
                I agree to the declaration above.
              </label>
              {err('agree_declaration')}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 mt-0.5" checked={data.agree_privacy} onChange={(e) => setData((d) => ({ ...d, agree_privacy: e.target.checked }))} />
                I agree that the school may use this information to process the application and, if a place is offered, to enrol the student.
              </label>
              {err('agree_privacy')}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 mt-0.5" checked={data.consent_photos} onChange={(e) => setData((d) => ({ ...d, consent_photos: e.target.checked }))} />
                Optional: the school may use photos of my child in school publications.
              </label>
              <div className="max-w-md">
                <label htmlFor="app-sign" className={labelCls}>Signature: type your full name *</label>
                <input id="app-sign" className={`${input} font-serif italic text-lg`} value={data.signature_name} onChange={set('signature_name')} />
                {err('signature_name')}
                <p className="mt-1 text-xs text-slate-500">Typing your name counts as your electronic signature. The date and time are recorded.</p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 text-sm font-semibold disabled:opacity-40">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={next} disabled={submitting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-60">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            : step === steps.length - 1 ? (mode === 'public' ? 'Submit application' : 'Save application')
              : <>Next <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}
