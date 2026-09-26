// School data export and end-of-contract deletion (P13).
import api from './api';

export interface SchoolExport {
  id: string; format: 'csv' | 'json' | 'xlsx'; format_label: string; status: 'ready' | 'failed' | 'expired'; size: number;
  records: number; people: number; files: number; created_at: string; expires_at: string; error: string; by: string;
}
export interface SchoolDeletion {
  id: string; status: 'scheduled' | 'cancelled' | 'done'; status_label: string; school: string; code: string;
  requested_at: string; scheduled_for: string; reason: string; requested_by: string; cancelled_at: string | null;
  completed_at: string | null; completed_by: string; counts: Record<string, number>; files_deleted: number;
  users_deleted: number; records_deleted: number; last_export_at: string | null;
}

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;

async function save(url: string, fallbackName: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const disposition = String(res.headers?.['content-disposition'] || '');
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = href; a.download = name; a.click();
  URL.revokeObjectURL(href);
}

const portabilityService = {
  overview: () => api.get('/portability/').then((r) => r.data as { exports: SchoolExport[]; deletion: SchoolDeletion | null; grace_days: number; school_name: string }),
  createExport: (format: string) => api.post('/portability/exports/', { format }).then((r) => r.data.export as SchoolExport),
  download: (e: SchoolExport) => save(`/portability/exports/${e.id}/download/`, `school-export.${e.format === 'xlsx' ? 'xlsx' : 'zip'}`),
  requestDeletion: (confirm: string, reason: string) => api.post('/portability/deletion/', { confirm, reason }).then((r) => r.data as { message: string; deletion: SchoolDeletion }),
  cancelDeletion: () => api.delete('/portability/deletion/').then((r) => r.data as { message: string }),
  platformList: () => api.get('/portability/platform/').then((r) => r.data.deletions as SchoolDeletion[]),
  purge: (id: string, confirm: string) => api.post(`/portability/platform/${id}/purge/`, { confirm }).then((r) => r.data.deletion as SchoolDeletion),
};

export default portabilityService;
