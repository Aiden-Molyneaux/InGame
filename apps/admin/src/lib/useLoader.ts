import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from './errors';

// The console's data-fetching primitive: ~40 lines instead of a query library. Every screen here does
// "load once, show a refresh button, surface the failure" — the caching, deduping and invalidation a
// real query cache buys are worth nothing to a tool with one operator and seven endpoints.

export interface LoaderState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** When the data on screen was fetched — the dashboard's honesty stamp. */
  fetchedAt: Date | null;
  reload: () => void;
}

/**
 * @param key          re-runs the loader whenever this changes (the reports filter/cursor lives here).
 * @param loader       the request. Captured in a ref, so an inline closure does NOT cause a refetch loop.
 * @param requiredTier passed to `describeError` so a 403 explains itself (see errors.ts).
 */
export function useLoader<T>(key: string, loader: () => Promise<T>, requiredTier?: number): LoaderState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (!aliveRef.current) return;
      setData(result);
      setFetchedAt(new Date());
    } catch (err) {
      if (!aliveRef.current) return;
      setError(describeError(err, requiredTier));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [requiredTier]);

  useEffect(() => {
    void run();
    // `key` is the intentional dependency: the loader identity changes on every render.
  }, [key, run]);

  return { data, error, loading, fetchedAt, reload: () => void run() };
}
