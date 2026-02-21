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
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    let query = supabase
      .from("support_tickets")
      .select(`
        id,
        subject,
        description,
        priority,
        status,
        submission_id,
        client_id,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (priority && priority !== "all") {
      query = query.eq("priority", priority);
    }

    const { data: tickets, error } = await query;

    if (error) {
      const msg = String((error as { message?: string }).message ?? error);
      const code = (error as { code?: string }).code;
      const isTableMissing =
        msg.includes("does not exist") ||
        msg.includes("n'existe pas") ||
        msg.includes("relation") ||
        code === "42P01" ||
        code === "PGRST116";
      if (isTableMissing) {
        return NextResponse.json({ tickets: [] });
      }
      throw error;
    }

    const list = (tickets || []) as {
      id: string;
      subject: string;
      description: string | null;
      priority: string;
      status: string;
      submission_id: string | null;
      client_id: string | null;
      created_at: string;
      updated_at: string;
    }[];

    if (list.length === 0) return NextResponse.json({ tickets: [] });

    const subIds = Array.from(new Set(list.map((t) => t.submission_id).filter(Boolean))) as string[];
    const clientIds = Array.from(new Set(list.map((t) => t.client_id).filter(Boolean))) as string[];

    let subs: { id: string; first_name?: string; last_name?: string; email?: string }[] = [];
    let clients: { id: string; first_name?: string; last_name?: string; email?: string }[] = [];

    if (subIds.length > 0) {
      const { data } = await supabase
        .from("submission")
        .select("id, first_name, last_name, email")
        .in("id", subIds);
      subs = (data || []) as typeof subs;
    }
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from("client")
        .select("id, first_name, last_name, email")
        .in("id", clientIds);
      clients = (data || []) as typeof clients;
    }

    const subMap = new Map(subs.map((s) => [s.id, s]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const enriched = list.map((t) => ({
      ...t,
      submission: t.submission_id ? subMap.get(t.submission_id) || null : null,
      client: t.client_id ? clientMap.get(t.client_id) || null : null,
    }));

    return NextResponse.json({ tickets: enriched });
  } catch (err) {
    console.error("[GET /api/admin/support]", err);
    return NextResponse.json({ tickets: [] });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { subject, description, priority, status, submission_id, client_id } = body as {
      subject: string;
      description?: string;
      priority?: string;
      status?: string;
      submission_id?: string;
      client_id?: string;
    };

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Le sujet est requis" },
        { status: 400 }
      );
    }

    const allowedPriorities = ["low", "medium", "high", "urgent"];
    const allowedStatuses = ["open", "in_progress", "waiting", "resolved", "closed"];
    const prio = priority && allowedPriorities.includes(priority) ? priority : "medium";
    const st = status && allowedStatuses.includes(status) ? status : "open";

    const supabase = createAdminClient();

    const insertData: Record<string, unknown> = {
      subject: subject.trim(),
      description: description?.trim() || null,
      priority: prio,
      status: st,
      created_by_type: "admin",
      created_by_id: user.id,
    };
    if (submission_id) insertData.submission_id = submission_id;
    if (client_id) insertData.client_id = client_id;

    const { data, error } = await supabase
      .from("support_tickets")
      .insert(insertData as Record<string, string | null>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[POST /api/admin/support]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: msg || "Erreur. Vérifiez que les migrations Supabase ont été exécutées (support_tickets)." },
      { status: 500 }
    );
  }
}
