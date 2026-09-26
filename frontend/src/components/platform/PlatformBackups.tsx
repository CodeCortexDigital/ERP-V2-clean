import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface Backup {
  id: string; status: string; started_at: string; size: number | null; records: number | null; kinds: number | null; durable: boolean;
  error: string | null; verified: boolean; verified_at: string | null; removed: boolean; expires_at: string;
  restore_test: { ok?: boolean; running?: boolean; error?: string; missing?: Record<string, [number, number]> } | null;
}
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const when = (d: string) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any);
const mb = (n: number | null) => (n == null ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

/** Platform owner: encrypted database backups, making one now, and testing that one restores. */
export default function PlatformBackups() {
  const [data, setData] = useState<{ backups: Backup[]; durable: boolean; last_backup_hours_ago: number | null; last_verified: string | null } | null>(null);
  const [busy, setBusy] = useState('');
  const load = () => api.get('/backups/').then((r) => setData(r.data)).catch(() => undefined);
  useEffect(() => { load(); }, []);
  // While a restore test runs, check back every 15 seconds.
  useEffect(() => {
    if (!data?.backups.some((b) => b.restore_test?.running)) return;
    const t = window.setInterval(load, 15000);
    return () => window.clearInterval(t);
  }, [data]);
  if (!data) return null;

  const backupNow = async () => {
    setBusy('new');
    try { const r = await api.post('/backups/'); toast.success(`Backup made: ${r.data.backup.records} records.`); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Backup failed.'); } finally { setBusy(''); }
  };
  const verify = async (b: Backup) => {
    setBusy(b.id);
    try { toast.success((await api.post(`/backups/${b.id}/verify/`)).data.message); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Could not start the restore test.'); } finally { setBusy(''); }
  };
  const stale = data.last_backup_hours_ago == null || data.last_backup_hours_ago > 26;
  return (
    <section className={`${card} p-4`} aria-labelledby="bk-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bk-title" className="flex items-center gap-2 font-bold text-slate-800"><DatabaseBackup size={16} /> Backups</h2>
        <button onClick={backupNow} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
          {busy === 'new' ? <Loader2 size={12} className="animate-spin" /> : <DatabaseBackup size={12} />} Back up now
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        <li className={stale ? 'text-rose-700 font-semibold' : 'text-slate-600'}>{data.last_backup_hours_ago == null ? 'No backup yet.' : `Last backup ${data.last_backup_hours_ago} hours ago.`} Backups should run every day.</li>
        <li className={data.last_verified ? 'text-slate-600' : 'text-amber-700'}>{data.last_verified ? `Last successful restore test: ${when(data.last_verified)}.` : 'No backup has been test-restored yet. Run a restore test at least once a month.'}</li>
        {!data.durable && <li className="flex items-center gap-1 text-rose-700"><AlertTriangle size={14} /> Backups are stored on the app server, which is wiped on every deploy. Set BACKUP_S3_BUCKET and the AWS keys so they are kept safely.</li>}
      </ul>
      <table className="w-full text-sm mt-3">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="py-1">Made</th><th className="py-1">Contents</th><th className="py-1">Restore test</th><th /></tr></thead>
        <tbody>{data.backups.filter((b) => !b.removed).slice(0, 15).map((b) => (
          <tr key={b.id} className="border-b border-slate-50">
            <td className="py-1.5 text-slate-600">{when(b.started_at)}</td>
            <td className="py-1.5">{b.status === 'success' ? `${b.records?.toLocaleString()} records · ${mb(b.size)}` : <span className="text-rose-700">Failed: {b.error?.slice(0, 80)}</span>}</td>
            <td className="py-1.5">{b.restore_test?.running ? <span className="inline-flex items-center gap-1 text-slate-600"><Loader2 size={12} className="animate-spin" /> Running…</span>
              : b.restore_test?.ok ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={13} /> Restored completely</span>
              : b.restore_test ? <span className="inline-flex items-center gap-1 text-rose-700"><XCircle size={13} /> {b.restore_test.error || `Missing: ${Object.keys(b.restore_test.missing || {}).join(', ')}`}</span>
              : <span className="text-slate-400">Not tested</span>}</td>
            <td className="py-1.5 text-right">{b.status === 'success' && !b.restore_test?.running && (
              <button onClick={() => verify(b)} disabled={!!busy} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><RotateCcw size={12} /> Test restore</button>)}</td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  );
}
