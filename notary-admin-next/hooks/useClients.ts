"use client";

import { useState, useEffect } from "react";

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  crm_status: string | null;
  created_at: string;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/admin/clients", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de chargement");
        setClients(data.clients || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  return { clients, loading, error };
}
