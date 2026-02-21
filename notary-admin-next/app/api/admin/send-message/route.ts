import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { channel, recipient_email, recipient_phone, recipient_name, subject, html_body, sms_body, submission_id, client_id } = body;

    if (!channel || (channel === "email" && (!recipient_email || !subject || !html_body)) || (channel === "sms" && (!recipient_phone || !sms_body))) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (channel === "email") {
      const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
      const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "support@mynotary.io";
      const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "MY NOTARY";

      if (!SENDGRID_API_KEY) {
        return NextResponse.json({ error: "SENDGRID_API_KEY non configurée" }, { status: 500 });
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
              to: [{ email: recipient_email, name: recipient_name || "" }],
              subject,
              custom_args: {
                submission_id: submission_id || "",
                client_id: client_id || "",
                email_type: "custom_admin",
              },
            },
          ],
          content: [{ type: "text/html", value: html_body }],
          tracking_settings: {
            click_tracking: { enable: true, enable_text: false },
            open_tracking: { enable: true },
          },
        }),
      });

      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid error:", sgRes.status, errText);
        return NextResponse.json({ error: `Erreur SendGrid: ${sgRes.status}` }, { status: 500 });
      }

      const sgMessageId = sgRes.headers.get("x-message-id")?.trim() || null;

      await supabase.from("email_sent").insert({
        email: recipient_email,
        recipient_name: recipient_name || null,
        recipient_type: "client",
        email_type: "custom_admin",
        subject,
        submission_id: submission_id || null,
        client_id: client_id || null,
        sg_message_id: sgMessageId,
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    if (channel === "sms") {
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        return NextResponse.json({ error: "Variables Twilio non configurées" }, { status: 500 });
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
      const statusCallback = baseUrl ? `${baseUrl}/api/webhooks/twilio-status` : null;

      const formData = new URLSearchParams();
      formData.append("From", TWILIO_PHONE_NUMBER);
      formData.append("To", recipient_phone);
      formData.append("Body", sms_body);
      if (statusCallback) formData.append("StatusCallback", statusCallback);

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
        console.error("Twilio error:", twilioRes.status, errText);
        return NextResponse.json({ error: `Erreur Twilio: ${twilioRes.status}` }, { status: 500 });
      }

      const twilioData = await twilioRes.json();

      await supabase.from("sms_sent").insert({
        phone_number: recipient_phone,
        recipient_name: recipient_name || null,
        recipient_type: "client",
        sms_type: "custom_admin",
        message: sms_body,
        submission_id: submission_id || null,
        client_id: client_id || null,
        twilio_message_sid: twilioData.sid || null,
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Canal invalide" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
