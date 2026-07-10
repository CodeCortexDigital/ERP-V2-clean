// frontend/src/services/api.ts
import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { setupApiErrorInterceptor } from '@/utils/errorHandler';

// ✅ Use relative URL for proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
  
  return config;
});

api.interceptors.response.use(
  (response) => unwrapApiResponse(response),
  (error) => Promise.reject(error)
);

setupApiErrorInterceptor(api);

export default api;