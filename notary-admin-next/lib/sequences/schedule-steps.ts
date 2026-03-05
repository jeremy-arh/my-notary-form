import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/inngest/client";

function delayToMs(delayValue: number, delayUnit: string): number {
  switch (delayUnit) {
    case "minutes":
      return delayValue * 60 * 1000;
    case "hours":
      return delayValue * 60 * 60 * 1000;
    case "days":
      return delayValue * 24 * 60 * 60 * 1000;
    default:
      return delayValue * 60 * 60 * 1000;
  }
}

/**
 * Calcule le timestamp d'envoi en tenant compte de la fenêtre.
 * Si created_at + delay tombe hors fenêtre, on prend le début de la prochaine fenêtre.
 */
function computeSendTs(
  createdAt: Date,
  delayMs: number,
  sendWindowStart: number | null,
  sendWindowEnd: number | null
): number {
  const targetTime = new Date(createdAt.getTime() + delayMs);

  if (sendWindowStart == null || sendWindowEnd == null) {
    return targetTime.getTime();
  }

  const targetHour = targetTime.getHours();
  if (targetHour >= sendWindowStart && targetHour < sendWindowEnd) {
    return targetTime.getTime();
  }

  const next = new Date(targetTime);
  if (targetHour < sendWindowStart) {
    next.setHours(sendWindowStart, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(sendWindowStart, 0, 0, 0);
  }
  return next.getTime();
}

export async function scheduleSequenceStepsForSubmission(
  submissionId: string,
  createdAt: Date,
  triggerStatus: string = "pending_payment"
): Promise<{ scheduled: number }> {
  const supabase = createAdminClient();

  const { data: sequences, error: seqError } = await supabase
    .from("automation_sequences")
    .select("id, trigger_status")
    .eq("is_active", true)
    .eq("trigger_event", "submission_created")
    .or("trigger_status.eq.pending_payment,trigger_status.is.null");

  if (seqError || !sequences?.length) {
    return { scheduled: 0 };
  }

  const events: Array<{
    name: string;
    data: Record<string, unknown>;
    ts?: number;
  }> = [];

  for (const seq of sequences) {
    const status = seq.trigger_status || "pending_payment";
    if (status !== triggerStatus) continue;

    const { data: steps, error: stepsError } = await supabase
      .from("automation_steps")
      .select("id, delay_value, delay_unit, send_window_start, send_window_end")
      .eq("sequence_id", seq.id)
      .eq("is_active", true)
      .order("step_order", { ascending: true });

    if (stepsError || !steps?.length) continue;

    for (const step of steps) {
      const delayMs = delayToMs(step.delay_value, step.delay_unit);
      const ts = computeSendTs(
        createdAt,
        delayMs,
        step.send_window_start,
        step.send_window_end
      );

      events.push({
        name: "sequence/step.send",
        data: {
          submissionId,
          stepId: step.id,
          sendWindowStart: step.send_window_start,
          sendWindowEnd: step.send_window_end,
        },
        ts,
      });
    }
  }

  if (events.length > 0) {
    await inngest.send(
      events.map((e) => ({
        name: e.name,
        data: e.data,
        ts: e.ts,
      }))
    );
  }

  return { scheduled: events.length };
}
