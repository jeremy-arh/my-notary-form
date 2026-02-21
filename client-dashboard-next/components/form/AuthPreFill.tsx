"use client";

import { useEffect, useRef } from "react";
import { useFormData } from "@/contexts/FormContext";
import { createClient } from "@/lib/supabase/client";

/**
 * Si l'utilisateur est déjà connecté (session Supabase), pré-remplit les champs vides
 * avec les données du client. Ne remplace jamais les données déjà saisies (localStorage).
 */
export default function AuthPreFill() {
  const { formData, updateFormData } = useFormData();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const loadAndPreFill = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: client, error } = await supabase
          .from("client")
          .select("first_name, last_name, email, phone, address, city, postal_code, country, timezone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error || !client) return;

        updateFormData((prev) => ({
          firstName: prev.firstName?.trim() || client.first_name || "",
          lastName: prev.lastName?.trim() || client.last_name || "",
          email: prev.email?.trim() || client.email || "",
          phone: prev.phone?.trim() || client.phone || "",
          address: prev.address?.trim() || client.address || "",
          city: prev.city?.trim() || client.city || "",
          postalCode: prev.postalCode?.trim() || client.postal_code || "",
          country: prev.country?.trim() || client.country || "",
          timezone: prev.timezone?.trim() || client.timezone || prev.timezone || "UTC",
        }));
      } catch {
        /* ignore */
      }
    };

    loadAndPreFill();
  }, [updateFormData]);

  return null;
}
