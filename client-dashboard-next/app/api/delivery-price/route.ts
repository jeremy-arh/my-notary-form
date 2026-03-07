/**
 * Pingen Print & Mail pricing calculator.
 *
 * Uses Pingen's officially published per-piece rates (HT, hors TVA):
 * https://www.pingen.fr/fr/tarifs/
 *
 * Static rates are exact from Pingen's public pricing page.
 * When PINGEN_CLIENT_ID + PINGEN_CLIENT_SECRET are set, the API is called
 * for real-time pricing (organisations/{id}/letters/price-calculator).
 *
 * Pricing structure (< 500 letters/month):
 *   Handling + envelope:   €0.36
 *   Paper per sheet:       €0.05
 *   B&W print per page:    €0.09
 *   Colour print per page: €0.18
 *
 *   Standard postage by country:
 *     France  €0.75 · Germany €0.54 · Switzerland €0.78
 *     UK      €1.02 · Netherlands €0.83 · Austria €0.93
 *     Belgium €0.83 · Luxembourg €1.01 · India €0.18
 *     Others  €1.06
 *
 *   Registered mail (recommandé / express):
 *     France     €6.50  · Switzerland €7.05 · Belgium €9.96
 *     Others → standard postage + DHL Express surcharge (estimated)
 */

import { NextRequest, NextResponse } from "next/server";

// ── Pingen published rates (EUR, HT) ─────────────────────────────────────────
const HANDLING = 0.36;      // traitement + enveloppe (< 500/month)
const PAPER_PER_SHEET = 0.05;
const PRINT_BW_PER_PAGE = 0.09;
const PRINT_COLOR_PER_PAGE = 0.18;

// Standard postage by ISO 3166-1 alpha-2 destination country
const STANDARD_POSTAGE: Record<string, number> = {
  FR: 0.75,
  DE: 0.54,
  CH: 0.78,
  GB: 1.02,
  NL: 0.83,
  AT: 0.93,
  BE: 0.83,
  LU: 1.01,
  IN: 0.18,
};
const STANDARD_POSTAGE_OTHER = 1.06;

// Registered mail (recommandé) postage – replaces standard postage when express
const REGISTERED_POSTAGE: Record<string, number> = {
  FR: 6.50,
  CH: 7.05,
  BE: 9.96,
};
// Estimated DHL Express surcharge for countries without listed recommandé price
const DHL_EXPRESS_SURCHARGE = 10.00;

// Marge commerciale ajoutée à chaque prix de base
const MARGIN_EUR = 20;

// Carrier by country (standard delivery)
const CARRIER_STANDARD: Record<string, string> = {
  FR: "laposte",
  DE: "deutschepost",
  CH: "postch",
  GB: "royalmail",
  NL: "postnl",
  AT: "austrianpost",
  BE: "bpost",
  LU: "bpost",
  IN: "indiapost",
};
const CARRIER_EXPRESS: Record<string, string> = {
  FR: "laposte",
  CH: "postch",
  BE: "bpost",
};

// Estimated delivery days by country (standard)
const DAYS_STANDARD: Record<string, string> = {
  FR: "2-4", DE: "2-4", CH: "3-5", GB: "4-7",
  NL: "2-4", AT: "3-5", BE: "3-5", LU: "3-5",
  IN: "10-15",
};
const DAYS_STANDARD_OTHER = "7-14";

const DAYS_EXPRESS: Record<string, string> = {
  FR: "2-4", CH: "3-5", BE: "3-5",
};
const DAYS_EXPRESS_OTHER = "3-5";

