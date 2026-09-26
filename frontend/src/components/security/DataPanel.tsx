import { useEffect, useState } from 'react';
import { AlertTriangle, Download, FileArchive, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import portability, { errorText, SchoolDeletion, SchoolExport } from '@/services/portability.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any);
const FORMATS: Array<[string, string, string]> = [
  ['csv', 'CSV files', 'One file per kind of record, plus uploaded documents, in a zip. Opens in Excel or any spreadsheet.'],
  ['xlsx', 'Excel workbook', 'One sheet per kind of record. Easiest to browse; no uploaded documents.'],
  ['json', 'JSON', 'For moving to another system, plus uploaded documents, in a zip.'],
];

/** Security & privacy → Data export & deletion: everything the school has, and deleting it when the contract ends. */
export default function DataPanel() {
  const [data, setData] = useState<{ exports: SchoolExport[]; deletion: SchoolDeletion | null; grace_days: number; school_name: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reason, setReason] = useState('');
  const load = () => portability.overview().then(setData).catch((e) => toast.error(errorText(e, 'Could not load.')));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;

  const make = async (format: string) => {
    setBusy(format);
    try {
      const e = await portability.createExport(format);
      await portability.download(e);
      toast.success(`Export ready: ${e.records} records, ${e.people} people${e.files ? `, ${e.files} files` : ''}.`);
      load();
    } catch (err) { toast.error(errorText(err, 'The export could not be made.')); } finally { setBusy(''); }
  };
  const schedule = async () => {
    setBusy('delete');
    try { toast.success((await portability.requestDeletion(confirm, reason)).message); setConfirm(''); setReason(''); load(); }
    catch (err) { toast.error(errorText(err, 'Could not schedule the deletion.')); } finally { setBusy(''); }
  };
  const cancel = async () => {
    setBusy('cancel');
    try { toast.success((await portability.cancelDeletion()).message); load(); } catch (err) { toast.error(errorText(err, 'Could not cancel.')); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      <section className={`${card} p-5`} aria-labelledby="export-title">
        <h2 id="export-title" className="flex items-center gap-2 font-bold text-slate-800"><FileArchive size={16} /> Export all school data</h2>
        <p className="text-sm text-slate-600 mt-1">A complete copy of every record in every module: students and families, staff, classes, attendance, marks, fees and payments, messages, library, transport and more, plus everyone who can sign in.
          Passwords and security keys are never included. Each download is kept for 7 days.</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {FORMATS.map(([f, label, help]) => (
            <button key={f} onClick={() => make(f)} disabled={!!busy} className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-400 disabled:opacity-50">
              <span className="flex items-center gap-2 font-semibold text-slate-800">{busy === f ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {label}</span>
              <span className="block text-xs text-slate-500 mt-1">{help}</span>
            </button>
          ))}
        </div>
        {data.exports.length > 0 && (
          <table className="w-full text-sm mt-4">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="py-2">Made</th><th className="py-2">Format</th><th className="py-2">Contents</th><th className="py-2">By</th><th className="py-2" /></tr></thead>
            <tbody>
              {data.exports.map((e) => (
                <tr key={e.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-600">{when(e.created_at)}</td>
                  <td className="py-2">{e.format_label}</td>
                  <td className="py-2 text-slate-600">{e.status === 'failed' ? <span className="text-rose-700">Failed</span> : `${e.records} records, ${e.people} people${e.size ? ` · ${size(e.size)}` : ''}`}</td>
                  <td className="py-2 text-slate-500">{e.by}</td>
                  <td className="py-2 text-right">{e.status === 'ready'
                    ? <button onClick={() => portability.download(e).catch(() => toast.error('Could not download.'))} className="text-xs font-semibold text-blue-600">Download</button>
                    : <span className="text-xs text-slate-400">{e.status === 'expired' ? 'Expired' : ''}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={`${card} p-5 border-rose-200`} aria-labelledby="delete-title">
        <h2 id="delete-title" className="flex items-center gap-2 font-bold text-rose-700"><Trash2 size={16} /> Delete the school's data</h2>
        {data.deletion ? (
          <div role="alert" className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-900 space-y-2">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Everything will be deleted on {new Date(data.deletion.scheduled_for).toLocaleDateString(undefined, { dateStyle: 'long' } as any)}.</p>
            <p>Asked by {data.deletion.requested_by} on {new Date(data.deletion.requested_at).toLocaleDateString()}.{data.deletion.last_export_at ? ` Last export: ${new Date(data.deletion.last_export_at).toLocaleDateString()}.` : ' No export has been made yet: download one above if you want to keep a copy.'}</p>
            <button onClick={cancel} disabled={!!busy} className="rounded-lg bg-white border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800">
              {busy === 'cancel' && <Loader2 className="inline w-4 h-4 animate-spin" />} Cancel the deletion
            </button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-600">When the school stops using the system, you can have all of its data deleted: every record, uploaded document and sign-in that belongs only to this school.
              It happens {data.grace_days} days after you ask, and you can cancel until then. Our invoices to the school are kept, as the law requires for accounts. Download an export first if you want a copy.</p>
            <label className="block text-xs font-semibold text-slate-600">Reason (optional)
              <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. the contract has ended" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">Type the school's name to confirm: <span className="text-slate-800">{data.school_name}</span>
              <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </label>
            <button onClick={schedule} disabled={!!busy || confirm.trim().toLowerCase() !== data.school_name.trim().toLowerCase()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {busy === 'delete' && <Loader2 className="inline w-4 h-4 animate-spin" />} Delete all data in {data.grace_days} days
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
