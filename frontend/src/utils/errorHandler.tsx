import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

type ApiErrorBody = {
  error?: string;
  detail?: string;
  message?: string;
  errors?: string | Record<string, unknown> | unknown[];
};

export function getApiErrorMessage(error: AxiosError<ApiErrorBody>): string {
  if (!error.response) {
    return error.message || 'Network error — check your connection';
  }
  const data = error.response.data;
  if (typeof data === 'string') return data;
  if (data?.errors) {
    if (typeof data.errors === 'string') return data.errors;
    if (Array.isArray(data.errors)) return data.errors.map(String).join(', ');
    if (typeof data.errors === 'object' && data.errors !== null && 'error' in data.errors) {
      return String((data.errors as { error: string }).error);
    }
  }
  if (data?.error) return data.error;
  if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
  if (data?.message && data.message !== 'Error') return data.message;
  return `Request failed (${error.response.status})`;
}

export function showApiErrorToast(error: unknown, fallback = 'Something went wrong') {
  const message =
    error && typeof error === 'object' && 'isAxiosError' in error
      ? getApiErrorMessage(error as AxiosError)
      : fallback;
  toast.error(message);
}

let interceptorInstalled = false;

/** Attach global response interceptor with toast + 401 logout */
export function setupApiErrorInterceptor(api: AxiosInstance) {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const config = error.config as any;
      if (config?.skipGlobalToast) {
        return Promise.reject(error);
      }

      const status = error.response?.status;

      if (status === 401) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        toast.error('Session expired — please sign in again');
        return Promise.reject(error);
      }

      if (status === 403) {
        toast.error('You do not have permission to perform this action');
      } else if (status && status >= 500) {
        toast.error('Server error — please try again later');
      } else if (status && status >= 400) {
        toast.error(getApiErrorMessage(error));
      }

      return Promise.reject(error);
    }
  );
}

export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (import.meta.env.DEV) {
      toast.error(event.message || 'Unexpected error');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
  });
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message || 'This section failed to load.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Lightweight boundary for individual widgets */
export function ComponentErrorFallback({
  message = 'Failed to load this section',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-red-800 underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
