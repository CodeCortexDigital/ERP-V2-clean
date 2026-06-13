import api, { extractListData } from './api';

export type SearchResult = {
  type: 'student' | 'teacher' | 'class';
  id: string;
  label: string; // may contain <mark> highlights
  subLabel?: string;
};

export async function search(q: string, page = 1, page_size = 10): Promise<{ results: SearchResult[]; count: number }> {
  const res = await api.get(`/v1/search/?q=${encodeURIComponent(q)}&page=${page}&page_size=${page_size}`);
  const data = res.data as { results: SearchResult[]; count: number };
  return data || { results: [], count: 0 };
}
