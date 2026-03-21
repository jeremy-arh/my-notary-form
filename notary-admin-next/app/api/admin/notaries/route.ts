import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type NotaryListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  is_active: boolean;
  user_id: string | null;
  city: string | null;
  country: string | null;
  jurisdiction: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("notary")
      .select(
        "id, name, email, phone, full_name, is_active, user_id, city, country, jurisdiction, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[API notaries GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notaries: (data || []) as NotaryListItem[] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
