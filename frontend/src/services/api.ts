// frontend/src/services/api.ts
import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { setupApiErrorInterceptor } from '@/utils/errorHandler';

// ✅ Base API URL resolution order:
//   1. VITE_API_URL (authoritative, set in .env / .env.local) — e.g. http://192.168.10.6:8000/api/v1/
//   2. Fallback: derive from the host the browser is actually on (port 8000),
//      so opening via the LAN IP works even if the env is missing.
// This keeps the configured IP authoritative (robust to how you open the page)
// while still surviving a DHCP IP change when you browse by IP.
export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)
  || (typeof window !== 'undefined' && window.location?.hostname
      ? `http://${window.location.hostname}:8000/api/v1/`
      : '/api/v1/');

// Resolve a possibly-relative media path (e.g. "/media/...", or a
// backend host-relative URL) to an absolute URL on the API origin,
// so the browser doesn't request /media from the VITE dev server.
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const base = API_BASE_URL;
  const origin = base.startsWith('http') ? base.replace(/\/api\/v1\/?$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function extractListData<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export function unwrapApiResponse<T = unknown>(response: AxiosResponse): AxiosResponse<T> {
  const body = response.data as Record<string, unknown> | null;
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === true) {
      response.data = body.data as T;
    }
  }
  return response as AxiosResponse<T>;
}

function getCSRFToken(): string | null {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='));
  return cookieValue ? cookieValue.split('=')[1] : null;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (config.method !== 'get') {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }

  // Append a cache-buster to GET requests so the browser never serves a
  // stale cached 404 from before a backend route was registered.
  if ((config.method || 'get').toLowerCase() === 'get' && config.url) {
    const sep = config.url.includes('?') ? '&' : '?';
    config.url = `${config.url}${sep}_cb=${Date.now()}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => unwrapApiResponse(response),
  (error) => Promise.reject(error)
);

setupApiErrorInterceptor(api);

export default api;