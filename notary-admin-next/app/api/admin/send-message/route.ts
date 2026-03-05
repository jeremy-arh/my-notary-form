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
      const { sendClickSendSms } = await import("@/lib/sms/clicksend");
      const senderId = process.env.CLICKSEND_SENDER_ID || undefined;
      const result = await sendClickSendSms(recipient_phone, sms_body, { from: senderId });

      if (!result.success) {
        console.error("ClickSend error:", result.error);
        return NextResponse.json({ error: `Erreur ClickSend: ${result.error}` }, { status: 500 });
      }

      await supabase.from("sms_sent").insert({
        phone_number: recipient_phone,
        recipient_name: recipient_name || null,
        recipient_type: "client",
        sms_type: "custom_admin",
        message: sms_body,
        submission_id: submission_id || null,
        client_id: client_id || null,
        provider_message_id: result.messageId || null,
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
