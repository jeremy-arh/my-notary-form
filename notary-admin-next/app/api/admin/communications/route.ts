import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const supabase = createAdminClient();

    const [emailsRes, smsRes] = await Promise.allSettled([
      supabase
        .from("email_sent")
        .select("id, email, recipient_name, email_type, subject, sent_at, delivered_at, opened_at, clicked_at, clicked_url, bounced_at, dropped_at, spam_reported_at, unsubscribed_at, submission_id, client_id")
        .order("sent_at", { ascending: false })
        .limit(500),
      supabase
        .from("sms_sent")
        .select("id, phone_number, recipient_name, sms_type, message, sent_at, delivered_at, failed_at, submission_id, client_id")
        .order("sent_at", { ascending: false })
        .limit(500),
    ]);

    const emails = emailsRes.status === "fulfilled" ? (emailsRes.value.data || []) : [];
    const sms = smsRes.status === "fulfilled" ? (smsRes.value.data || []) : [];

    const emailStats = {
      total: emails.length,
      delivered: emails.filter((e: Record<string, unknown>) => e.delivered_at).length,
      opened: emails.filter((e: Record<string, unknown>) => e.opened_at).length,
      clicked: emails.filter((e: Record<string, unknown>) => e.clicked_at).length,
      bounced: emails.filter((e: Record<string, unknown>) => e.bounced_at).length,
      dropped: emails.filter((e: Record<string, unknown>) => e.dropped_at).length,
      spam: emails.filter((e: Record<string, unknown>) => e.spam_reported_at).length,
    };

    const smsStats = {
      total: sms.length,
      delivered: sms.filter((s: Record<string, unknown>) => s.delivered_at).length,
      failed: sms.filter((s: Record<string, unknown>) => s.failed_at).length,
    };

    return NextResponse.json({ emails, sms, emailStats, smsStats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur" },
      { status: 500 }
    );
  }
}
