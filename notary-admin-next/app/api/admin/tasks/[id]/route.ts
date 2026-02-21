import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: task, error: taskError } = await supabase
      .from("submission_tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const { data: comments } = await supabase
      .from("submission_task_comments")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: true });

    let submission = null;
    if (task.submission_id) {
      const { data: sub } = await supabase
        .from("submission")
        .select("id, first_name, last_name, email, created_at, status, total_price")
        .eq("id", task.submission_id)
        .single();
      submission = sub;
    }

    return NextResponse.json({
      ...task,
      submission,
      comments: comments || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { status, notes, option_name, document_context, submission_id } = body as {
      status?: string;
      notes?: string;
      option_name?: string;
      document_context?: string;
      submission_id?: string | null;
    };

    const allowedStatuses = ["pending", "in_progress", "done", "cancelled"];
    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Statut invalide. Valeurs: pending, in_progress, done, cancelled" },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (option_name !== undefined) updates.option_name = option_name.trim();
    if (document_context !== undefined) updates.document_context = document_context?.trim() || null;
    if (submission_id !== undefined) updates.submission_id = submission_id || null;

    const { data, error } = await supabase
      .from("submission_tasks")
      .update(updates)
      .eq("id", id)
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("submission_tasks")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
