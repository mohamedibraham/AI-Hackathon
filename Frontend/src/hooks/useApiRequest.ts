import { useCallback, useEffect, useRef, useState } from "react";

export type RequestStatus = "loading" | "success" | "error" | "empty";

export interface ApiRequestState<T> {
  data: T | null;
  error: Error | null;
  status: RequestStatus;
  isLoading: boolean;
  refetch: () => void;
}

interface Options<T> {
  /** Decides whether a successful response should be treated as "empty". */
  isEmpty?: (data: T) => boolean;
  enabled?: boolean;
}

/**
 * Uniform Loading / Success / Error / Empty handling for every service call,
 * so pages never need structural changes when the real backend is wired up.
 */
export function useApiRequest<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: Options<T> = {},
): ApiRequestState<T> {
  const { isEmpty, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<RequestStatus>(enabled ? "loading" : "empty");
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus(isEmptyRef.current?.(result) ? "empty" : "success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, status, isLoading: status === "loading", refetch };
}
