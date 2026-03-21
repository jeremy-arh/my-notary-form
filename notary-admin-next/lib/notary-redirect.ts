/**
 * Portail notaire après clic sur invitation / magic link (Supabase `redirect_to`).
 *
 * Définir NOTARY_APP_REDIRECT_URL sur le déploiement du back-office (ex. Vercel) pour éviter toute ambiguïté.
 * Sinon : dev → localhost:3010, prod → https://notary.mynotary.io
 */

const DEFAULT_DEV = "http://localhost:3010";
const DEFAULT_PROD = "https://notary.mynotary.io";

/**
 * URLs à ajouter dans Supabase → Authentication → URL Configuration → Redirect URLs
 * (ajoutez les deux formes avec / sans wildcard selon ce que propose votre projet).
 */
export const SUPABASE_NOTARY_REDIRECT_URLS_TO_ALLOW = [
  "http://localhost:3010",
  "http://localhost:3010/**",
  "https://notary.mynotary.io",
  "https://notary.mynotary.io/**",
] as const;

function normalizeRedirectUrl(url: string): string {
  const u = url.trim();
  if (!u) return DEFAULT_PROD;
  return u.replace(/\/+$/, "");
}

export function getNotaryAppRedirectUrl(): string {
  const explicit = process.env.NOTARY_APP_REDIRECT_URL?.trim();
  if (explicit) {
    return normalizeRedirectUrl(explicit);
  }
  if (process.env.NODE_ENV === "development") {
    return DEFAULT_DEV;
  }
  return DEFAULT_PROD;
}
