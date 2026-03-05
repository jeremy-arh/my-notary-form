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

/** GET ?debug=1 : diagnostic sans auth (vérifie que CRON_SECRET est configuré) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("debug") !== "1") {
    return NextResponse.json({ error: "Méthode non autorisée" }, { status: 405 });
  }
  const hasSecret = !!process.env.CRON_SECRET?.trim();
  return NextResponse.json({
    ok: true,
    cronSecretConfigured: hasSecret,
    hint: hasSecret
      ? "CRON_SECRET est défini. Vérifiez que le header Authorization est exactement: Bearer <votre_secret>"
      : "CRON_SECRET manquant dans les variables d'environnement Vercel.",
  });
}

export async function POST(req: Request) {
  try {
    console.log("[webhook submission-created] Requête reçue");
    const authHeader = req.headers.get("authorization")?.trim();
    const cronSecret = process.env.CRON_SECRET?.trim();
    const expected = cronSecret ? `Bearer ${cronSecret}` : null;
    if (!cronSecret || authHeader !== expected) {
      console.error("[webhook submission-created] 401: auth invalide", {
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader?.length ?? 0,
        hasCronSecret: !!cronSecret,
      });
      return NextResponse.json(
        {
          error: "Non autorisé",
          hint: !cronSecret
            ? "CRON_SECRET non configuré sur Vercel"
            : "Token invalide. Vérifiez que Authorization = Bearer <CRON_SECRET> exact.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch((e) => {
      console.error("[webhook submission-created] Erreur parse JSON:", e);
      return {};
    });
    const record = body.record ?? body;
    const submissionId = record.id;
    const createdAt = record.created_at;
    const status = record.status ?? "pending_payment";

    if (!submissionId || !createdAt) {
      console.error("[webhook submission-created] 400: payload invalide", {
        bodyKeys: Object.keys(body),
        recordKeys: record ? Object.keys(record) : [],
        submissionId,
        createdAt,
      });
      return NextResponse.json({
        success: false,
        error: "Payload invalide (record.id ou record.created_at manquant)",
      });
    }

    console.log("[webhook submission-created] Planification pour", { submissionId, status, createdAt });
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
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[webhook submission-created] Erreur serveur:", {
      message,
      stack,
      err,
    });
    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
