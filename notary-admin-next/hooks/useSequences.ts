"use client";

import { useState, useEffect, useCallback } from "react";

export interface AutomationStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_value: number;
  delay_unit: "minutes" | "hours" | "days";
  send_window_start: number | null;
  send_window_end: number | null;
  channel: "email" | "sms";
  template_key: string;
  subject: string | null;
  message_body: string | null;
  html_body: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationSequence {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  trigger_status: string | null;
  channel: "email" | "sms";
  is_active: boolean;
  steps: AutomationStep[];
  created_at: string;
  updated_at: string;
}

export function useSequences() {
  const [sequences, setSequences] = useState<AutomationSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/sequences");
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setSequences(json.sequences || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const createSequence = async (data: {
    name: string;
    description?: string;
    trigger_event: string;
    trigger_status?: string;
    channel: "email" | "sms";
  }) => {
    const res = await fetch("/api/admin/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur de création");
    await fetchSequences();
  };

  const updateSequence = async (id: string, data: Partial<AutomationSequence>) => {
    const res = await fetch(`/api/admin/sequences/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur de mise à jour");
    await fetchSequences();
  };

  const deleteSequence = async (id: string) => {
    const res = await fetch(`/api/admin/sequences/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erreur de suppression");
    await fetchSequences();
  };

  const createStep = async (
    sequenceId: string,
    data: Omit<AutomationStep, "id" | "sequence_id" | "created_at" | "updated_at" | "is_active">
  ) => {
    const res = await fetch(`/api/admin/sequences/${sequenceId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur de création de l'étape");
    await fetchSequences();
  };

  const updateStep = async (
    sequenceId: string,
    stepId: string,
    data: Partial<AutomationStep>
  ) => {
    const res = await fetch(`/api/admin/sequences/${sequenceId}/steps/${stepId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur de mise à jour de l'étape");
    await fetchSequences();
  };

  const deleteStep = async (sequenceId: string, stepId: string) => {
    const res = await fetch(`/api/admin/sequences/${sequenceId}/steps/${stepId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erreur de suppression de l'étape");
    await fetchSequences();
  };

  return {
    sequences,
    loading,
    error,
    refresh: fetchSequences,
    createSequence,
    updateSequence,
    deleteSequence,
    createStep,
    updateStep,
    deleteStep,
  };
}
