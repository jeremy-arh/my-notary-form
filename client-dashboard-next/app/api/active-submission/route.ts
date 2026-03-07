/**
 * GET /api/active-submission
 * Retourne la soumission en cours (pending_payment) pour un email ou un submissionId.
 * Utilisé pour reprendre un formulaire depuis un lien email ou éviter les doublons.
 *
 * Query params:
 *   ?submissionId=xxx  → charge une soumission spécifique
 *   ?email=xxx         → cherche la dernière soumission pending_payment pour cet email
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmissionRow = {
  id: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  total_price: number | null;
  created_at: string;
  data: {
    session_id?: string;
    selectedServices?: string[];
    selected_services?: string[];
    serviceDocuments?: Record<string, unknown[]>;
    documents?: Record<string, unknown[]>;
    delivery_method?: string;
    deliveryMethod?: string;
    delivery_option?: string;
    deliveryOption?: string;
    delivery_price_eur?: number;
    deliveryPriceEUR?: number;
    delivery_address?: string;
    deliveryAddress?: string;
    delivery_city?: string;
    deliveryCity?: string;
    delivery_postal_code?: string;
    deliveryPostalCode?: string;
    delivery_country?: string;
    deliveryCountry?: string;
    use_personal_address_for_delivery?: boolean;
    usePersonalAddressForDelivery?: boolean;
    signatories?: unknown[];
    is_signatory?: boolean;
    currency?: string;
    timezone?: string;
    notes?: string;
    gclid?: string;
  } | null;
};

function submissionToFormData(s: SubmissionRow) {
  const d = s.data ?? {};
  return {
    firstName: s.first_name ?? "",
    lastName: s.last_name ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    postalCode: s.postal_code ?? "",
    country: s.country ?? "",
    timezone: d.timezone ?? "",
    notes: d.notes ?? "",
    selectedServices: d.selectedServices ?? d.selected_services ?? [],
    serviceDocuments: d.serviceDocuments ?? d.documents ?? {},
    deliveryMethod: d.deliveryMethod ?? d.delivery_method ?? null,
    deliveryOption: d.deliveryOption ?? d.delivery_option ?? null,
    deliveryPriceEUR: d.deliveryPriceEUR ?? d.delivery_price_eur ?? undefined,
    deliveryCarrier: d.deliveryCarrier ?? d.delivery_carrier ?? undefined,
    deliveryAddress: d.deliveryAddress ?? d.delivery_address ?? undefined,
    deliveryCity: d.deliveryCity ?? d.delivery_city ?? undefined,
    deliveryPostalCode: d.deliveryPostalCode ?? d.delivery_postal_code ?? undefined,
    deliveryCountry: d.deliveryCountry ?? d.delivery_country ?? undefined,
    usePersonalAddressForDelivery: d.usePersonalAddressForDelivery ?? d.use_personal_address_for_delivery ?? undefined,
    signatories: d.signatories ?? [],
    isSignatory: d.is_signatory ?? false,
    currency: d.currency ?? "EUR",
    gclid: d.gclid ?? "",
    // Lien vers la soumission pour les sauvegardes suivantes
    submissionId: s.id,
    sessionId: d.session_id ?? "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId") ?? searchParams.get("submission-id");
    const email = searchParams.get("email");

    if (!submissionId && !email) {
      return NextResponse.json({ error: "submissionId or email required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let submission: SubmissionRow | null = null;

    if (submissionId) {
      const { data, error } = await supabase
        .from("submission")
        .select("id, status, first_name, last_name, email, phone, address, city, postal_code, country, total_price, created_at, data")
        .eq("id", submissionId)
        .maybeSingle();
      if (error) throw error;
      submission = data;
    } else if (email) {
      const { data, error } = await supabase
        .from("submission")
        .select("id, status, first_name, last_name, email, phone, address, city, postal_code, country, total_price, created_at, data")
        .eq("email", email)
        .eq("status", "pending_payment")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      submission = data;
    }

    if (!submission) {
      return NextResponse.json({ submission: null, formData: null });
    }

    return NextResponse.json({
      submission,
      formData: submissionToFormData(submission),
    });
  } catch (err) {
    console.error("[active-submission]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
