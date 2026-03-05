import { NextResponse } from "next/server";
import { scheduleSequenceStepsForSubmission } from "@/lib/sequences/schedule-steps";

/**
 * Webhook Supabase : déclenché à chaque INSERT dans la table submission.
 * Planifie les étapes de séquence via Inngest (exécution au bon moment).
 *
 * Configuration Supabase :
 * 1. Database > Webhooks > Create a new hook
 * 2. Table: submission, Events: Insert
 * 3. URL: https://votre-domaine.com/api/webhooks/submission-created
 * 4. HTTP Headers: Authorization = Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  try {
    console.log("[webhook submission-created] Requête reçue");
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.log("[webhook submission-created] 401: auth manquante ou invalide");
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const record = body.record ?? body;
    const submissionId = record.id;
    const createdAt = record.created_at;
    const status = record.status ?? "pending_payment";

    if (!submissionId || !createdAt) {
      console.log("[webhook submission-created] 400: payload invalide", { body });
      return NextResponse.json({
        success: false,
        error: "Payload invalide (record.id ou record.created_at manquant)",
      });
    }

    console.log("[webhook submission-created] Planification pour", submissionId);
    const { scheduled } = await scheduleSequenceStepsForSubmission(
      submissionId,
      new Date(createdAt),
      status
    );

    console.log("[webhook submission-created] OK:", scheduled, "étape(s) planifiée(s)");
    return NextResponse.json({
      success: true,
      scheduled,
    });
  } catch (err) {
    console.error("[webhook submission-created]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