// ── Country normalisation ─────────────────────────────────────────────────────
const COUNTRY_ALIASES: Record<string, string> = {
  "FRANCE": "FR", "FRENCH": "FR",
  "GERMANY": "DE", "ALLEMAGNE": "DE", "DEUTSCHLAND": "DE",
  "SWITZERLAND": "CH", "SUISSE": "CH", "SCHWEIZ": "CH",
  "UNITED KINGDOM": "GB", "UK": "GB", "GREAT BRITAIN": "GB", "ROYAUME-UNI": "GB", "ENGLAND": "GB",
  "NETHERLANDS": "NL", "PAYS-BAS": "NL", "NEDERLAND": "NL", "HOLLAND": "NL",
  "AUSTRIA": "AT", "AUTRICHE": "AT", "ÖSTERREICH": "AT",
  "BELGIUM": "BE", "BELGIQUE": "BE", "BELGIEN": "BE",
  "LUXEMBOURG": "LU",
  "INDIA": "IN", "INDE": "IN",
  "SPAIN": "ES", "ESPAGNE": "ES", "ESPAÑA": "ES",
  "ITALY": "IT", "ITALIE": "IT", "ITALIA": "IT",
  "PORTUGAL": "PT",
  "SWEDEN": "SE", "SUÈDE": "SE", "SVERIGE": "SE",
  "DENMARK": "DK", "DANEMARK": "DK", "DANMARK": "DK",
  "FINLAND": "FI", "FINLANDE": "FI",
  "NORWAY": "NO", "NORVÈGE": "NO", "NORGE": "NO",
  "POLAND": "PL", "POLOGNE": "PL", "POLSKA": "PL",
  "CZECH REPUBLIC": "CZ", "TCHÉQUIE": "CZ", "CZECHIA": "CZ",
  "HUNGARY": "HU", "HONGRIE": "HU", "MAGYARORSZÁG": "HU",
  "ROMANIA": "RO", "ROUMANIE": "RO", "ROMÂNIA": "RO",
  "GREECE": "GR", "GRÈCE": "GR", "ΕΛΛΆΔΑ": "GR",
  "CROATIA": "HR", "CROATIE": "HR", "HRVATSKA": "HR",
  "SLOVAKIA": "SK", "SLOVAQUIE": "SK", "SLOVENSKO": "SK",
  "SLOVENIA": "SI", "SLOVÉNIE": "SI", "SLOVENIJA": "SI",
  "BULGARIA": "BG", "BULGARIE": "BG", "БЪЛГАРИЯ": "BG",
  "IRELAND": "IE", "IRLANDE": "IE", "ÉIRE": "IE",
  "UNITED STATES": "US", "USA": "US", "ÉTATS-UNIS": "US", "ETATS-UNIS": "US",
  "CANADA": "CA", "KANADA": "CA",
  "AUSTRALIA": "AU", "AUSTRALIE": "AU",
  "JAPAN": "JP", "JAPON": "JP", "日本": "JP",
  "CHINA": "CN", "CHINE": "CN", "中国": "CN",
  "BRAZIL": "BR", "BRÉSIL": "BR", "BRASIL": "BR",
  "MEXICO": "MX", "MEXIQUE": "MX", "MÉXICO": "MX",
  "SOUTH AFRICA": "ZA", "AFRIQUE DU SUD": "ZA",
  "ARGENTINA": "AR", "ARGENTINE": "AR",
  "COLOMBIA": "CO", "COLOMBIE": "CO",
  "CHILE": "CL", "CHILI": "CL",
  "MOROCCO": "MA", "MAROC": "MA",
  "ALGERIA": "DZ", "ALGÉRIE": "DZ",
  "TUNISIA": "TN", "TUNISIE": "TN",
};

function normalizeCountry(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length === 2) return trimmed;
  return COUNTRY_ALIASES[trimmed] ?? "";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Static Pingen price calculation ──────────────────────────────────────────

function calcStaticPrice(countryCode: string, pages: number, express: boolean, color: boolean) {
  const printPerPage = color ? PRINT_COLOR_PER_PAGE : PRINT_BW_PER_PAGE;
  const baseCost = HANDLING + pages * PAPER_PER_SHEET + pages * printPerPage;

  let postage: number;
  let carrier: string;
  let deliveryDays: string;

  if (express) {
    if (REGISTERED_POSTAGE[countryCode] !== undefined) {
      postage = REGISTERED_POSTAGE[countryCode];
      carrier = CARRIER_EXPRESS[countryCode] ?? "dhl";
      deliveryDays = DAYS_EXPRESS[countryCode] ?? DAYS_EXPRESS_OTHER;
    } else {
      // Use standard postage + DHL Express surcharge
      postage = (STANDARD_POSTAGE[countryCode] ?? STANDARD_POSTAGE_OTHER) + DHL_EXPRESS_SURCHARGE;
      carrier = "dhl";
      deliveryDays = DAYS_EXPRESS_OTHER;
    }
  } else {
    postage = STANDARD_POSTAGE[countryCode] ?? STANDARD_POSTAGE_OTHER;
    carrier = CARRIER_STANDARD[countryCode] ?? "dhl";
    deliveryDays = DAYS_STANDARD[countryCode] ?? DAYS_STANDARD_OTHER;
  }

  return {
    priceEUR: round2(baseCost + postage + MARGIN_EUR),
    deliveryDays,
    carrier,
    breakdown: {
      handling: round2(HANDLING),
      paper: round2(pages * PAPER_PER_SHEET),
      print: round2(pages * printPerPage),
      postage: round2(postage),
    },
  };
}

// ── Pingen API token cache ────────────────────────────────────────────────────
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
    scope: "letter",
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

