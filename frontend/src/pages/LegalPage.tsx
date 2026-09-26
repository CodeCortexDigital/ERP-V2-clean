import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import privacy, { LegalDoc, SubProcessorRow } from '@/services/privacy.service';

/** Public pages: the platform's privacy notice, terms, sub-processors, and a school's privacy notice (/legal/school/CODE). */
export default function LegalPage() {
  const { kind = 'privacy', code } = useParams();
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [subs, setSubs] = useState<SubProcessorRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setDoc(null); setSubs(null); setError('');
    const load = code ? privacy.schoolNotice(code).then(setDoc)
      : kind === 'subprocessors' ? privacy.legal('subprocessors').then((d) => setSubs(d.subprocessors))
        : privacy.legal(kind).then((d) => setDoc(d.document));
    load.catch(() => setError('This page is not available.'));
  }, [kind, code]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600"><ArrowLeft size={15} /> Sign in</Link>
        <nav className="flex gap-4 text-sm mt-4" aria-label="Legal pages">
          <Link to="/legal/privacy" className={kind === 'privacy' && !code ? 'font-bold text-slate-900' : 'text-slate-600'}>Privacy notice</Link>
          <Link to="/legal/terms" className={kind === 'terms' ? 'font-bold text-slate-900' : 'text-slate-600'}>Terms of use</Link>
          <Link to="/legal/subprocessors" className={kind === 'subprocessors' ? 'font-bold text-slate-900' : 'text-slate-600'}>Sub-processors</Link>
        </nav>
        <article className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 mt-4">
          {error && <p className="text-slate-600">{error}</p>}
          {!error && !doc && !subs && <Loader2 className="animate-spin text-slate-400" />}
          {doc && (
            <>
              <h1 className="text-2xl font-bold text-slate-900">{doc.title}</h1>
              <p className="text-xs text-slate-500 mt-1">{doc.version ? `Version ${doc.version}${doc.published_at ? `, ${new Date(doc.published_at).toLocaleDateString(undefined, { dateStyle: 'long' } as any)}` : ''}` : 'Draft template'}</p>
              <div className="mt-6 whitespace-pre-line text-slate-700 leading-relaxed">{doc.body}</div>
            </>
          )}
          {subs && (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Sub-processors</h1>
              <p className="text-sm text-slate-600 mt-1">Companies that process school data on our behalf. Optional ones are used only when a school switches the feature on.</p>
              <table className="w-full text-sm mt-4">
                <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200"><th className="py-2">Company</th><th className="py-2">What for</th><th className="py-2">Data</th><th className="py-2">Location</th></tr></thead>
                <tbody>{subs.map((p) => (
                  <tr key={p.name} className="border-b border-slate-100 align-top">
                    <td className="py-2 font-semibold">{p.website ? <a href={p.website} className="text-blue-700" rel="noreferrer" target="_blank">{p.name}</a> : p.name}{p.optional && <span className="block text-[11px] font-normal text-slate-500">Optional</span>}</td>
                    <td className="py-2 text-slate-700">{p.purpose}</td><td className="py-2 text-slate-600">{p.data}</td><td className="py-2 text-slate-600">{p.location || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
