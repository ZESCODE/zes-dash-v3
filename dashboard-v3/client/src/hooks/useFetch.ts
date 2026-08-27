import { useCallback, useEffect, useRef, useState } from "react";

interface UseFetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
  lastUpdated: number | null;
}

/** Poll a JSON endpoint every `intervalMs` (<=5s per spec). No SSE. */
export function useFetch<T>(url: string, intervalMs = 5000): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as T;
      if (!alive.current) return;
      setData(json);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [load, intervalMs]);

  return { data, error, loading, refresh: load, lastUpdated };
}
