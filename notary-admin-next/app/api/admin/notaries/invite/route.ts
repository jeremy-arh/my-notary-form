import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getNotaryAppRedirectUrl } from "@/lib/notary-redirect";
import {
  NOTARY_USER_META,
  applyNotaryRoleToAuthUser,
} from "@/lib/notary-auth-metadata";
import {
  buildNotaryRowFromInvite,
  displayNameFromInvite,
  type NotaryInviteProfileInput,
} from "@/lib/notary-invite-profile";

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<User | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("[invite] listUsers", error);
    return null;
  }
  const u = data.users.find((x) => x.email?.toLowerCase() === email);
  return u ?? null;
}

function isUserAlreadyExists(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const m = (err.message || "").toLowerCase();
  const c = err.code || "";
  return (
    c === "email_exists" ||
    c === "user_already_exists" ||
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already exists")
  );
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const profile = (body.profile ?? null) as NotaryInviteProfileInput | null;

    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json({ error: "Adresse e-mail invalide" }, { status: 400 });
    }

    const normalizedEmail = emailRaw.toLowerCase();
    const displayName = displayNameFromInvite(normalizedEmail, profile ?? undefined);

    const redirectTo = getNotaryAppRedirectUrl();
    const admin = createAdminClient();

    const metaPayload = {
      ...NOTARY_USER_META,
      display_name: displayName,
    };

    const notaryRow = buildNotaryRowFromInvite(normalizedEmail, profile ?? undefined);

    const { data: existingNotary } = await admin
      .from("notary")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingNotary) {
      const patch = { ...notaryRow };
      delete patch.email;
      const { error: upErr } = await admin
        .from("notary")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNotary.id);
      if (upErr) {
        console.error("[invite] update notary", upErr);
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await admin.from("notary").insert(notaryRow);
      if (insertErr) {
        console.error("[invite] insert notary", insertErr);
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo,
        data: metaPayload,
      }
    );

    if (inviteErr) {
      if (isUserAlreadyExists(inviteErr)) {
        return NextResponse.json(
          {
            error:
              "Cette adresse e-mail a déjà un compte Supabase Auth. L’invitation ne s’applique qu’aux nouveaux comptes. Utilisez « Appliquer le rôle sur Auth » sur la fiche notaire, ou supprimez le compte dans Authentication.",
          },
          { status: 409 }
        );
      }
      console.error("[invite] inviteUserByEmail", inviteErr);
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    let authUser: User | null = inviteData?.user ?? null;
    if (!authUser?.id) {
      authUser = await findAuthUserByEmail(admin, normalizedEmail);
    } else {
      const { data: fresh, error: gErr } = await admin.auth.admin.getUserById(authUser.id);
      if (!gErr && fresh?.user) authUser = fresh.user;
    }

    if (authUser?.id) {
      const applied = await applyNotaryRoleToAuthUser(admin, authUser, displayName);
      if (!applied.ok) {
        return NextResponse.json(
          {
            success: true,
            warning: `Invitation envoyée, mais la mise à jour du rôle a échoué : ${applied.message}. Utilisez « Appliquer le rôle sur Auth » sur la fiche ou corrigez dans Supabase.`,
            redirect_to_used: redirectTo,
          },
          { status: 200 }
        );
      }
    } else {
      console.warn("[invite] Utilisateur Auth introuvable après invite pour forcer le rôle.");
    }

    return NextResponse.json({
      success: true,
      message:
        "Invitation envoyée. Le rôle notaire est enregistré sur Auth (déconnexion / reconnexion sur le portail notaire si la session était ancienne).",
      redirect_to_used: redirectTo,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
