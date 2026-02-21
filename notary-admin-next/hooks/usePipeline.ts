"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export const FUNNEL_STATUS_ORDER = [
  "submission_completed",
  "payment_completed",
  "summary_viewed",
  "delivery_method_selected",
  "documents_uploaded",
  "services_selected",
  "personal_info_completed",
  "started",
];

export const FUNNEL_LABELS: Record<string, string> = {
  started: "Démarrage",
  services_selected: "Services sélectionnés",
  documents_uploaded: "Documents uploadés",
  delivery_method_selected: "Méthode de livraison",
  personal_info_completed: "Infos personnelles",
  summary_viewed: "Résumé consulté",
  payment_pending: "Paiement en attente",
  payment_completed: "Paiement effectué",
  submission_completed: "Terminé",
};

export interface PipelineSubmission {
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
  data?: Record<string, unknown> | string | null;
}

export function usePipeline(statusFilter?: string, dateFilter?: string) {
  const [submissions, setSubmissions] = useState<PipelineSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterByDate = (list: PipelineSubmission[]): PipelineSubmission[] => {
    if (!dateFilter || dateFilter === "all") return list;
    const days = parseInt(dateFilter, 10);
    if (isNaN(days)) return list;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return list.filter((s) => new Date(s.created_at) >= cutoff);
  };

  const filterByStatus = (list: PipelineSubmission[]): PipelineSubmission[] =>
    statusFilter && statusFilter !== "all"
      ? list.filter((s) => s.status === statusFilter)
      : list;

  const filteredSubmissions = filterByStatus(filterByDate(submissions));

  const refetch = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("submission")
        .select("id, status, funnel_status, created_at, total_price, first_name, last_name, email, country, client_id, data")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setSubmissions((data as PipelineSubmission[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const moveSubmission = async (submissionId: string, newFunnelStatus: string) => {
    const supabase = createClient();
    const updateData: { funnel_status: string; status?: string } = { funnel_status: newFunnelStatus };
    if (newFunnelStatus === "submission_completed") {
      updateData.status = "completed";
    }
    const { error: err } = await supabase
      .from("submission")
      .update(updateData)
      .eq("id", submissionId);

    if (err) throw err;
    await refetch();
  };

  const getEffectiveColumn = (s: PipelineSubmission): string => {
    if (s.status === "confirmed" || s.status === "completed") return "submission_completed";
    const rawData = s.data;
    const parsed = typeof rawData === "string" ? (() => { try { return JSON.parse(rawData); } catch { return null; } })() : rawData;
    const paymentStatus = (parsed as { payment?: { payment_status?: string } } | null)?.payment?.payment_status;
    if (paymentStatus === "paid") return "payment_completed";
    const status = s.funnel_status || "started";
    if (status === "payment_pending") return "summary_viewed";
    return status;
  };

  const columns = FUNNEL_STATUS_ORDER.map((status) => ({
    id: status,
    title: FUNNEL_LABELS[status] || status,
    submissions: filteredSubmissions.filter((s) => getEffectiveColumn(s) === status),
  }));

  return { submissions, columns, totalSubmissions: filteredSubmissions.length, loading, error, refetch, moveSubmission };
}