async function calcPingenApiPrice(
  orgId: string,
  token: string,
  countryCode: string,
  pages: number,
  express: boolean,
  color: boolean
): Promise<{ priceEUR: number; deliveryDays: string; carrier: string } | null> {
  const body = {
    data: {
      type: "letters",
      attributes: {
        address: {
          name: "Recipient",
          address: "1 Example Street",
          city: "Paris",
          zip: "75001",
          country: countryCode || "FR",
        },
        file_pages: pages,
        file_original_name: "document.pdf",
        color: color ? "color" : "grayscale",
        duplex: "duplex",
        delivery_product: express ? "fast" : "cheap",
        print_mode: "simplex",
        print_spectrum: color ? "color" : "grayscale",
      },
    },
  };

  const res = await fetch(
    `https://api.pingen.com/organisations/${orgId}/letters/price-calculator`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();

  // Extract price from Pingen response
  const priceData = data?.data?.attributes;
  if (!priceData) return null;

  const basePrice = round2(
    (priceData.price ?? priceData.total_price ?? priceData.price_chf ?? 0)
  );
  if (!basePrice) return null;
  const priceEUR = round2(basePrice + MARGIN_EUR);

  // Carrier from API or fall back to our static mapping
  const apiCarrier = priceData.carrier ?? priceData.delivery_product;
  const carrier = apiCarrier
    ? String(apiCarrier).toLowerCase()
    : (express
        ? CARRIER_EXPRESS[countryCode] ?? "dhl"
        : CARRIER_STANDARD[countryCode] ?? "dhl");

  const deliveryDays = express
    ? (DAYS_EXPRESS[countryCode] ?? DAYS_EXPRESS_OTHER)
    : (DAYS_STANDARD[countryCode] ?? DAYS_STANDARD_OTHER);

  return { priceEUR, deliveryDays, carrier };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCountry = searchParams.get("country") ?? "";
    const rawPages = parseInt(searchParams.get("pages") ?? "3", 10);
    const pages = Number.isFinite(rawPages) && rawPages > 0 ? Math.min(rawPages, 20) : 3;
    const option = searchParams.get("option") as "standard" | "express" | null;
    const color = searchParams.get("color") === "true";
    const countryCode = normalizeCountry(rawCountry);

    if (option && !["standard", "express"].includes(option)) {
      return NextResponse.json(
        { error: "Invalid option. Use 'standard' or 'express'." },
        { status: 400 }
      );
    }

    // Try to use the real Pingen API if credentials are configured
    let apiResult: { priceEUR: number; deliveryDays: string; carrier: string } | null = null;
    try {
      const token = await getPingenToken();
      if (token) {
        const orgId = await getPingenOrgId(token);
        if (orgId && countryCode) {
          if (option) {
            apiResult = await calcPingenApiPrice(orgId, token, countryCode, pages, option === "express", color);
          } else {
            const [stdApi, expApi] = await Promise.all([
              calcPingenApiPrice(orgId, token, countryCode, pages, false, color),
              calcPingenApiPrice(orgId, token, countryCode, pages, true, color),
            ]);
            if (stdApi && expApi) {
              return NextResponse.json({
                standard: { priceEUR: stdApi.priceEUR, deliveryDays: stdApi.deliveryDays, carrier: stdApi.carrier },
                express: { priceEUR: expApi.priceEUR, deliveryDays: expApi.deliveryDays, carrier: expApi.carrier },
                source: "pingen_api",
              });
            }
          }
        }
      }
    } catch (apiErr) {
      console.warn("[delivery-price] Pingen API error, falling back to static rates:", apiErr);
    }

    // Fall back to static Pingen rates (exact from published pricing page)
    if (option) {
      const result = apiResult ?? calcStaticPrice(countryCode, pages, option === "express", color);
      return NextResponse.json({
        priceEUR: result.priceEUR,
        deliveryDays: result.deliveryDays,
        carrier: result.carrier,
        source: apiResult ? "pingen_api" : "pingen_static",
      });
    }

    const standard = calcStaticPrice(countryCode, pages, false, color);
    const express = calcStaticPrice(countryCode, pages, true, color);
    return NextResponse.json({
      standard: { priceEUR: standard.priceEUR, deliveryDays: standard.deliveryDays, carrier: standard.carrier },
      express: { priceEUR: express.priceEUR, deliveryDays: express.deliveryDays, carrier: express.carrier },
      source: "pingen_static",
    });
  } catch (err) {
    console.error("[delivery-price]", err);
    return NextResponse.json({ error: "Failed to calculate delivery price" }, { status: 500 });
  }
}
