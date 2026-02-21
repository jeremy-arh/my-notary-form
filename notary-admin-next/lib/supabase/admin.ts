import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec SERVICE_ROLE_KEY pour le back-office admin.
 * Bypass RLS - à utiliser UNIQUEMENT côté serveur (API routes, Server Components).
 * Ne jamais exposer cette clé au client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }

  return createClient(url, serviceRoleKey);
}
