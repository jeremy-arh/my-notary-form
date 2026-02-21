import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ClientItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  crm_status: string | null;
  created_at: string;
}

export async function GET() {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: clientData, error: clientErr } = await supabase
      .from("client")
      .select("id, first_name, last_name, email, phone, country, created_at")
      .order("created_at", { ascending: false });

    if (clientErr) throw clientErr;

    if (clientData && clientData.length > 0) {
      const clients: ClientItem[] = clientData.map((c) => ({
        ...c,
        crm_status: null,
      }));
      return NextResponse.json({ clients });
    }

    const { data: subData, error: subErr } = await supabase
      .from("submission")
      .select("id, first_name, last_name, email, phone, country, created_at, data")
      .order("created_at", { ascending: false });

    if (subErr) throw subErr;

    type SubRow = (typeof subData)[0];
    const getEmail = (s: SubRow): string => {
      let email = (s.email || "").trim();
      if (!email && s.data) {
        const d = typeof s.data === "string" ? (() => { try { return JSON.parse(s.data); } catch { return null; } })() : s.data;
        email = (d?.email || d?.personal_info?.email || "")?.trim() || "";
      }
      return email.toLowerCase();
    };

    const byEmail = new Map<string, SubRow>();
    for (const s of subData || []) {
      const email = getEmail(s);
      if (!email) continue;
      const existing = byEmail.get(email);
      if (!existing || new Date(s.created_at) > new Date(existing.created_at)) {
        byEmail.set(email, s);
      }
    }

    const clients: ClientItem[] = Array.from(byEmail.values()).map((s) => {
      const email = (s.email || "").trim() || (() => {
        if (!s.data) return "";
        const d = typeof s.data === "string" ? (() => { try { return JSON.parse(s.data); } catch { return null; } })() : s.data;
        return (d?.email || d?.personal_info?.email || "")?.trim() || "";
      })();
      return {
      id: s.id,
      first_name: s.first_name || "",
      last_name: s.last_name || "",
      email,
      phone: s.phone ?? null,
      country: s.country ?? null,
      crm_status: null,
      created_at: s.created_at,
    };
    });

    return NextResponse.json({ clients });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de chargement" },
      { status: 500 }
    );
  }
}
