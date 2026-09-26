import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import privacy, { LegalDoc } from '@/services/privacy.service';

/** After sign-in: new versions of the privacy notice or terms are shown and must be accepted to continue. */
export default function AcceptanceGate() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [open, setOpen] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { privacy.pending().then(setDocs).catch(() => undefined); }, []);
  if (!docs.length) return null;
  const accept = async () => {
    setBusy(true);
    try { await privacy.accept(docs.map((d) => d.id!)); setDocs([]); toast.success('Thank you.'); } catch { toast.error('Could not save. Please try again.'); } finally { setBusy(false); }
  };
  const doc = docs[Math.min(open, docs.length - 1)];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-slate-100">
          <h2 id="gate-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><ShieldCheck size={18} /> Please read and accept</h2>
          <p className="text-sm text-slate-600 mt-1">{docs.length === 1 ? 'This document is new or has changed' : 'These documents are new or have changed'} since you last signed in.</p>
          {docs.length > 1 && (
            <div className="flex gap-2 mt-3" role="tablist">
              {docs.map((d, i) => <button key={d.id} role="tab" aria-selected={open === i} onClick={() => setOpen(i)} className={`rounded-full px-3 py-1 text-xs font-semibold ${open === i ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>{d.title}</button>)}
            </div>
          )}
        </div>
        <div className="p-5 overflow-y-auto text-sm text-slate-700 whitespace-pre-line leading-relaxed">
          <p className="font-semibold text-slate-900">{doc.title} <span className="font-normal text-slate-500">· version {doc.version}{doc.school ? ` · ${doc.school}` : ''}</span></p>
          {doc.summary_of_changes && <p className="mt-1 text-xs text-slate-500">What changed: {doc.summary_of_changes}</p>}
          <div className="mt-3">{doc.body}</div>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button onClick={accept} disabled={busy} className="auth-primary-btn w-auto px-6 disabled:opacity-50">{busy && <Loader2 className="w-4 h-4 animate-spin" />} I have read and accept {docs.length > 1 ? 'these' : 'this'}</button>
        </div>
      </div>
    </div>
  );
}
