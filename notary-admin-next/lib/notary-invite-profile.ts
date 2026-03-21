/** Champs fiche notaire transmis à l’invitation (tous optionnels sauf l’e-mail côté UI). */

export type NotaryInviteProfileInput = {
  name?: string;
  full_name?: string;
  phone?: string;
  bio?: string;
  license_number?: string;
  specialization?: string;
  is_active?: boolean;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  jurisdiction?: string;
  commission_number?: string;
  commission_valid_until?: string;
};

function trim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

export function buildNotaryRowFromInvite(
  normalizedEmail: string,
  profile: NotaryInviteProfileInput | undefined
): Record<string, unknown> {
  const p = profile || {};
  const internalName = trim(p.name);
  const fullName = trim(p.full_name);
  const fallbackName = normalizedEmail.split("@")[0] || "Notaire";
  const name = internalName || fullName || fallbackName;

  const row: Record<string, unknown> = {
    email: normalizedEmail,
    name,
    is_active: typeof p.is_active === "boolean" ? p.is_active : true,
  };

  if (fullName) row.full_name = fullName;

  const optString = [
    "phone",
    "bio",
    "license_number",
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
  ] as const;

  for (const k of optString) {
    const v = trim(p[k]);
    if (v) row[k] = v;
  }

  const spec = trim(p.specialization);
  if (spec) {
    row.specialization = spec.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const cv = trim(p.commission_valid_until);
  if (cv) row.commission_valid_until = cv;

  return row;
}

/** Nom affiché Auth / métadonnées : nom complet prioritaire. */
export function displayNameFromInvite(
  normalizedEmail: string,
  profile: NotaryInviteProfileInput | undefined
): string {
  const p = profile || {};
  const fullName = trim(p.full_name);
  const internalName = trim(p.name);
  return fullName || internalName || normalizedEmail.split("@")[0] || "Notaire";
}
