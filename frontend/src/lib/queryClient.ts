import { QueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/utils/errorHandler';
import type { AxiosError } from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: 0,
    },
  },
});

queryClient.setQueryDefaults(['students'], { staleTime: 5 * 60 * 1000 });
queryClient.setQueryDefaults(['classes'], { staleTime: 60 * 60 * 1000 });
queryClient.setQueryDefaults(['dashboard'], { staleTime: 60 * 1000 });
queryClient.setQueryDefaults(['analytics'], { staleTime: 15 * 60 * 1000 });

export function handleQueryError(error: unknown): string {
  return getApiErrorMessage(error as AxiosError);
}
