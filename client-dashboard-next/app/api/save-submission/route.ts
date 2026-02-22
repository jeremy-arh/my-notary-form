/**
 * API route pour sauvegarder la submission (create/update).
 * Workflow strictement identique à submissionSave.js de l'ancienne version.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const getFunnelStatus = (step: number): string => {
  if (step >= 4) return "personal_info_completed";
  if (step >= 3) return "delivery_method_selected";
  if (step >= 2) return "documents_uploaded";
  if (step >= 1) return "services_selected";
  return "started";
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, currentStep, completedSteps, totalAmount, sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const funnelStatus = getFunnelStatus(currentStep ?? 1);

    // Chercher submission existante par session_id
    const { data: existingSubmissions } = await supabase
      .from("submission")
      .select("id, client_id, data, funnel_status")
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(20);

    const existingSubmission = (existingSubmissions ?? []).find(
      (s: { data?: { session_id?: string } }) => s.data?.session_id === sessionId
    );

    // Structure data identique à l'ancienne version + compat create-checkout-session
    const submissionData = {
      client_id: null,
      email: formData?.email || null,
      first_name: formData?.firstName || null,
      last_name: formData?.lastName || null,
      phone: formData?.phone ?? "",
      address: formData?.address || null,
      city: formData?.city || null,
      postal_code: formData?.postalCode || null,
      country: formData?.country || null,
      status: "pending_payment",
      funnel_status: funnelStatus,
      total_price: totalAmount ?? null,
      notes: formData?.notes || null,
      data: {
        session_id: sessionId,
        selected_services: formData?.selectedServices ?? [],
        documents: formData?.serviceDocuments ?? {},
        selectedServices: formData?.selectedServices ?? [],
        serviceDocuments: formData?.serviceDocuments ?? {},
        delivery_method: formData?.deliveryMethod ?? null,
        signatories: formData?.signatories ?? [],
        is_signatory: formData?.isSignatory ?? false,
        currency: formData?.currency ?? "EUR",
        gclid: formData?.gclid ?? null,
        current_step: currentStep ?? 1,
        completed_steps: completedSteps ?? [],
        funnel_status: funnelStatus,
      },
    };

    if (existingSubmission) {
      const { shouldUpdateFunnelStatus } = await import("@/lib/utils/funnelStatus");
      const currentFunnel = (existingSubmission as { funnel_status: string | null }).funnel_status;
      let updatePayload: Record<string, unknown> = { ...submissionData };
      if (!shouldUpdateFunnelStatus(currentFunnel, funnelStatus)) {
        const { funnel_status: _, ...rest } = submissionData;
        updatePayload = rest;
      }

      const { data, error } = await supabase
        .from("submission")
        .update(updatePayload)
        .eq("id", (existingSubmission as { id: string }).id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ id: data?.id });
    }

    const { data, error } = await supabase
      .from("submission")
      .insert(submissionData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data?.id });
  } catch (err) {
    console.error("[save-submission]", err);
    const message = err instanceof Error ? err.message : "Save failed";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json(
        { error: "Config serveur manquante : ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
