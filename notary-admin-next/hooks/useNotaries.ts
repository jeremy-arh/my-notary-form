"use client";

import { useState, useEffect, useCallback } from "react";
import type { NotaryListItem } from "@/app/api/admin/notaries/route";

export function useNotaries() {
  const [notaries, setNotaries] = useState<NotaryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/notaries", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement");
      setNotaries(data.notaries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { notaries, loading, error, refetch };
}
