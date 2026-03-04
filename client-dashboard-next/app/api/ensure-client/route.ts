/**
 * Ensures a client record exists for the authenticated user.
 * Creates one if missing (e.g. user logged in via magic link before any form submission).
 * Also relinks orphaned submissions (same email, null or wrong client_id) to this client.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function relinkOrphanedSubmissions(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  email: string
) {
  const normalizedEmail = email.toLowerCase().trim();
  const { data, error } = await admin
    .from("submission")
    .update({ client_id: clientId })
    .ilike("email", normalizedEmail)
    .select("id");

  if (error) {
    console.warn("[ensure-client] Relink submissions error:", error);
    return;
  }
  if (data?.length) {
    console.log("[ensure-client] Relinked", data.length, "submission(s) to client", clientId);
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. Chercher le client par user_id (déjà lié)
    const { data: existing } = await admin
      .from("client")
      .select("id, first_name, last_name, email, phone, address, city, postal_code, country")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await relinkOrphanedSubmissions(admin, existing.id, existing.email || user.email || "");
      return NextResponse.json({ client: existing });
    }

    const email = user.email || user.user_metadata?.email;
    if (!email) {
      return NextResponse.json(
        { error: "Email required to create client" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Chercher un client existant avec le même email (créé anonymement via le formulaire)
    const { data: existingByEmail } = await admin
      .from("client")
      .select("id, first_name, last_name, email, phone, address, city, postal_code, country")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingByEmail) {
      // Lier l'auth user à ce client existant (qui a déjà phone, address, etc.)
      const { data: linked, error: linkError } = await admin
        .from("client")
        .update({ user_id: user.id })
        .eq("id", existingByEmail.id)
        .select("id, first_name, last_name, email, phone, address, city, postal_code, country")
        .single();

      if (linkError) {
        console.error("[ensure-client] Link error:", linkError);
      } else {
        await relinkOrphanedSubmissions(admin, linked.id, linked.email || normalizedEmail);
        return NextResponse.json({ client: linked });
      }
    }

    // 3. Aucun client trouvé → créer un nouveau
    const { data: newClient, error } = await admin
      .from("client")
      .insert([
        {
          user_id: user.id,
          email: normalizedEmail,
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
        },
      ])
      .select("id, first_name, last_name, email, phone, address, city, postal_code, country")
      .single();

    if (error) {
      console.error("[ensure-client] Insert error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    await relinkOrphanedSubmissions(admin, newClient.id, newClient.email || normalizedEmail);

    return NextResponse.json({ client: newClient });
  } catch (err) {
    console.error("[ensure-client]", err);
    return NextResponse.json(
      { error: "Failed to ensure client" },
      { status: 500 }
    );
  }
}
