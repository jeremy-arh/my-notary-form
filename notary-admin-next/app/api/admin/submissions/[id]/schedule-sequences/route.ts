import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scheduleSequenceStepsForSubmission } from "@/lib/sequences/schedule-steps";

/**
 * POST /api/admin/submissions/[id]/schedule-sequences
 * Planifie manuellement les étapes Inngest pour une soumission.
 * Utile pour tester sans webhook ou rattraper une soumission.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { id: submissionId } = await params;
    if (!submissionId) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: sub, error } = await supabase
      .from("submission")
      .select("id, created_at, status")
      .eq("id", submissionId)
      .single();

    if (error || !sub) {
      return NextResponse.json({ error: "Soumission introuvable" }, { status: 404 });
    }

    const { scheduled } = await scheduleSequenceStepsForSubmission(
      sub.id,
      new Date(sub.created_at),
      sub.status || "pending_payment"
    );

    return NextResponse.json({
      success: true,
      scheduled,
      message: `${scheduled} étape(s) planifiée(s) dans Inngest`,
    });
  } catch (err) {
    console.error("[schedule-sequences]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
