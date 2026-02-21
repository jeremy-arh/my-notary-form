import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { id: sequenceId, stepId } = await params;
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    const fields = [
      "step_order", "delay_value", "delay_unit",
      "send_window_start", "send_window_end",
      "channel", "template_key", "subject", "message_body", "html_body", "is_active",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("automation_steps")
      .update(updates)
      .eq("id", stepId)
      .eq("sequence_id", sequenceId)
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { stepId } = await params;
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("automation_steps")
      .delete()
      .eq("id", stepId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
