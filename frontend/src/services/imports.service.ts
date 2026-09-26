// Spreadsheet import (P10): students, staff, classes, subjects and opening fee balances.
import api from './api';

export interface ImportKind {
  kind: string; label: string; help: string; order: number;
  columns: { key: string; label: string; required: boolean }[];
  last_import: { when: string; added: number } | null;
}
export interface PreviewRow { row: number; state: 'ready' | 'duplicate' | 'error'; messages: string[]; note: string; values: Record<string, string> }
export interface Preview {
  file: string; columns: { key: string; label: string }[]; unknown_columns: string[];
  summary: { ready: number; duplicate: number; error: number }; rows: PreviewRow[];
}
export interface ImportResult { id: string; added: number; skipped: number; failed: number; message: string; problems: PreviewRow[] }
export interface ImportHistoryRow {
  id: string; kind: string; label: string; file: string; when: string; by: string;
  rows: number; added: number; skipped: number; failed: number; has_problems: boolean;
}

const form = (file: File) => { const f = new FormData(); f.append('file', file); return f; };
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

async function save(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
  URL.revokeObjectURL(href);
}

export const errorText = (e: any, fallback: string) => e?.response?.data?.error || fallback;

const importsService = {
  kinds: () => api.get('/auth/imports/').then((r) => r.data as { kinds: ImportKind[]; max_rows: number }),
  template: (kind: string) => save(`/auth/imports/${kind}/template/`, `import-${kind}.csv`),
  preview: (kind: string, file: File) => api.post(`/auth/imports/${kind}/preview/`, form(file), multipart).then((r) => r.data as Preview),
  run: (kind: string, file: File) => api.post(`/auth/imports/${kind}/import/`, form(file), multipart).then((r) => r.data as ImportResult),
  history: () => api.get('/auth/imports/history/').then((r) => r.data.results as ImportHistoryRow[]),
  problems: (id: string, kind: string) => save(`/auth/imports/history/${id}/problems.csv`, `import-${kind}-problems.csv`),
};

export default importsService;
