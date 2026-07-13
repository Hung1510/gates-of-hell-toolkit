import { useEffect, useState } from "react";
import type { Squad } from "../types";
import { getSquads } from "../api";

export function useSquads(faction?: string) {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSquads(faction)
      .then((data) => {
        if (!cancelled) setSquads(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [faction]);

  return { squads, loading, error };
}
