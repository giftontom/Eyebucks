import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../../utils/logger';

interface UseAdminDataOptions<T> {
  fetchFn: () => Promise<T>;
  deps?: any[];
  autoFetch?: boolean;
}

interface UseAdminDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminData<T>({
  fetchFn,
  deps = [],
  autoFetch = true,
}: UseAdminDataOptions<T>): UseAdminDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      logger.error('useAdminData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}
