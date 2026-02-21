/**
 * PATCH: Update authenticated client's profile.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      phone,
      address,
      city,
      postal_code,
      country,
    } = body;

    const admin = createAdminClient();

    const { data: client } = await admin
      .from("client")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof first_name === "string") updates.first_name = first_name.trim();
    if (typeof last_name === "string") updates.last_name = last_name.trim();
    if (typeof phone === "string") updates.phone = phone.trim();
    if (typeof address === "string") updates.address = address.trim();
    if (typeof city === "string") updates.city = city.trim();
    if (typeof postal_code === "string") updates.postal_code = postal_code.trim();
    if (typeof country === "string") updates.country = country.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error } = await admin
      .from("client")
      .update(updates)
      .eq("id", client.id)
      .select("id, first_name, last_name, email, phone, address, city, postal_code, country")
      .single();

    if (error) {
      console.error("[profile] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: updated });
  } catch (err) {
    console.error("[profile]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}
