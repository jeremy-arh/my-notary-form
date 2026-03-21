import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "submission-documents";

const COUNTRY_ALIASES: Record<string, string> = {
  FRANCE: "FR", FRENCH: "FR",
  GERMANY: "DE", ALLEMAGNE: "DE", DEUTSCHLAND: "DE",
  SWITZERLAND: "CH", SUISSE: "CH", SCHWEIZ: "CH",
  "UNITED KINGDOM": "GB", UK: "GB", "GREAT BRITAIN": "GB", ROYAUMEUNI: "GB", ENGLAND: "GB",
  NETHERLANDS: "NL", "PAYS-BAS": "NL", NEDERLAND: "NL", HOLLAND: "NL",
  AUSTRIA: "AT", AUTRICHE: "AT", ÖSTERREICH: "AT",
  BELGIUM: "BE", BELGIQUE: "BE", BELGIEN: "BE",
  LUXEMBOURG: "LU",
  INDIA: "IN", INDE: "IN",
  SPAIN: "ES", ESPAGNE: "ES", ESPAÑA: "ES",
  ITALY: "IT", ITALIE: "IT", ITALIA: "IT",
  PORTUGAL: "PT",
  SWEDEN: "SE", SUÈDE: "SE", SVERIGE: "SE",
  DENMARK: "DK", DANEMARK: "DK", DANMARK: "DK",
  FINLAND: "FI", FINLANDE: "FI",
  NORWAY: "NO", NORVÈGE: "NO", NORGE: "NO",
  POLAND: "PL", POLOGNE: "PL", POLSKA: "PL",
  "UNITED STATES": "US", USA: "US", "ÉTATS-UNIS": "US", ETATSUNIS: "US",
  CANADA: "CA", KANADA: "CA",
  AUSTRALIA: "AU", AUSTRALIE: "AU",
  JAPAN: "JP", JAPON: "JP",
  CHINA: "CN", CHINE: "CN",
  BRAZIL: "BR", BRÉSIL: "BR", BRASIL: "BR",
  MOROCCO: "MA", MAROC: "MA",
  ALGERIA: "DZ", ALGÉRIE: "DZ",
  TUNISIA: "TN", TUNISIE: "TN",
};

function normalizeCountry(raw: string): string {
  if (!raw || typeof raw !== "string") return "FR";
  const trimmed = raw.trim().toUpperCase().replace(/\s/g, "");
  if (trimmed.length === 2) return trimmed;
  return (COUNTRY_ALIASES[trimmed] ?? trimmed.slice(0, 2)) || "FR";
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getPingenToken(): Promise<string | null> {
  const clientId = process.env.PINGEN_CLIENT_ID;
  const clientSecret = process.env.PINGEN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "letter organisation_read",
  });

  const res = await fetch("https://identity.pingen.com/auth/access-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 43200) * 1000,
  };
  return cachedToken.token;
}

async function getPingenOrgId(token: string): Promise<string | null> {
  const envOrgId = process.env.PINGEN_ORGANISATION_ID;
  if (envOrgId) return envOrgId;

  const res = await fetch("https://api.pingen.com/organisations", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0]?.id ?? null;
}

async function uploadFileToPingen(
  token: string,
  fileBuffer: ArrayBuffer
): Promise<{ fileUrl: string; fileUrlSignature: string } | null> {
  const res = await fetch("https://api.pingen.com/file-upload", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const attrs = json?.data?.attributes ?? json?.attributes;
  const uploadUrl = attrs?.url ?? attrs?.upload_url;
  const signature = attrs?.url_signature ?? attrs?.file_url_signature;

  if (!uploadUrl || !signature) return null;

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: fileBuffer,
  });
  if (!putRes.ok) return null;

  return {
    fileUrl: uploadUrl,
    fileUrlSignature: signature,
  };
}

