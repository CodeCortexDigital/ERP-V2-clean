import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { setupApiErrorInterceptor } from '@/utils/errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Normalize list endpoints: plain array or paginated `{ results }`. */
export function extractListData<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/** Unwrap Django StandardizedJSONRenderer: { success, data, errors } */
export function unwrapApiResponse<T = unknown>(response: AxiosResponse): AxiosResponse<T> {
  const body = response.data as Record<string, unknown> | null;
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === true) {
      response.data = body.data as T;
    }
  }
  return response as AxiosResponse<T>;
}

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => unwrapApiResponse(response),
  (error) => Promise.reject(error)
);

setupApiErrorInterceptor(api);

export default api;
