import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    let query = supabase
      .from("submission")
      .select("id, first_name, last_name, email, created_at, status, total_price")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`
      );
    }

    const { data: submissions, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      submissions: (submissions || []).map((s) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        created_at: s.created_at,
        status: s.status,
        total_price: s.total_price,
        label:
          [s.first_name, s.last_name].filter(Boolean).join(" ") ||
          s.email ||
          `#${(s.id as string).slice(0, 8)}`,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
