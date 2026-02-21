import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { submission_id, option_name, option_id, document_context, notes } = body as {
      submission_id?: string;
      option_name: string;
      option_id?: string;
      document_context?: string;
      notes?: string;
    };

    if (!option_name?.trim()) {
      return NextResponse.json(
        { error: "option_name est requis" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const order_item_ref = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const insertData: Record<string, unknown> = {
      order_item_ref,
      option_id: option_id?.trim() || "MANUAL",
      option_name: option_name.trim(),
      document_context: document_context?.trim() || null,
      notes: notes?.trim() || null,
      status: "pending",
    };
    if (submission_id) insertData.submission_id = submission_id;

    const { data, error } = await supabase
      .from("submission_tasks")
      .insert(insertData as Record<string, string | null>)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("submission_tasks")
      .select(`
        id,
        submission_id,
        order_item_ref,
        option_id,
        option_name,
        document_context,
        status,
        notes,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;

    const list = (tasks || []) as {
      id: string;
      submission_id: string | null;
      order_item_ref: string;
      option_id: string;
      option_name: string;
      document_context: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }[];

    if (list.length === 0) return NextResponse.json({ tasks: [] });

    const subIds = [...new Set(list.map((t) => t.submission_id).filter(Boolean))] as string[];
    const { data: subs } = subIds.length > 0 ? await supabase
      .from("submission")
      .select("id, first_name, last_name, email, created_at, status, total_price")
      .in("id", subIds) : { data: null };

    const subMap = new Map(
      ((subs || []) as { id: string; first_name?: string; last_name?: string; email?: string; created_at?: string; status?: string; total_price?: number }[]).map(
        (s) => [s.id, s]
      )
    );

    const enriched = list.map((t) => ({
      ...t,
      submission: t.submission_id ? subMap.get(t.submission_id) || null : null,
    }));

    return NextResponse.json({ tasks: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
