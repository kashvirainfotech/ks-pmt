import { useCallback, useEffect, useRef, useState } from "react";
import { fetchListing } from "../api/listings";
import { useAuth } from "../context/AuthContext";

export function useListing<T = Record<string, any>>(
  path: string | null,
  params: Record<string, unknown> = {},
) {
  const { selectedBranchId } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const key = JSON.stringify(params);
  const reload = useCallback(
    async (options?: { keepRows?: boolean }) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      if (!options?.keepRows) setRows([]);
      setError("");
      if (!path) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await fetchListing(
          path,
          JSON.parse(key),
          controller.signal,
        );
        if (!controller.signal.aborted) setRows(result as T[]);
      } catch (e: any) {
        if (!controller.signal.aborted)
          setError(
            e.response?.data?.message || e.message || "Unable to load records.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [path, key, selectedBranchId],
  );
  useEffect(() => {
    void reload();
    return () => request.current?.abort();
  }, [reload]);
  return { rows, loading, error, reload };
}
