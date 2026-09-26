import { useEffect, useState } from 'react';
import { FileCheck2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import portability, { errorText, SchoolDeletion } from '@/services/portability.service';

const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const TONE: Record<string, string> = { scheduled: 'bg-amber-100 text-amber-800', cancelled: 'bg-slate-100 text-slate-500', done: 'bg-rose-100 text-rose-700' };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' } as any) : '');

/** Platform owner: schools that asked for their data to be deleted, carrying it out, and the deletion certificate. */
export default function PlatformDeletions() {
  const [rows, setRows] = useState<SchoolDeletion[] | null>(null);
  const [cert, setCert] = useState<SchoolDeletion | null>(null);
  const [busy, setBusy] = useState('');
  const load = () => portability.platformList().then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const purge = async (d: SchoolDeletion) => {
    const typed = window.prompt(`This deletes everything that belongs to ${d.school} now, and can't be undone.\nType the school name to confirm:`, '');
    if (typed === null) return;
    setBusy(d.id);
    try { const done = await portability.purge(d.id, typed); toast.success(`${d.school}: ${done.records_deleted} records deleted.`); setCert(done); load(); }
    catch (e) { toast.error(errorText(e, 'Could not delete.')); } finally { setBusy(''); }
  };

  return (
    <section className={card} aria-labelledby="del-title">
      <h2 id="del-title" className="flex items-center gap-2 px-4 pt-4 font-bold text-slate-800"><Trash2 size={16} /> Data deletions</h2>
      <p className="px-4 text-xs text-slate-500">Schools that asked for their data to be deleted. The daily job deletes on the date; you can do it earlier.</p>
      {rows === null ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <table className="w-full text-sm mt-2">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="px-4 py-2">School</th><th className="px-4 py-2">Asked</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-slate-50">
                <td className="px-4 py-2"><p className="font-semibold">{d.school}</p><p className="text-xs text-slate-500">{d.code}{d.reason ? ` · ${d.reason}` : ''}</p></td>
                <td className="px-4 py-2 text-slate-600">{day(d.requested_at)}<p className="text-xs text-slate-400">{d.requested_by}</p></td>
                <td className="px-4 py-2 text-slate-600">{d.status === 'done' ? day(d.completed_at) : day(d.scheduled_for)}</td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE[d.status]}`}>{d.status_label}</span></td>
                <td className="px-4 py-2 text-right">
                  {d.status === 'scheduled' && <button onClick={() => purge(d)} disabled={!!busy} className="text-xs font-semibold text-rose-600">{busy === d.id ? 'Deleting…' : 'Delete now'}</button>}
                  {d.status === 'done' && <button onClick={() => setCert(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><FileCheck2 size={12} /> Certificate</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No deletion requests.</td></tr>}
          </tbody>
        </table>
      )}
      {cert && (
        <div className="m-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" role="dialog" aria-label="Deletion certificate">
          <div className="flex justify-between"><p className="font-bold">Certificate of data deletion</p><button onClick={() => setCert(null)} className="text-xs text-slate-500">Close</button></div>
          <p className="mt-2">All data belonging to <strong>{cert.school}</strong> ({cert.code}) was deleted on {cert.completed_at && new Date(cert.completed_at).toLocaleString()} by {cert.completed_by}, at the request of {cert.requested_by} made on {day(cert.requested_at)}.</p>
          <p className="mt-1">{cert.records_deleted} records, {cert.files_deleted} uploaded files and {cert.users_deleted} sign-in accounts were deleted. Platform invoices are kept for accounting.</p>
          <details className="mt-2"><summary className="cursor-pointer text-xs text-slate-600">Records by kind</summary>
            <ul className="mt-1 grid sm:grid-cols-2 gap-x-4 text-xs text-slate-600">{Object.entries(cert.counts).map(([k, n]) => <li key={k}>{k}: {n}</li>)}</ul>
          </details>
          <button onClick={() => window.print()} className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold">Print</button>
        </div>
      )}
    </section>
  );
}
