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

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    const { data: comments } = await supabase
      .from("support_ticket_comments")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    let submission = null;
    let client = null;
    if (ticket.submission_id) {
      const { data: sub } = await supabase
        .from("submission")
        .select("id, first_name, last_name, email, created_at")
        .eq("id", ticket.submission_id)
        .single();
      submission = sub;
    }
    if (ticket.client_id) {
      const { data: cli } = await supabase
        .from("client")
        .select("id, first_name, last_name, email")
        .eq("id", ticket.client_id)
        .single();
      client = cli;
    }

    return NextResponse.json({
      ...ticket,
      submission,
      client,
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
    const { subject, description, priority, status, submission_id } = body as {
      subject?: string;
      description?: string;
      priority?: string;
      status?: string;
      submission_id?: string | null;
    };

    const allowedPriorities = ["low", "medium", "high", "urgent"];
    const allowedStatuses = ["open", "in_progress", "waiting", "resolved", "closed"];

    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {};
    if (subject !== undefined) updates.subject = subject.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (priority !== undefined && allowedPriorities.includes(priority)) updates.priority = priority;
    if (status !== undefined && allowedStatuses.includes(status)) updates.status = status;
    if (submission_id !== undefined) updates.submission_id = submission_id || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("support_tickets")
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
      .from("support_tickets")
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
