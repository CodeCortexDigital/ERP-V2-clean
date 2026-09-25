// Global search: one box for the whole school; the server returns only what the signed-in person may see.
import api from './api';

export interface SearchHit { type: string; id: string; title: string; subtitle: string; url: string }
export interface SearchGroup { type: string; label: string; count: number; more: boolean; results: SearchHit[] }
export interface SearchResponse { query: string; groups: SearchGroup[]; total: number }

export async function search(q: string, opts: { type?: string; limit?: number } = {}): Promise<SearchResponse> {
  const res = await api.get<SearchResponse>('/search/', { params: { q, ...(opts.type ? { type: opts.type } : {}), ...(opts.limit ? { limit: opts.limit } : {}) } });
  return res.data || { query: q, groups: [], total: 0 };
}

const RECENT_KEY = 'search.recent';
export function recentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 6); } catch { return []; }
}
export function rememberSearch(q: string) {
  const v = q.trim();
  if (v.length < 2) return;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([v, ...recentSearches().filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6))); } catch { /* private mode */ }
}
