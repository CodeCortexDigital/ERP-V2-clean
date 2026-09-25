import { useEffect, useRef, useState } from 'react';
import { Award, Download, Eye, EyeOff, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import portal, { DocumentList, PortalDocument } from '@/services/portal.service';
import { Modal } from '@/components/ui/Modal';
import { ReportCardView } from '@/components/gradebook/ReportCardView';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4';
const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (d: string) => new Date(d).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Files on a student's record, plus their report cards and certificates.
 * Staff upload and choose whether the family sees each file; families see what was shared and can upload their own.
 */
export default function DocumentsPanel({ studentId }: { studentId: string }) {
  const [data, setData] = useState<DocumentList | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [share, setShare] = useState(true);
  const [reportCards, setReportCards] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => portal.documents(studentId).then(setData).catch(() => setData(null));
  useEffect(() => { setData(null); load(); }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await portal.upload(studentId, { file, title: title.trim() || file.name, category, visible_to_family: data?.can_manage ? share : undefined });
      toast.success(data?.can_manage ? 'Document added.' : 'Document sent to the school.');
      setFile(null); setTitle(''); setCategory('other'); setShare(true);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (d: PortalDocument) => {
    try {
      await portal.updateDocument(d.id, { visible_to_family: !d.visible_to_family });
      toast.success(d.visible_to_family ? 'Hidden from the family.' : 'Shared with the family.');
      load();
    } catch { toast.error('Could not change sharing.'); }
  };

  const remove = async (d: PortalDocument) => {
    if (!window.confirm(`Remove “${d.title}”?`)) return;
    try { await portal.removeDocument(d.id); toast.success('Document removed.'); load(); } catch { toast.error('Could not remove it.'); }
  };

  const download = async (d: PortalDocument) => {
    try { await portal.download(d); } catch { toast.error('The file could not be downloaded.'); }
  };

  if (!data) return <div className="flex items-center gap-2 text-sm text-slate-400 py-6"><Loader2 className="animate-spin" size={16} /> Loading documents…</div>;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-3"><Upload size={14} /> {data.can_manage ? 'Add a document' : 'Send a document to the school'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <label className="md:col-span-1 text-xs font-semibold text-slate-600">File
            <input ref={fileRef} type="file" aria-label="File" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" className="mt-1 block w-full text-xs" onChange={(e) => { const f = e.target.files?.[0] || null; setFile(f); if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, '')); }} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Title
            <input className={`${input} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Doctor's note" />
          </label>
          <label className="text-xs font-semibold text-slate-600">Type
            <select aria-label="Type" className={`${input} mt-1`} value={category} onChange={(e) => setCategory(e.target.value)}>
              {data.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-3">
            {data.can_manage && (
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> Family can see it
              </label>
            )}
            <button onClick={upload} disabled={!file || busy} className="ml-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
              {busy ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">PDF (up to 5 MB), images, Word and Excel files (up to 10 MB).</p>
      </div>

      <div className={card}>
        <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-2"><FileText size={14} /> Documents</h4>
        {data.documents.length === 0 ? <p className="text-xs text-slate-400">No documents yet.</p> : (
          <ul className="divide-y divide-slate-100">
            {data.documents.map((d) => (
              <li key={d.id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
                <div className="min-w-0 mr-auto">
                  <p className="font-semibold text-slate-800 truncate">{d.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {d.category_label} · {size(d.size)} · {when(d.uploaded_at)}{d.uploaded_by ? ` · ${d.uploaded_by}` : ''}
                    {d.from_family && <span className="ml-1 rounded-full bg-violet-100 text-violet-700 px-1.5 font-bold">From family</span>}
                    {data.can_manage && !d.from_family && !d.visible_to_family && <span className="ml-1 rounded-full bg-slate-100 text-slate-600 px-1.5 font-bold">Staff only</span>}
                  </p>
                </div>
                <button onClick={() => download(d)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Download size={13} /> Download</button>
                {data.can_manage && !d.from_family && (
                  <button onClick={() => toggle(d)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                    {d.visible_to_family ? <><EyeOff size={13} /> Hide from family</> : <><Eye size={13} /> Share with family</>}
                  </button>
                )}
                {d.can_delete && <button onClick={() => remove(d)} aria-label={`Remove ${d.title}`} className="text-rose-600"><Trash2 size={14} /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={card}>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-2"><FileText size={14} /> Report cards</h4>
          {data.report_cards.length === 0 ? <p className="text-xs text-slate-400">No report cards released yet.</p> : (
            <>
              <ul className="text-sm divide-y divide-slate-100">
                {data.report_cards.map((r) => <li key={r.term_id} className="py-1.5">{r.term}{r.year ? <span className="text-slate-400"> · {r.year}</span> : null}</li>)}
              </ul>
              <button onClick={() => setReportCards(true)} className="mt-2 text-xs font-bold text-blue-600">Open report cards</button>
            </>
          )}
        </div>
        <div className={card}>
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-2"><Award size={14} /> Certificates</h4>
          {data.certificates.length === 0 ? <p className="text-xs text-slate-400">No certificates issued.</p> : (
            <ul className="text-sm divide-y divide-slate-100">
              {data.certificates.map((c) => <li key={c.id} className="py-1.5 flex justify-between"><span className="capitalize">{c.template.replace(/[_-]/g, ' ')}</span><span className="text-xs text-slate-500">{when(c.issue_date)}</span></li>)}
            </ul>
          )}
        </div>
      </div>

      {reportCards && (
        <Modal open onClose={() => setReportCards(false)} title="Report cards" size="xl">
          <div className="max-h-[72vh] overflow-y-auto"><ReportCardView studentId={studentId} staff={data.can_manage} /></div>
        </Modal>
      )}
    </div>
  );
}
