import { useCallback, useState } from 'react';
import type { AxiosError, AxiosResponse } from 'axios';
import { getApiErrorMessage } from '@/utils/errorHandler';

type ApiExecutor<T> = () => Promise<AxiosResponse<T>>;

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Wrap API calls with loading/error state (use alongside React Query for caching).
 */
export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (request: ApiExecutor<T>): Promise<T | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const response = await request();
      const data = response.data;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = getApiErrorMessage(err as AxiosError);
      setState((s) => ({ ...s, loading: false, error: message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
    setError: (error: string | null) => setState((s) => ({ ...s, error })),
  };
}
