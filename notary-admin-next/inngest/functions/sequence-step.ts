import { inngest } from "../client";
import { sendSequenceStep } from "@/lib/sequences/send-step";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Calcule la prochaine date/heure dans la fenêtre d'envoi.
 * Si on est hors fenêtre, retourne le début de la prochaine fenêtre.
 */
function getNextWindowStart(
  now: Date,
  startHour: number,
  endHour: number
): Date {
  const currentHour = now.getHours();
  if (currentHour >= startHour && currentHour < endHour) {
    return now;
  }
  const next = new Date(now);
  if (currentHour < startHour) {
    next.setHours(startHour, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(startHour, 0, 0, 0);
  }
  return next;
}

export const sequenceStepSend = inngest.createFunction(
  {
    id: "sequence-step-send",
    name: "Envoi étape de séquence (email/SMS)",
    retries: 3,
  },
  { event: "sequence/step.send" },
  async ({ event, step }) => {
    const { submissionId, stepId, sendWindowStart, sendWindowEnd } = event.data as {
      submissionId: string;
      stepId: string;
      sendWindowStart?: number | null;
      sendWindowEnd?: number | null;
    };

    if (!submissionId || !stepId) {
      throw new Error("submissionId et stepId requis");
    }

    // Attendre la fenêtre d'envoi si définie
    if (
      sendWindowStart != null &&
      sendWindowEnd != null &&
      sendWindowStart < sendWindowEnd
    ) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour < sendWindowStart || currentHour >= sendWindowEnd) {
        const nextStart = getNextWindowStart(
          now,
          sendWindowStart,
          sendWindowEnd
        );
        await step.sleep("wait-window", nextStart);
      }
    }

    const supabase = createAdminClient();
    const { data: stepData, error: stepError } = await supabase
      .from("automation_steps")
      .select("id, channel, template_key, subject, html_body, message_body")
      .eq("id", stepId)
      .single();

    if (stepError || !stepData) {
      throw new Error(`Étape ${stepId} introuvable`);
    }

    const result = await sendSequenceStep(submissionId, stepData);

    if (!result.success) {
      throw new Error(result.error || "Échec envoi");
    }

    return { success: true, channel: result.channel };
  }
);
