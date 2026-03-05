import { createAdminClient } from "@/lib/supabase/admin";

const FORM_LINK = process.env.NEXT_PUBLIC_CLIENT_FORM_URL || "https://app.mynotary.io/form";
const SUPPORT_EMAIL = process.env.SENDGRID_FROM_EMAIL || "support@mynotary.io";
const COMPANY_NAME = "MY NOTARY";

function replaceVariables(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(key, value || "");
  }
  return out;
}

export interface SendStepResult {
  success: boolean;
  channel: "email" | "sms";
  error?: string;
}

export async function sendSequenceStep(
  submissionId: string,
  step: {
    id: string;
    channel: "email" | "sms";
    template_key: string;
    subject: string | null;
    html_body: string | null;
    message_body: string | null;
  }
): Promise<SendStepResult> {
  const supabase = createAdminClient();

  const { data: sub, error: subError } = await supabase
    .from("submission")
    .select("id, email, phone, first_name, last_name, status")
    .eq("id", submissionId)
    .single();

  if (subError || !sub) {
    return { success: false, channel: step.channel, error: "Submission introuvable" };
  }

  const contact = step.channel === "email" ? sub.email : sub.phone;
  if (!contact || contact === "") {
    return { success: false, channel: step.channel, error: "Contact manquant" };
  }

  const table = step.channel === "email" ? "email_sent" : "sms_sent";
  const typeField = step.channel === "email" ? "email_type" : "sms_type";

  const { data: alreadySent } = await supabase
    .from(table)
    .select("id")
    .eq("submission_id", submissionId)
    .eq(typeField, step.template_key)
    .maybeSingle();

  if (alreadySent) {
    return { success: true, channel: step.channel };
  }

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
        step.html_body ||
          `<p>Bonjour {{first_name}},</p><p>Votre certification vous attend. <a href="{{form_link}}">Continuer</a></p>`,
        vars
      );

      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
      const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "support@mynotary.io";
      const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "MY NOTARY";

      if (!SENDGRID_API_KEY) {
        return { success: false, channel: "email", error: "SENDGRID_API_KEY non configurée" };
      }

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          from: { email: SENDGRID_FROM_EMAIL, name: SENDGRID_FROM_NAME },
          personalizations: [
            {
              to: [
                {
                  email: sub.email,
                  name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || "Client",
                },
              ],
              subject,
              custom_args: { submission_id: sub.id, email_type: step.template_key },
            },
          ],
          content: [{ type: "text/html", value: htmlBody }],
          tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true },
          },
        }),
      });

      if (!sgRes.ok) {
        const errText = await sgRes.text();
        return { success: false, channel: "email", error: errText };
      }

      const sgMessageId = sgRes.headers.get("x-message-id")?.trim() || null;
      await supabase.from("email_sent").insert({
        email: sub.email,
        recipient_name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || null,
        email_type: step.template_key,
        subject,
        submission_id: sub.id,
        sg_message_id: sgMessageId,
        sent_at: new Date().toISOString(),
      });

      return { success: true, channel: "email" };
    } else {
      const messageBody = replaceVariables(
        step.message_body ||
          `Bonjour {{first_name}}, votre certification vous attend. Continuez ici : {{form_link}}`,
        vars
      );

      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        return { success: false, channel: "sms", error: "Twilio non configuré" };
      }

      const formData = new URLSearchParams();
      formData.append("From", TWILIO_PHONE_NUMBER);
      formData.append("To", sub.phone!);
      formData.append("Body", messageBody);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      if (!twilioRes.ok) {
        const errText = await twilioRes.text();
        return { success: false, channel: "sms", error: errText };
      }

      const twilioData = await twilioRes.json();
      await supabase.from("sms_sent").insert({
        phone_number: sub.phone,
        recipient_name: `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || null,
        sms_type: step.template_key,
        message: messageBody,
        submission_id: sub.id,
        twilio_message_sid: twilioData.sid || null,
        sent_at: new Date().toISOString(),
      });

      return { success: true, channel: "sms" };
    }
  } catch (err) {
    return {
      success: false,
      channel: step.channel,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
