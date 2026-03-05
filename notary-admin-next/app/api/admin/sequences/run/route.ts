import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const FORM_LINK = process.env.NEXT_PUBLIC_CLIENT_FORM_URL || "https://app.mynotary.io/form";
const SUPPORT_EMAIL = process.env.SENDGRID_FROM_EMAIL || "support@mynotary.io";
const COMPANY_NAME = "MY NOTARY";

function replaceVariables(
  text: string,
  vars: Record<string, string>
): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(key, value || "");
  }
  return out;
}

function delayToHours(delayValue: number, delayUnit: string): number {
  switch (delayUnit) {
    case "minutes":
      return delayValue / 60;
    case "hours":
      return delayValue;
    case "days":
      return delayValue * 24;
    default:
      return delayValue;
  }
}

async function runSequences(req: Request) {
  try {
    // Auth: admin user ou CRON_SECRET (Vercel envoie auto le Bearer)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const supabaseAuth = await createClient();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
    }

    const supabase = createAdminClient();
    const now = new Date();
    const currentHour = now.getHours();

    const results = { processed: 0, emailsSent: 0, smsSent: 0, errors: [] as string[] };

    const { data: sequences, error: seqError } = await supabase
      .from("automation_sequences")
      .select("id, name, trigger_event, trigger_status, is_active")
      .eq("is_active", true)
      .eq("trigger_event", "submission_created")
      .or("trigger_status.eq.pending_payment,trigger_status.is.null");

    if (seqError || !sequences?.length) {
      return NextResponse.json({ success: true, results, message: "Aucune séquence active" });
    }

    for (const seq of sequences) {
      const triggerStatus = seq.trigger_status || "pending_payment";

      const { data: steps, error: stepsError } = await supabase
        .from("automation_steps")
        .select("*")
        .eq("sequence_id", seq.id)
        .eq("is_active", true)
        .order("step_order", { ascending: true });

      if (stepsError || !steps?.length) continue;

      for (const step of steps) {
        const delayHours = delayToHours(step.delay_value, step.delay_unit);
        const thresholdTime = new Date(now.getTime() - delayHours * 60 * 60 * 1000);

        if (step.send_window_start != null && step.send_window_end != null) {
          if (currentHour < step.send_window_start || currentHour >= step.send_window_end) {
            continue;
          }
        }

        const contactField = step.channel === "email" ? "email" : "phone";
        const { data: submissions, error: subError } = await supabase
          .from("submission")
          .select("id, email, phone, first_name, last_name, created_at, status")
          .eq("status", triggerStatus)
          .not(contactField, "is", null)
          .neq(contactField, "")
          .lt("created_at", thresholdTime.toISOString())
          .order("created_at", { ascending: true });

        if (subError || !submissions?.length) continue;

        const table = step.channel === "email" ? "email_sent" : "sms_sent";
        const typeField = step.channel === "email" ? "email_type" : "sms_type";
        const stepType = step.template_key;

        for (const sub of submissions) {
          const { data: alreadySent } = await supabase
            .from(table)
            .select("id")
            .eq("submission_id", sub.id)
            .eq(typeField, stepType)
            .maybeSingle();

          if (alreadySent) continue;
          if (sub.status !== triggerStatus) continue;

          const vars: Record<string, string> = {
            "{{first_name}}": sub.first_name || "",
            "{{last_name}}": sub.last_name || "",
            "{{email}}": sub.email || "",
            "{{form_link}}": FORM_LINK,
            "{{support_email}}": SUPPORT_EMAIL,
            "{{company_name}}": COMPANY_NAME,
          };

          try {
            if (step.channel === "email") {
              const subject = replaceVariables(step.subject || "Votre certification vous attend", vars);
              const htmlBody = replaceVariables(
                step.html_body || `<p>Bonjour {{first_name}},</p><p>Votre certification vous attend. <a href="{{form_link}}">Continuer</a></p>`,
                vars
              );

              const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
              const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "support@mynotary.io";
              const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "MY NOTARY";

              if (!SENDGRID_API_KEY) {
                results.errors.push("SENDGRID_API_KEY non configurée");
                continue;
              }

              const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${SENDGRID_API_KEY}`,
                },
                body: JSON.stringify({
                  from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
                  personalizations: [{
                    to: [{ email: sub.email, name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || "Client" }],
                    subject,
                    custom_args: { submission_id: sub.id, email_type: stepType },
                  }],
                  content: [{ type: "text/html", value: htmlBody }],
                  tracking_settings: { click_tracking: { enable: true }, open_tracking: { enable: true } },
                }),
              });

              if (!sgRes.ok) {
                const errText = await sgRes.text();
                results.errors.push(`Email ${sub.id}: ${errText}`);
                continue;
              }

              const sgMessageId = sgRes.headers.get("x-message-id")?.trim() || null;
              await supabase.from("email_sent").insert({
                email: sub.email,
                recipient_name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || null,
                email_type: stepType,
                subject,
                submission_id: sub.id,
                sg_message_id: sgMessageId,
                sent_at: new Date().toISOString(),
              });

              results.emailsSent++;
            } else {
              const messageBody = replaceVariables(
                step.message_body || `Bonjour {{first_name}}, votre certification vous attend. Continuez ici : {{form_link}}`,
                vars
              );

              const { sendClickSendSms } = await import("@/lib/sms/clicksend");
              const senderId = process.env.CLICKSEND_SENDER_ID || undefined;
              const result = await sendClickSendSms(sub.phone!, messageBody, { from: senderId });

              if (!result.success) {
                results.errors.push(`SMS ${sub.id}: ${result.error}`);
                continue;
              }

              await supabase.from("sms_sent").insert({
                phone_number: sub.phone,
                recipient_name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || null,
                sms_type: stepType,
                message: messageBody,
                submission_id: sub.id,
                provider_message_id: result.messageId || null,
                sent_at: new Date().toISOString(),
              });

              results.smsSent++;
            }
            results.processed++;
          } catch (err) {
            results.errors.push(`${sub.id}: ${err instanceof Error ? err.message : "Erreur"}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `${results.emailsSent} email(s) et ${results.smsSent} SMS envoyé(s)`,
    });
  } catch (err) {
    console.error("[run-sequences]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return runSequences(req);
}

export async function POST(req: Request) {
  return runSequences(req);
}
