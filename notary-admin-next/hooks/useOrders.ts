"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Submission {
  id: string;
  status: string;
  funnel_status: string | null;
  created_at: string;
  total_price: number | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  country: string | null;
  client_id: string | null;
  data: Record<string, unknown> | null;
}

export function useOrders() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: err } = await supabase
        .from("submission")
        .select("id, status, funnel_status, created_at, total_price, first_name, last_name, email, country, client_id, data")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setSubmissions((data as Submission[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, []);

  return { submissions, loading, error, refetch };
}