async function createPingenLetter(
  token: string,
  orgId: string,
  upload: { fileUrl: string; fileUrlSignature: string },
  fileName: string,
  address: { name: string; address: string; city: string; zip: string; country: string },
  express: boolean
): Promise<boolean> {
  const body = {
    data: {
      type: "letters",
      attributes: {
        file_url: upload.fileUrl,
        file_url_signature: upload.fileUrlSignature,
        file_original_name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
        address_position: "left",
        auto_send: true,
        address: {
          name: address.name,
          address: address.address || "—",
          city: address.city || "—",
          zip: address.zip || "—",
          country: address.country || "FR",
        },
        delivery_product: express ? "fast" : "cheap",
        print_mode: "simplex",
        print_spectrum: "grayscale",
      },
    },
  };

  const res = await fetch(`https://api.pingen.com/organisations/${orgId}/letters`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.ok;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id: submissionId } = await params;
    if (!submissionId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const express = !!body?.express;

    const supabase = createAdminClient();

    const { data: sub, error: subError } = await supabase
      .from("submission")
      .select("id, first_name, last_name, address, city, postal_code, country, data")
      .eq("id", submissionId)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
    }

    const rawData = sub.data;
    const data = (typeof rawData === "string"
      ? (() => { try { return JSON.parse(rawData); } catch { return {}; } })()
      : rawData) as {
      delivery_method?: string;
      deliveryMethod?: string;
      use_personal_address_for_delivery?: boolean;
      delivery_address?: string;
      delivery_city?: string;
      delivery_postal_code?: string;
      delivery_country?: string;
    };

    const method = data?.delivery_method ?? data?.deliveryMethod;
    if (method !== "postal" && method !== "physical") {
      return NextResponse.json(
        { error: "Ce dossier n'a pas demandé la livraison par courrier" },
        { status: 400 }
      );
    }

    const usePersonal = data?.use_personal_address_for_delivery ?? true;
    const address = {
      name: [sub.first_name, sub.last_name].filter(Boolean).join(" ") || "Client",
      address: usePersonal
        ? (sub.address as string) || ""
        : (data?.delivery_address as string) || "",
      city: usePersonal
        ? (sub.city as string) || ""
        : (data?.delivery_city as string) || "",
      zip: usePersonal
        ? (sub.postal_code as string) || ""
        : (data?.delivery_postal_code as string) || "",
      country: normalizeCountry(
        (usePersonal ? sub.country : data?.delivery_country) as string
      ),
    };

    const { data: files, error: filesError } = await supabase
      .from("notarized_files")
      .select("id, file_name, file_url, storage_path")
      .eq("submission_id", submissionId)
      .order("uploaded_at", { ascending: false });

    if (filesError || !files?.length) {
      return NextResponse.json(
        { error: "Aucun document notarié à envoyer" },
        { status: 400 }
      );
    }

    const token = await getPingenToken();
    if (!token) {
      return NextResponse.json(
        { error: "Pingen non configuré (PINGEN_CLIENT_ID, PINGEN_CLIENT_SECRET)" },
        { status: 503 }
      );
    }

    const orgId = await getPingenOrgId(token);
    if (!orgId) {
      return NextResponse.json(
        { error: "Organisation Pingen introuvable" },
        { status: 503 }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const f of files) {
      let fileBuffer: ArrayBuffer;
      try {
        if (f.storage_path) {
          const { data: blob, error } = await supabase.storage
            .from(BUCKET)
            .download(f.storage_path);
          if (error || !blob) {
            errors.push(`${f.file_name}: ${error?.message || "Téléchargement impossible"}`);
            continue;
          }
          fileBuffer = await blob.arrayBuffer();
        } else if (f.file_url) {
          const res = await fetch(f.file_url);
          if (!res.ok) {
            errors.push(`${f.file_name}: Impossible de télécharger le fichier`);
            continue;
          }
          fileBuffer = await res.arrayBuffer();
        } else {
          errors.push(`${f.file_name}: Pas de fichier`);
          continue;
        }
      } catch (e) {
        errors.push(`${f.file_name}: ${e instanceof Error ? e.message : "Erreur"}`);
        continue;
      }

      const upload = await uploadFileToPingen(token, fileBuffer);
      if (!upload) {
        errors.push(`${f.file_name}: Échec upload Pingen`);
        continue;
      }

      const ok = await createPingenLetter(
        token,
        orgId,
        upload,
        f.file_name,
        address,
        express
      );
      if (ok) sent++;
      else errors.push(`${f.file_name}: Échec création lettre`);
    }

    if (sent === 0) {
      return NextResponse.json(
        {
          error: errors.length > 0 ? errors.join("; ") : "Aucun document envoyé",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      sent,
      total: files.length,
      message: `${sent} document(s) envoyé(s) par courrier${errors.length > 0 ? `. ${errors.length} erreur(s).` : ""}`,
    });
  } catch (err) {
    console.error("[send-postal]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
