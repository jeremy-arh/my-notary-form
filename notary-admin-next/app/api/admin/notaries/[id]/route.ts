import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type NotaryDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  bio: string | null;
  license_number: string | null;
  specialization: string[] | null;
  is_active: boolean;
  user_id: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  jurisdiction: string | null;
  commission_number: string | null;
  commission_valid_until: string | null;
  created_at: string;
  updated_at: string;
  submissions_count: number;
};

const PATCHABLE = new Set([
  "name",
  "email",
  "phone",
  "full_name",
  "bio",
  "license_number",
  "specialization",
  "is_active",
  "address",
  "city",
  "postal_code",
  "country",
  "timezone",
  "iban",
  "bic",
  "bank_name",
  "jurisdiction",
  "commission_number",
  "commission_valid_until",
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: row, error } = await supabase
      .from("notary")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Notaire introuvable" }, { status: 404 });
    }

    const { count } = await supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("assigned_notary_id", id);

    const detail: NotaryDetail = {
      ...row,
      specialization: row.specialization as string[] | null,
      commission_valid_until: row.commission_valid_until ?? null,
      submissions_count: count ?? 0,
    };

    return NextResponse.json({ notary: detail });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const body = await req.json();
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (PATCHABLE.has(k)) {
        payload[k] = v;
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "Aucun champ valide à mettre à jour" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: updated, error } = await supabase
      .from("notary")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[API notaries PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notary: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * Supprime la ligne `notary`, puis le compte Supabase Auth si `user_id` est renseigné.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: row, error: fetchErr } = await admin
      .from("notary")
      .select("id, user_id, email")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Notaire introuvable" }, { status: 404 });
    }

    const authUserId = row.user_id as string | null;

    const { error: delErr } = await admin.from("notary").delete().eq("id", id);
    if (delErr) {
      console.error("[API notaries DELETE] notary", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    if (authUserId) {
      const { error: authDelErr } = await admin.auth.admin.deleteUser(authUserId);
      if (authDelErr) {
        console.error("[API notaries DELETE] auth user", authDelErr);
        return NextResponse.json(
          {
            error: `Notaire supprimé, mais échec suppression du compte Auth : ${authDelErr.message}`,
            partial: true,
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      deleted_auth_user: Boolean(authUserId),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
