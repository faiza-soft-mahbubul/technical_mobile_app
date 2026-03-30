import { useCallback, useEffect, useState } from "react";

export function useAsyncResource<TData>(
  loadData: () => Promise<TData>,
  dependencies: readonly unknown[],
) {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await loadData();
        setData(result);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Request failed.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    dependencies,
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: load,
    setData,
  };
}
