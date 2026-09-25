import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Loader2, Search } from 'lucide-react';
import ApplicationForm from '@/components/admissions/ApplicationForm';
import admissionService, { STATUS_META, type ApplicationFormData, type PublicForm } from '@/services/admission.service';

function Shell({ school, children }: { school?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center"><GraduationCap className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-bold truncate">{school || 'School admissions'}</p>
            <p className="text-xs text-slate-500">Admissions</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

/** Public online application form: /apply/:slug */
export default function ApplyPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ application_no: string; tracking_token: string; school: string } | null>(null);

  useEffect(() => {
    admissionService.publicForm(slug).then(setForm).catch(() => setError('We could not find this school’s application form. Check the link and try again.'));
  }, [slug]);

  const submit = async (data: ApplicationFormData, files: Record<string, File | null>) => {
    setSubmitting(true);
    setError('');
    try {
      setDone(await admissionService.apply(slug, data, files));
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      const body = err?.response?.data;
      const fields = body?.fields ? ` ${Object.values(body.fields).flat().join(' ')}` : '';
      setError((body?.error || 'The application could not be sent. Please try again.') + fields);
    } finally {
      setSubmitting(false);
    }
  };

  if (!form && !error) {
    return <Shell><div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div></Shell>;
  }

  if (done) {
    const statusLink = `/apply/status?no=${encodeURIComponent(done.application_no)}&token=${encodeURIComponent(done.tracking_token)}`;
    return (
      <Shell school={done.school}>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold">Application sent</h1>
          <p className="text-slate-600">Thank you. {done.school} has received the application and will be in touch.</p>
          <div className="inline-block text-left rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm">
            <p>Application number: <strong>{done.application_no}</strong></p>
            <p className="break-all">Tracking code: <strong>{done.tracking_token}</strong></p>
          </div>
          <p className="text-sm text-slate-500">Save these details. We also emailed them to you, if you gave an email address.</p>
          <Link to={statusLink} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold">
            <Search className="w-4 h-4" /> Check application status
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell school={form?.school.name}>
      {form && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Apply to {form.school.name}</h1>
          {form.academic_year && <p className="text-slate-500">For the {form.academic_year} school year</p>}
          {form.intro && <p className="mt-3 text-sm text-slate-700 whitespace-pre-line">{form.intro}</p>}
        </div>
      )}
      {error && <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {form && !form.open && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600">
          {form.school.name} is not accepting online applications right now. Please contact the school office.
        </div>
      )}
      {form?.open && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-8">
          <ApplicationForm mode="public" classes={form.classes} requiredDocuments={form.required_documents}
            declaration={form.declaration} submitting={submitting} onSubmit={submit} />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">
        Already applied? <Link to="/apply/status" className="text-brand font-semibold hover:underline">Check your application status</Link>
      </p>
    </Shell>
  );
}

/** Public status lookup: /apply/status?no=…&token=… */
export function ApplicationStatusPage() {
  const [params] = useSearchParams();
  const [no, setNo] = useState(params.get('no') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [result, setResult] = useState<Awaited<ReturnType<typeof admissionService.status>> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const look = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      setResult(await admissionService.status(no.trim(), token.trim()));
    } catch (err: any) {
      setResult(null);
      setError(err?.response?.data?.error || 'Could not check the status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (no && token) look(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = result ? STATUS_META[result.status] : null;
  return (
    <Shell school={result?.school}>
      <h1 className="text-2xl font-bold mb-4">Application status</h1>
      <form onSubmit={look} className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label htmlFor="st-no" className="block text-xs font-semibold text-slate-600 mb-1">Application number</label>
          <input id="st-no" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="APP-2026-0001" value={no} onChange={(e) => setNo(e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-token" className="block text-xs font-semibold text-slate-600 mb-1">Tracking code</label>
          <input id="st-token" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <button type="submit" disabled={loading || !no || !token} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-50">
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}
      {result && meta && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <p className="text-sm text-slate-500">{result.application_no} · {result.student} · {result.applying_for}</p>
          <p><span className={`px-3 py-1 rounded-full text-sm font-bold ${meta.tone}`}>{meta.label}</span></p>
          <p className="text-slate-700">{result.message}</p>
          <p className="text-xs text-slate-500">Submitted {new Date(result.submitted_at).toLocaleDateString()}</p>
        </div>
      )}
    </Shell>
  );
}
