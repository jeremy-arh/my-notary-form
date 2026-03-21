import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { applyNotaryRoleToAuthUser } from "@/lib/notary-auth-metadata";

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<User | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  return data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

/**
 * Pour les comptes déjà créés : force user_metadata.role = notary (et app_metadata) sans renvoyer d’invitation.
 */
export async function POST(
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

    const { data: row, error: nErr } = await admin
      .from("notary")
      .select("id, email, name, full_name, user_id")
      .eq("id", id)
      .maybeSingle();

    if (nErr || !row) {
      return NextResponse.json({ error: "Notaire introuvable" }, { status: 404 });
    }

    const displayName = (row.full_name || row.name || row.email || "Notaire").trim();
    let authUser: User | null = null;

    if (row.user_id) {
      const { data: gu, error: gErr } = await admin.auth.admin.getUserById(row.user_id as string);
      if (!gErr && gu?.user) authUser = gu.user;
    }
    if (!authUser) {
      authUser = await findAuthUserByEmail(admin, row.email as string);
    }

    if (!authUser?.id) {
      return NextResponse.json(
        { error: "Aucun compte Supabase Auth trouvé pour cet e-mail. Envoyez d’abord une invitation." },
        { status: 400 }
      );
    }

    const applied = await applyNotaryRoleToAuthUser(admin, authUser, displayName);
    if (!applied.ok) {
      return NextResponse.json({ error: applied.message }, { status: 500 });
    }

    if (!row.user_id && authUser.id) {
      await admin.from("notary").update({ user_id: authUser.id }).eq("id", id);
    }

    return NextResponse.json({
      success: true,
      message:
        "Rôle « notary » appliqué sur Auth. Le notaire doit se déconnecter et se reconnecter (ou rafraîchir la session).",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
