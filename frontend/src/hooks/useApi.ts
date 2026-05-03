import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get(url);
        // Handle DRF paginated response
        const items = response.data.results || response.data.data || (Array.isArray(response.data) ? response.data : []);
        setData(items);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [url]);

  return { data, loading, error };
}
