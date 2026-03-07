/**
 * API route pour sauvegarder la submission (create/update).
 * Crée ou récupère le client et l'associe à la soumission dès que les infos personnelles sont fournies
 * (email, firstName, lastName), comme dans l'ancienne version avec create-client-and-submission.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const getFunnelStatus = (step: number): string => {
  if (step >= 4) return "personal_info_completed";
  if (step >= 3) return "delivery_method_selected";
  if (step >= 2) return "documents_uploaded";
  if (step >= 1) return "services_selected";
  return "started";
};

type EnsureClientResult = {
  clientId: string | null;
  autoLoginAccessToken: string | null;
  autoLoginRefreshToken: string | null;
};

/**
 * Crée ou récupère le client et retourne le client id.
 * Si createAccount=true et l'utilisateur n'est pas connecté, crée l'auth user
 * et génère un token magic link pour auto-login côté client.
 */
async function ensureClient(
  admin: ReturnType<typeof createAdminClient>,
  formData: Record<string, unknown>,
  createAccount: boolean
): Promise<EnsureClientResult> {
  const empty: EnsureClientResult = { clientId: null, autoLoginAccessToken: null, autoLoginRefreshToken: null };
  const email = (formData?.email as string)?.trim();
  const firstName = (formData?.firstName as string)?.trim();
  const lastName = (formData?.lastName as string)?.trim();
  if (!email || !firstName || !lastName) return empty;

  const normalizedEmail = email.toLowerCase();
  const phone = (formData?.phone as string) ?? "";
  const address = (formData?.address as string) ?? "";
  const city = (formData?.city as string) ?? "";
  const postalCode = (formData?.postalCode as string) ?? "";
  const country = (formData?.country as string) ?? "";

  let userId: string | null = null;
  let alreadyLoggedIn = false;
  try {
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (user) {
      userId = user.id;
      alreadyLoggedIn = true;
    }
  } catch {
    /* ignore */
  }

  let autoLoginAccessToken: string | null = null;
  let autoLoginRefreshToken: string | null = null;

  if (createAccount && !alreadyLoggedIn) {
    // Tenter de créer l'auth user — ne fait l'auto-login QUE si le user est nouveau
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    const isNewUser = !createError && !!createData?.user;

    if (isNewUser) {
      userId = createData.user.id;

      // Auto-login uniquement pour un NOUVEAU compte (première inscription)
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
        });

        const rawOtp = linkData?.properties?.email_otp;
        if (rawOtp) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({
              type: "magiclink",
              token: rawOtp,
              email: normalizedEmail,
            }),
          });

          if (verifyRes.ok) {
            const session = await verifyRes.json();
            autoLoginAccessToken = session.access_token ?? null;
            autoLoginRefreshToken = session.refresh_token ?? null;
          }
        }
      } catch {
        /* auto-login best effort */
      }
    } else {
      // User existant — récupérer son ID via generateLink (pas d'auto-login)
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
        });
        if (linkData?.user) {
          userId = linkData.user.id;
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 1. Chercher un client existant par email
  const { data: existingClient } = await admin
    .from("client")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingClient) {
    await admin
      .from("client")
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        country: country || null,
        ...(userId && { user_id: userId }),
      })
      .eq("id", existingClient.id);
    return { clientId: existingClient.id, autoLoginAccessToken, autoLoginRefreshToken };
  }

  // 2. Créer un nouveau client
  const { data: newClient, error } = await admin
    .from("client")
    .insert([
      {
        user_id: userId,
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        country: country || null,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("[save-submission] Client creation error:", error);
    return { clientId: null, autoLoginAccessToken, autoLoginRefreshToken };
  }
  const clientId = (newClient as { id: string })?.id ?? null;
  return { clientId, autoLoginAccessToken, autoLoginRefreshToken };
}

/** Relie les soumissions orphelines (même email) au client. */
async function relinkOrphanedSubmissions(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  email: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const { error } = await admin
    .from("submission")
    .update({ client_id: clientId })
    .ilike("email", normalizedEmail);
  if (error) {
    console.warn("[save-submission] Relink submissions error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, currentStep, completedSteps, totalAmount, sessionId, createAccount } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const funnelStatus = getFunnelStatus(currentStep ?? 1);
    const email = formData?.email?.trim() || null;

    // Créer le client + auth user uniquement au clic sur Continuer (createAccount=true)
    // Pendant l'auto-save, on ne crée PAS de client (sinon checkEmailExists bloquerait le formulaire)
    let clientId: string | null = null;
    let autoLoginAccessToken: string | null = null;
    let autoLoginRefreshToken: string | null = null;

    if (createAccount) {
      const result = await ensureClient(supabase, formData ?? {}, true);
      clientId = result.clientId;
      autoLoginAccessToken = result.autoLoginAccessToken;
      autoLoginRefreshToken = result.autoLoginRefreshToken;

      if (clientId && email) {
        await relinkOrphanedSubmissions(supabase, clientId, email);
      }
    }

    // 1. Chercher par session_id (priorité)
    const { data: bySession } = await supabase
      .from("submission")
      .select("id, client_id, data, funnel_status")
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(20);

    let existingSubmission = (bySession ?? []).find(
      (s: { data?: { session_id?: string } }) => s.data?.session_id === sessionId
    );

    // 2. Si non trouvé par session_id, chercher par email (évite les doublons cross-device)
    if (!existingSubmission && email) {
      const { data: allByEmail } = await supabase
        .from("submission")
        .select("id, client_id, data, funnel_status")
        .eq("status", "pending_payment")
        .eq("email", email)
        .order("created_at", { ascending: false });

      if (allByEmail && allByEmail.length > 0) {
        // Garder la plus récente, abandonner les autres
        existingSubmission = allByEmail[0];
        if (allByEmail.length > 1) {
          const extraIds = allByEmail.slice(1).map((s: { id: string }) => s.id);
          await supabase.from("submission").update({ status: "abandoned" }).in("id", extraIds);
        }
        // Mettre à jour le session_id pour lier cette session à la soumission existante
        await supabase
          .from("submission")
          .update({ data: { ...(existingSubmission.data ?? {}), session_id: sessionId } })
          .eq("id", existingSubmission.id);
      }
    }

    // Pendant l'auto-save (createAccount=false), conserver le client_id existant
    if (!clientId && existingSubmission) {
      clientId = (existingSubmission as { client_id: string | null }).client_id ?? null;
    }

    const submissionData = {
      client_id: clientId,
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
        delivery_option: formData?.deliveryOption ?? null,
        delivery_price_eur: formData?.deliveryPriceEUR ?? null,
        delivery_address: formData?.deliveryAddress ?? null,
        delivery_city: formData?.deliveryCity ?? null,
        delivery_postal_code: formData?.deliveryPostalCode ?? null,
        delivery_country: formData?.deliveryCountry ?? null,
        use_personal_address_for_delivery: formData?.usePersonalAddressForDelivery ?? null,
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
      return NextResponse.json({
        id: data?.id,
        ...(autoLoginAccessToken && autoLoginRefreshToken && { autoLoginAccessToken, autoLoginRefreshToken }),
      });
    }

    // Avant d'insérer, s'assurer qu'il n'existe pas d'autre pending pour cet email
    // (cas : user qui recommence sur un autre device sans passer par le popup)
    if (email) {
      const { data: extras } = await supabase
        .from("submission")
        .select("id")
        .eq("email", email)
        .eq("status", "pending_payment");
      if (extras && extras.length > 0) {
        const ids = extras.map((s: { id: string }) => s.id);
        await supabase.from("submission").update({ status: "abandoned" }).in("id", ids);
      }
    }

    const { data, error } = await supabase
      .from("submission")
      .insert(submissionData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({
      id: data?.id,
      ...(autoLoginAccessToken && autoLoginRefreshToken && { autoLoginAccessToken, autoLoginRefreshToken }),
    });
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
