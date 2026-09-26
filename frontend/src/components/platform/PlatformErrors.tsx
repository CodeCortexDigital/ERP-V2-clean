import { useEffect, useState } from 'react';
import { Bug, CheckCircle2, EyeOff, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface Group {
  id: string; source: 'backend' | 'frontend'; kind: string; message: string; location: string; count: number; status: string;
  first_seen: string; last_seen: string; last_school: string; last_user: string; last_path: string; release: string;
  samples?: { at: string; message: string; stack: string; path: string; user: string; school: string; release: string }[];
}
const card = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const when = (d: string) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' } as any);

/** Platform owner: errors from the server and from people's browsers, grouped, with details, to fix and mark resolved. */
export default function PlatformErrors() {
  const [status, setStatus] = useState('open');
  const [data, setData] = useState<{ groups: Group[]; open: number; last_day: number; release: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Group | null>(null);
  const load = () => api.get('/errors/', { params: { status } }).then((r) => setData(r.data)).catch(() => undefined);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);
  useEffect(() => { if (openId) api.get(`/errors/${openId}/`).then((r) => setDetail(r.data.group)); else setDetail(null); }, [openId]);
  const setGroup = async (g: Group, s: string) => {
    try { await api.post(`/errors/${g.id}/`, { status: s }); toast.success(s === 'resolved' ? 'Marked resolved. You will hear if it comes back.' : 'Updated.'); setOpenId(null); load(); }
    catch { toast.error('Could not update.'); }
  };
  if (!data) return null;
  return (
    <section className={`${card} p-4`} aria-labelledby="err-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="err-title" className="flex items-center gap-2 font-bold text-slate-800"><Bug size={16} /> Errors
          <span className={`rounded-full px-2 text-xs ${data.open ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{data.open} open · {data.last_day} seen today</span></h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {data.release && <span>Running version {data.release}</span>}
          <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Show">
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="ignored">Ignored</option><option value="all">All</option>
          </select>
        </div>
      </div>
      <table className="w-full text-sm mt-2">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-100"><th className="py-1">Error</th><th className="py-1">Where</th><th className="py-1 text-right">Times</th><th className="py-1">Last seen</th></tr></thead>
        <tbody>{data.groups.map((g) => (
          <tr key={g.id} className={`border-b border-slate-50 cursor-pointer align-top ${openId === g.id ? 'bg-slate-50' : ''}`} onClick={() => setOpenId(openId === g.id ? null : g.id)}>
            <td className="py-1.5"><span className={`me-1 rounded px-1.5 text-[10px] font-bold ${g.source === 'backend' ? 'bg-slate-800 text-white' : 'bg-sky-100 text-sky-800'}`}>{g.source === 'backend' ? 'Server' : 'Browser'}</span>
              <span className="font-semibold">{g.kind}</span>: {g.message.slice(0, 120)}</td>
            <td className="py-1.5 text-xs text-slate-500 break-all">{g.location}<br />{g.last_path}</td>
            <td className="py-1.5 text-right">{g.count}</td>
            <td className="py-1.5 text-xs text-slate-600">{when(g.last_seen)}<br />{g.last_school || ''}{g.last_user ? ` · ${g.last_user}` : ''}</td>
          </tr>
        ))}{!data.groups.length && <tr><td colSpan={4} className="py-5 text-center text-slate-500">{status === 'open' ? 'No open errors.' : 'Nothing here.'}</td></tr>}</tbody>
      </table>
      {openId && (detail ? (
        <div className="mt-3 rounded-xl border border-slate-200 p-3 text-sm space-y-2">
          <div className="flex flex-wrap gap-2">
            {detail.status !== 'resolved' && <button onClick={() => setGroup(detail, 'resolved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"><CheckCircle2 size={12} /> Mark resolved</button>}
            {detail.status !== 'ignored' && <button onClick={() => setGroup(detail, 'ignored')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold"><EyeOff size={12} /> Ignore</button>}
            {detail.status !== 'open' && <button onClick={() => setGroup(detail, 'open')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold"><RotateCcw size={12} /> Reopen</button>}
            <span className="text-xs text-slate-500 self-center">First seen {when(detail.first_seen)}</span>
          </div>
          {detail.samples?.map((s, i) => (
            <details key={i} open={i === 0} className="rounded-lg bg-slate-50 p-2">
              <summary className="cursor-pointer text-xs text-slate-600">{when(s.at)} · {s.path} · {s.school || 'no school'} · {s.user || 'not signed in'}{s.release ? ` · v${s.release}` : ''}</summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] text-slate-700">{s.stack || s.message}</pre>
            </details>
          ))}
        </div>
      ) : <Loader2 className="mt-3 animate-spin text-slate-400" />)}
    </section>
  );
}
