import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const NOTARY_USER_META = {
  role: "notary" as const,
  app: "notary" as const,
};

function mergeRecord(a: unknown): Record<string, unknown> {
  return a && typeof a === "object" && !Array.isArray(a) ? { ...(a as Record<string, unknown>) } : {};
}

/**
 * Force `user_metadata.role` + `app_metadata.role` pour le portail notaire (JWT / raw_user_meta_data).
 */
export async function applyNotaryRoleToAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  user: User,
  displayName: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const um = mergeRecord(user.user_metadata);
  const am = mergeRecord(user.app_metadata);
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...um,
      ...NOTARY_USER_META,
      display_name: displayName,
    },
    app_metadata: {
      ...am,
      role: "notary",
    },
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
