import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import api from '@/services/api';

interface AuditEntry {
  id: string;
  user: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_data: any;
  new_data: any;
  changes: any;
  timestamp: string;
}

const pretty = (v: any) => {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'object') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  return String(v);
};

const shortType = (t: string) => t.split('.').pop() || t;

export default function AuditLogViewer() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState('education.attendance.AttendanceRecord');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { resource_type: resourceType };
      if (q.trim()) params.q = q.trim();
      const res = await api.get('/core/audit/logs/', { params });
      const data = res.data?.results || [];
      setEntries(data);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderDiff = (e: AuditEntry) => {
    // Prefer the structured per-field diff when available.
    if (e.changes && typeof e.changes === 'object' && Object.keys(e.changes).length > 0) {
      const keys = Object.keys(e.changes).slice(0, 3);
      return (
        <div className="space-y-0.5">
          {keys.map((k) => {
            const c = e.changes[k] || {};
            return (
              <div key={k} className="truncate">
                <span className="font-semibold text-slate-600">{k}: </span>
                <span className="text-rose-600">{pretty(c.old)}</span>
                <span className="mx-1 text-slate-400">→</span>
                <span className="text-emerald-600">{pretty(c.new)}</span>
              </div>
            );
          })}
          {Object.keys(e.changes).length > 3 && (
            <span className="text-[10px] text-slate-400">+{Object.keys(e.changes).length - 3} more</span>
          )}
        </div>
      );
    }
    // Fallback: show status transition from old/new snapshots.
    const o = e.old_data?.status ?? e.old_data?.action;
    const n = e.new_data?.status ?? e.new_data?.action;
    if (o || n) {
      return (
        <span>
          <span className="text-rose-600">{o ?? '—'}</span>
          <span className="mx-1 text-slate-400">→</span>
          <span className="text-emerald-600">{n ?? '—'}</span>
        </span>
      );
    }
    return <span className="text-slate-400">—</span>;
  };

  return (
    <div className="space-y-6 bg-slate-50 min-h-screen p-4 text-slate-800 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="text-slate-850 font-extrabold text-sm border-r border-slate-200 pr-3.5 mr-1 hover:underline cursor-pointer" onClick={() => navigate('/dashboard')}>Admin</span>
          <ShieldAlert className="w-4 h-4 text-slate-400" />
          <span>Audit Logs</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Change History</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={resourceType}
              onChange={(e) => { setResourceType(e.target.value); }}
              className="text-xs h-9 rounded-xl border border-slate-200 bg-white px-3 font-bold text-slate-700"
            >
              <option value="education.attendance.AttendanceRecord">Attendance Changes</option>
              <option value="">All Resources</option>
            </select>
            <input
              placeholder="Search actor email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="text-xs h-9 w-44 rounded-xl border border-slate-200 bg-white px-3 font-semibold"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-400">No audit entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Actor</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Resource</th>
                    <th className="p-3 text-left">Change</th>
                    <th className="p-3 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 text-xs font-semibold">{e.user || e.user_id || 'system'}</td>
                      <td className="p-3"><Badge variant="outline">{e.action}</Badge></td>
                      <td className="p-3 text-xs text-slate-600">
                        {shortType(e.resource_type)}
                        {e.resource_id ? <span className="block text-[10px] text-slate-400">{e.resource_id}</span> : null}
                      </td>
                      <td className="p-3 text-xs max-w-[260px]">{renderDiff(e)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(e)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Audit Entry Details"
        description={detail ? `${detail.action} · ${detail.resource_type}` : ''}
      >
        {detail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Actor</p>
                <p className="font-semibold">{detail.user || detail.user_id || 'system'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Timestamp</p>
                <p className="font-semibold">{new Date(detail.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Resource ID</p>
                <p className="font-semibold break-all">{detail.resource_id || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Action</p>
                <p className="font-semibold">{detail.action}</p>
              </div>
            </div>

            {detail.changes && typeof detail.changes === 'object' && Object.keys(detail.changes).length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Field Changes</p>
                <div className="space-y-1 rounded-lg border border-slate-200 p-2.5 bg-slate-50">
                  {Object.entries(detail.changes).map(([k, c]: any) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="font-semibold text-slate-600 min-w-[120px]">{k}</span>
                      <span className="text-rose-600 break-all">{pretty(c?.old)}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-emerald-600 break-all">{pretty(c?.new)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Old Data</p>
              <pre className="rounded-lg border border-slate-200 p-2.5 bg-slate-50 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(detail.old_data, null, 2)}</pre>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">New Data</p>
              <pre className="rounded-lg border border-slate-200 p-2.5 bg-slate-50 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(detail.new_data, null, 2)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
