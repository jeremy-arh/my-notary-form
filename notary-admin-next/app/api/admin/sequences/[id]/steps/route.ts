import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sequenceId } = await params;
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const {
      step_order,
      delay_value,
      delay_unit,
      send_window_start,
      send_window_end,
      channel,
      template_key,
      subject,
      message_body,
      html_body,
    } = body;

    if (delay_value === undefined || !delay_unit || !channel || !template_key) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let order = step_order;
    if (!order) {
      const { data: existing } = await supabase
        .from("automation_steps")
        .select("step_order")
        .eq("sequence_id", sequenceId)
        .order("step_order", { ascending: false })
        .limit(1);
      order = existing && existing.length > 0 ? (existing[0].step_order as number) + 1 : 1;
    }

    const { data, error } = await supabase
      .from("automation_steps")
      .insert({
        sequence_id: sequenceId,
        step_order: order,
        delay_value,
        delay_unit,
        send_window_start: send_window_start ?? null,
        send_window_end: send_window_end ?? null,
        channel,
        template_key,
        subject: subject || null,
        message_body: message_body || null,
        html_body: html_body || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ step: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
