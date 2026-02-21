import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("automation_sequences")
      .select("*, automation_steps(*)")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const sequences = (data || []).map((seq) => ({
      ...seq,
      steps: ((seq as Record<string, unknown>).automation_steps as Record<string, unknown>[] || []).sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) => (a.step_order as number) - (b.step_order as number)
      ),
    }));
    sequences.forEach((seq) => delete (seq as Record<string, unknown>).automation_steps);

    return NextResponse.json({ sequences });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { name, description, trigger_event, trigger_status, channel } = body;

    if (!name || !trigger_event || !channel) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("automation_sequences")
      .insert({ name, description: description || null, trigger_event, trigger_status: trigger_status || null, channel, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ sequence: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
